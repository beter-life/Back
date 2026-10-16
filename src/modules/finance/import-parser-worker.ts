import { parentPort,workerData } from 'node:worker_threads';
import { parse } from 'csv-parse/sync';
import { XMLParser,XMLValidator } from 'fast-xml-parser';
import type { ParsedImport } from './import-parser.js';
import type { ImportFormat,ImportIssue } from './import-contracts.js';
const {bytes,format,encoding,delimiter,limits}=workerData as {bytes:Uint8Array;format:ImportFormat;encoding:'UTF8'|'WINDOWS1252';delimiter:string;limits:{rows:number;columns:number;record:number;pages:number;text:number}};
const result:ParsedImport={headers:[],rows:[],issues:[],accountHint:null};
function fail(issue:ImportIssue):never{throw Object.assign(new Error('Import parsing failed'),{issue});}
globalThis.fetch=()=>Promise.reject(new Error('Document network access is disabled'));
function decode(mode='utf-8'){try{return new TextDecoder(mode,{fatal:true}).decode(bytes).replace(/^\ufeff/,'');}catch{return fail('ENCODING_INVALID');}}
function csv(){
  const text=decode(encoding==='WINDOWS1252'?'windows-1252':'utf-8');if(!text.trim())fail('EMPTY_FILE');
  if(/^\s*(?:%PDF-|<\?xml|<OFX|<!DOCTYPE|<html)/i.test(text)||text.trimStart().startsWith('PK'+String.fromCharCode(3)))fail('INVALID_FILE');
  const candidates:string[][][]=[];
  for(const d of delimiter==='AUTO'?[',',';']:[delimiter]){
    try{const rows=parse(text,{delimiter:d,bom:true,skip_empty_lines:true,relax_column_count:false,max_record_size:limits.record,to:limits.rows+2}) as string[][];
      if(rows.length>limits.rows+1)fail('LIMIT_EXCEEDED');
      if(rows[0]&&rows[0].length>=3&&rows[0].length<=limits.columns)candidates.push(rows);
    }catch(error){if((error as {issue?:string}).issue==='LIMIT_EXCEEDED')throw error;}
  }
  if(candidates.length>1)fail('DELIMITER_AMBIGUOUS');if(candidates.length!==1)fail('INVALID_FILE');
  result.headers=candidates[0]![0]!.map(c=>c.trim());result.rows=candidates[0]!.slice(1);if(!result.rows.length)fail('EMPTY_FILE');
}
const record=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const scalar=(v:unknown)=>typeof v==='string'?v.trim():'';
function entity(value:string){return value.replace(/&(#x[0-9a-f]{1,6}|#[0-9]{1,7}|amp|lt|gt|quot|apos);/gi,(_,v:string)=>{const named:Record<string,string>={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"};if(named[v])return named[v]!;const code=v[1]?.toLowerCase()==='x'?parseInt(v.slice(2),16):parseInt(v.slice(1),10);if(!code||code>0x10ffff||(code>=0xd800&&code<=0xdfff))return fail('INVALID_FILE');return String.fromCodePoint(code);});}
function ofxDate(raw:string){const m=/^(\d{4})(\d{2})(\d{2})(?:(\d{2})(\d{2})(\d{2})(?:\.\d{1,3})?)?(?:\[([+-]?\d{1,2}(?:\.(?:5|25|75))?)(?::[A-Za-z0-9_+-]{1,10})?\])?$/.exec(raw);if(!m)return raw;
  const date=`${m[1]}-${m[2]}-${m[3]}`;if(!m[4])return date;
  const base=Date.parse(`${date}T${m[4]}:${m[5]}:${m[6]}Z`),offset=Number(m[7]??'0');
  if(!Number.isFinite(base)||Math.abs(offset)>14||Number(m[4])>23||Number(m[5])>59||Number(m[6])>59)return raw;
  if(new Date(base).toISOString().slice(0,10)!==date)return raw;
  return new Date(base-offset*3600000).toISOString();
}
function ofx(){
  const prefix=Buffer.from(bytes.subarray(0,1024)).toString('ascii');
  const text=decode(/(?:CHARSET:1252|encoding=["'](?:windows-1252|iso-8859-1)["'])/i.test(prefix)?'windows-1252':'utf-8');
  if(/<!DOCTYPE|<!ENTITY/i.test(text))fail('INVALID_FILE');
  const start=text.search(/<OFX(?:\s|>)/i);if(start<0)fail('INVALID_FILE');let body=text.slice(start);
  if((body.match(/<STMTTRN\s*>/gi)?.length??0)>limits.rows)fail('LIMIT_EXCEEDED');
  if(!/^\s*<\?xml/i.test(text)&&/OFXHEADER:1\d\d/i.test(text.slice(0,start))){
    const leaves='CODE|SEVERITY|MESSAGE|DTSERVER|LANGUAGE|DTPROFUP|DTACCTUP|ORG|FID|INTU.BID|TRNUID|CLTCOOKIE|CURDEF|BANKID|BRANCHID|ACCTID|ACCTTYPE|DTSTART|DTEND|TRNTYPE|DTPOSTED|DTUSER|DTAVAIL|TRNAMT|FITID|CORRECTFITID|CORRECTACTION|SRVRTID|CHECKNUM|REFNUM|SIC|PAYEEID|NAME|MEMO|BALAMT|DTASOF|USERKEY|TSKEYEXPIRE|ACCESSKEY';
    body=body.replace(new RegExp(`<(${leaves})>([^<]*)(?:<\\/\\1\\s*>)?`,'gi'),(_,tag:string,value:string)=>`<${tag}>${value}</${tag}>`);
  }
  let depth=0,tags=0;for(const token of body.matchAll(/<!\[CDATA\[[\s\S]*?\]\]>|<!--[\s\S]*?-->|<[^>]*>/g)){const t=token[0];if(t.startsWith('<!'))continue;tags++;if(t.startsWith('</'))depth--;else if(!t.endsWith('/>')&&!t.startsWith('<?'))depth++;if(depth>32||tags>20000)fail('LIMIT_EXCEEDED');}
  if(XMLValidator.validate(body)!==true)fail('INVALID_FILE');
  const doc=record(new XMLParser({ignoreAttributes:true,parseTagValue:false,trimValues:true,processEntities:false,isArray:tag=>tag==='STMTTRN'}).parse(body));
  const root=record(doc.OFX);if(root.INVSTMTMSGSRSV1||root.CREDITCARDMSGSRSV1)fail('INVALID_FILE');
  const responses=record(root.BANKMSGSRSV1).STMTTRNRS;if(Array.isArray(responses))fail('INVALID_FILE');const statement=record(record(responses).STMTRS);if(!Object.keys(statement).length)fail('INVALID_FILE');
  const currency=scalar(statement.CURDEF).toUpperCase(),account=scalar(record(statement.BANKACCTFROM).ACCTID);
  if(!/^[A-Z]{3}$/.test(currency))fail('INVALID_FILE');result.accountHint=account?'****'+account.slice(-4):null;
  const rows=record(statement.BANKTRANLIST).STMTTRN;if(!Array.isArray(rows)||!rows.length)fail('EMPTY_FILE');if(rows.length>limits.rows)fail('LIMIT_EXCEEDED');
  result.headers=['Data','Descrição','Valor','Tipo','Moeda','Identificador'];
  const debit=new Set(['DEBIT','CHECK','POS','ATM','DIRECTDEBIT','FEE','SRVCHG']),credit=new Set(['CREDIT','DIRECTDEP']);
  result.rows=rows.map(value=>{const r=record(value),kind=scalar(r.TRNTYPE).toUpperCase(),correction=!!(r.CORRECTFITID||r.CORRECTACTION);return [ofxDate(scalar(r.DTPOSTED)),entity(scalar(r.MEMO)||scalar(r.NAME)),scalar(r.TRNAMT),correction?'UNSUPPORTED':debit.has(kind)?'EXPENSE':credit.has(kind)?'INCOME':'UNSUPPORTED',currency,entity(scalar(r.FITID))];});
}
async function pdf(){
  if(Buffer.from(bytes.subarray(0,8)).toString('ascii').indexOf('%PDF-')!==0)fail('INVALID_FILE');
  const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task=getDocument({data:bytes,verbosity:0,stopAtErrors:true,useWorkerFetch:false,useWasm:false,disableFontFace:true,useSystemFonts:false,enableXfa:false,isOffscreenCanvasSupported:false,isImageDecoderSupported:false,maxImageSize:0});
  try{const doc=await task.promise;if(doc.numPages>limits.pages)fail('LIMIT_EXCEEDED');let textSize=0;const lines:string[]=[];
    for(let n=1;n<=doc.numPages;n++){const page=await doc.getPage(n),content=await page.getTextContent();const groups=new Map<number,{x:number;text:string}[]>();
      for(const value of content.items){if(!('str'in value))continue;textSize+=value.str.length;if(textSize>limits.text)fail('LIMIT_EXCEEDED');const y=Math.round(value.transform[5]/2)*2,group=groups.get(y)??[];group.push({x:value.transform[4],text:value.str});groups.set(y,group);}
      for(const [,group]of [...groups.entries()].sort((a,b)=>b[0]-a[0]))lines.push(group.sort((a,b)=>a.x-b.x).map(v=>v.text).join(' ').replace(/\s+/g,' ').trim());page.cleanup();
    }
    if(!lines.some(Boolean))fail('PDF_NO_TEXT');const normalized=lines.join('\n').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
    const currency=/MOEDA\s*:\s*([A-Z]{3})/.exec(normalized)?.[1];if(!currency||!normalized.includes('EXTRATO')||!normalized.includes('DATA DESCRICAO VALOR'))fail('PDF_UNSUPPORTED');
    result.headers=['Data','Descrição','Valor','Tipo','Moeda','Identificador'];let table=false;
    for(const line of lines){const simple=line.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();if(simple.includes('DATA DESCRICAO VALOR')){table=true;continue;}if(!table||!line||/^(PAGINA|SALDO|TOTAL|SUBTOTAL|EXTRATO|MOEDA)/.test(simple))continue;
      const m=/^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([+-](?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,3})?)$/.exec(line);
      result.rows.push(m?[m[1]!,m[2]!,m[3]!,m[3]!.startsWith('-')?'EXPENSE':'INCOME',currency,'']:[line.slice(0,10),line,'','UNSUPPORTED',currency,'']);
      if(result.rows.length>limits.rows)fail('LIMIT_EXCEEDED');
    }
    if(!result.rows.length)fail('PDF_UNSUPPORTED');
  }catch(error){if((error as {name?:string}).name==='PasswordException')fail('PDF_ENCRYPTED');throw error;}finally{await task.destroy();}
}
try{if(format==='CSV')csv();else if(format==='OFX')ofx();else await pdf();if(result.rows.some(r=>r.length>limits.columns||r.some(c=>c.length>limits.record)))fail('LIMIT_EXCEEDED');if([...result.headers,...result.rows.flat()].some(c=>[...c].some(char=>char.charCodeAt(0)<32&&!['\t','\r','\n'].includes(char))))fail('INVALID_FILE');}
catch(error){result.headers=[];result.rows=[];result.issues=[(error as {issue?:ImportIssue}).issue??(format==='PDF'?'PDF_UNSUPPORTED':'INVALID_FILE')];}
parentPort?.postMessage(result);

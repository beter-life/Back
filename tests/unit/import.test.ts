import { describe,it,expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { parseImportFile } from '../../src/modules/finance/import-parser.js';
import { normalizeImportRow, importMoney } from '../../src/modules/finance/import-domain.js';
import type { ImportMapping,ImportUpload } from '../../src/modules/finance/import-contracts.js';
const accountId='11111111-1111-4111-8111-111111111111';
const mapping:ImportMapping={accountId,dateFormat:'DMY',numberFormat:'BR',amountMode:'SIGNED',columns:{date:0,description:1,amount:2,type:null,currency:null,externalId:null}};
const input=(text:string,extra:Partial<ImportUpload>={}):ImportUpload=>({fileName:'synthetic.csv',format:'CSV',encoding:'UTF8',delimiter:'AUTO',idempotencyKey:accountId,dataBase64:Buffer.from(text).toString('base64'),...extra});
describe('file import exact normalization',()=>{
  it.each([['-1.234,56','BR','BRL','123456','EXPENSE'],['+1,234.56','INT','USD','123456','INCOME'],['125','INT','JPY','125','INCOME'],['1.234','INT','KWD','1234','INCOME'],['92233720368547758,07','BR','BRL','9223372036854775807','INCOME']] as const)('normalizes %s with exact scale', (raw,format,currency,amount,type)=>{expect(importMoney(raw,format,currency)).toMatchObject({amountMinor:amount,type});});
  it.each(['1,234','1.234,567','0','1e3','NaN','92233720368547758,08','--12'])('blocks invalid/ambiguous or out-of-range BRL %s',raw=>{expect(()=>importMoney(raw,'BR','BRL')).toThrow();});
  it('does not invent account/category, uses profile timezone and blocks totals/type mismatch',()=>{
    const row=normalizeImportRow(['16/10/2026','Mercado','-125,00'],mapping,'CSV','BRL','America/Sao_Paulo');
    expect(row.draft).toMatchObject({accountId,categoryId:null,amountMinor:'12500',type:'EXPENSE',occurredAt:'2026-10-16T15:00:00.000Z'});
    expect(normalizeImportRow(['31/02/2026','Mercado','-125,00'],mapping,'CSV','BRL','UTC').issues).toContain('DATE_INVALID');
    expect(normalizeImportRow(['16/10/2026','Saldo final','125,00'],mapping,'CSV','BRL','UTC').issues).toContain('NOT_TRANSACTION');
    expect(normalizeImportRow(['16/10/2026','Transferência','-125,00','XFER'],{...mapping,columns:{...mapping.columns,type:3}},'CSV','BRL','UTC').issues).toContain('TYPE_UNSUPPORTED');
    expect(normalizeImportRow(['16/10/2026','Compra','-125,00','INCOME'],{...mapping,columns:{...mapping.columns,type:3}},'CSV','BRL','UTC').issues).toContain('SIGN_CONFLICT');
  });
  it('requires explicit TYPE_COLUMN semantics and preserves unsigned expense amounts',()=>{const m={...mapping,amountMode:'TYPE_COLUMN' as const,columns:{...mapping.columns,type:3}};expect(normalizeImportRow(['16/10/2026','Compra','125,00','Despesa'],m,'CSV','BRL','UTC').draft?.type).toBe('EXPENSE');expect(normalizeImportRow(['16/10/2026','Compra','125,00',''],m,'CSV','BRL','UTC').issues).toContain('TYPE_UNSUPPORTED');});
  it('blocks a positive expense when the user explicitly chose SIGNED semantics',()=>{expect(normalizeImportRow(['16/10/2026','Compra','125,00','Despesa'],{...mapping,columns:{...mapping.columns,type:3}},'CSV','BRL','UTC').issues).toContain('SIGN_CONFLICT');});
  it('blocks currency mismatch and descriptions beyond the core bound',()=>{expect(normalizeImportRow(['16/10/2026','Compra','-1,00','USD'],{...mapping,columns:{...mapping.columns,currency:3}},'CSV','BRL','UTC').issues).toContain('CURRENCY_MISMATCH');expect(normalizeImportRow(['16/10/2026','x'.repeat(501),'-1,00'],mapping,'CSV','BRL','UTC').issues).toContain('DESCRIPTION_INVALID');});
});
describe('isolated file parsing',()=>{
  it('rejects excess parallel work transiently and releases worker slots for retries',async()=>{
    const pending=[parseImportFile(input('a;b;c\n1;2;3')),parseImportFile(input('a;b;c\n4;5;6'))];
    await expect(parseImportFile(input('a;b;c\n7;8;9'))).rejects.toMatchObject({code:'RATE_LIMITED'});
    expect((await Promise.all(pending)).every(r=>!r.issues.length)).toBe(true);expect((await parseImportFile(input('a;b;c\n7;8;9'))).issues).toEqual([]);
  });
  it.each([['synthetic-statement.pdf',null],['synthetic-image-only.pdf','PDF_NO_TEXT'],['synthetic-unknown-layout.pdf','PDF_UNSUPPORTED'],['synthetic-encrypted.pdf','PDF_ENCRYPTED'],['synthetic-too-many-pages.pdf','LIMIT_EXCEEDED']] as const)('extracts only the recognized digital layout: %s',async(name,issue)=>{
    const dataBase64=(await readFile(new URL('../fixtures/imports/'+name,import.meta.url))).toString('base64');
    const p=await parseImportFile(input('',{fileName:name,format:'PDF',dataBase64}));
    if(issue){expect(p.issues).toEqual([issue]);expect(p.rows).toEqual([]);}
    else{expect(p.issues).toEqual([]);expect(p.rows).toEqual([['16/10/2026','Cafe sintetico','-12,34','EXPENSE','BRL',''],['16/10/2026','Receita sintetica','+150,00','INCOME','BRL','']]);}
  });
  it('blocks paths, forged extensions, malformed base64 and oversized payloads before worker execution',async()=>{
    for(const extra of [{fileName:'../synthetic.csv'},{fileName:'synthetic.pdf'},{dataBase64:'%%%='},{dataBase64:Buffer.alloc(2097153,65).toString('base64')}])expect((await parseImportFile(input('a;b;c\n1;2;3',extra))).issues.length).toBeGreaterThan(0);
  });
  it('CSV quoted delimiters/newlines, BOM and reordered international columns',async()=>{const p=await parseImportFile(input('\ufeffData;Descrição;Valor\r\n16/10/2026;"Mercado; bairro";-125,00\r\n17/10/2026;"Duas\nlinhas";+50,00'));expect(p.headers).toEqual(['Data','Descrição','Valor']);expect(p.rows).toHaveLength(2);expect(p.rows[0]?.[1]).toBe('Mercado; bairro');expect(p.rows[1]?.[1]).toContain('\n');});
  it('requires explicit supported encoding for legacy CSV bytes',async()=>{const i=input('');i.dataBase64=Buffer.from('Data;Descri\xe7\xe3o;Valor\n16/10/2026;Caf\xe9;-1,00','latin1').toString('base64');expect((await parseImportFile(i)).issues).toContain('ENCODING_INVALID');expect((await parseImportFile({...i,encoding:'WINDOWS1252'})).rows[0]?.[1]).toBe('Café');});
  it('does not silently truncate malformed or oversized CSV rows',async()=>{expect((await parseImportFile(input('Data;Descrição;Valor\n16/10/2026;"aberto;-1,00'))).issues).toContain('INVALID_FILE');expect((await parseImportFile(input('a;b;c\n'+'1;2;3\n'.repeat(1001)))).issues).toContain('LIMIT_EXCEEDED');});
  it('rejects embedded binary controls before persistence, including PostgreSQL-incompatible NUL',async()=>{expect((await parseImportFile(input('Data;Descricao;Valor\n16/10/2026;Synthetic\u0000payload;-1,00'))).issues).toEqual(['INVALID_FILE']);});
  it('refuses fake format, empty input and hostile XML declarations',async()=>{expect((await parseImportFile(input('%PDF-1.7'))).issues).toContain('INVALID_FILE');expect((await parseImportFile(input(' '))).issues).toContain('EMPTY_FILE');expect((await parseImportFile(input('<!DOCTYPE OFX [<!ENTITY x SYSTEM "file:///etc/passwd">]><OFX/>',{fileName:'synthetic.ofx',format:'OFX'}))).issues).toContain('INVALID_FILE');});
  it('does not interpret an OFX correction/delete as a new debit',async()=>{
    const text='<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><CURDEF>BRL</CURDEF><BANKTRANLIST><STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20261016</DTPOSTED><TRNAMT>-12.34</TRNAMT><FITID>synthetic-correction</FITID><CORRECTFITID>synthetic-original</CORRECTFITID><CORRECTACTION>DELETE</CORRECTACTION><MEMO>Synthetic correction</MEMO></STMTTRN></BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>';
    const parsed=await parseImportFile(input(text,{fileName:'synthetic.ofx',format:'OFX'}));expect(parsed.rows[0]?.[3]).toBe('UNSUPPORTED');
  });
  it.each([false,true])('supports chosen OFX SGML/XML variant xml=%s',async xml=>{const leaf=(n:string,v:string)=>`<${n}>${v}${xml?`</${n}>`:''}`;const ofx=(xml?'<?xml version="1.0"?>':'OFXHEADER:100\nDATA:OFXSGML\nVERSION:102\n\n')+'<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS>'+leaf('CURDEF','BRL')+'<BANKACCTFROM>'+leaf('BANKID','001')+leaf('ACCTID','12345678')+'</BANKACCTFROM><BANKTRANLIST><STMTTRN>'+leaf('TRNTYPE','DEBIT')+leaf('DTPOSTED','20261016120000[-3:BRT]')+leaf('TRNAMT','-125.00')+leaf('FITID','synthetic-001')+leaf('MEMO','Mercado &amp; Bairro')+'</STMTTRN></BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>';const p=await parseImportFile(input(ofx,{fileName:'synthetic.ofx',format:'OFX'}));expect(p.issues).toEqual([]);expect(p.rows[0]).toEqual(['2026-10-16T15:00:00.000Z','Mercado & Bairro','-125.00','EXPENSE','BRL','synthetic-001']);expect(p.accountHint).toBe('****5678');});
});

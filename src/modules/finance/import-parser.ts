import { Worker } from 'node:worker_threads';
import { AppError } from '../../shared/errors/index.js';
import type { ImportIssue, ImportUpload } from './import-contracts.js';
export interface ParsedImport {headers:string[];rows:string[][];issues:ImportIssue[];accountHint:string|null}
export const importLimits={bytes:2097152,rows:1000,columns:32,record:8192,pages:10,text:1000000,workerMs:5000,heapMb:128} as const;
const failed=(issue:ImportIssue):ParsedImport=>({headers:[],rows:[],issues:[issue],accountHint:null});
let active=0;
export async function parseImportFile(input:ImportUpload):Promise<ParsedImport> {
  if(!/^[^/\\]{1,120}\.(csv|ofx|pdf)$/i.test(input.fileName)||[...input.fileName].some(c=>c.charCodeAt(0)<32)||!input.fileName.toLowerCase().endsWith('.'+input.format.toLowerCase()))return failed('INVALID_FILE');
  if(input.dataBase64.length>2796204||input.dataBase64.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(input.dataBase64))return failed('INVALID_FILE');
  const bytes=Buffer.from(input.dataBase64,'base64');
  if(bytes.toString('base64')!==input.dataBase64)return failed('INVALID_FILE');
  if(!bytes.length)return failed('EMPTY_FILE');if(bytes.length>importLimits.bytes)return failed('LIMIT_EXCEEDED');
  if(active>=2)throw new AppError('RATE_LIMITED');active++;
  try{return await new Promise<ParsedImport>(resolve=>{
    const worker=new Worker(new URL(import.meta.url.endsWith('.ts')?'./import-parser-worker.ts':'./import-parser-worker.js',import.meta.url),{
      workerData:{bytes:new Uint8Array(bytes),format:input.format,encoding:input.encoding,delimiter:input.delimiter,limits:importLimits},
      resourceLimits:{maxOldGenerationSizeMb:importLimits.heapMb,maxYoungGenerationSizeMb:16,stackSizeMb:4},execArgv:[],stdout:true,stderr:true,
    });
    worker.stdout?.resume();worker.stderr?.resume();
    let settled=false;const finish=(value:ParsedImport)=>{if(settled)return;settled=true;clearTimeout(timer);void worker.terminate().then(()=>resolve(value),()=>resolve(failed('INVALID_FILE')));};
    const timer=setTimeout(()=>finish(failed('LIMIT_EXCEEDED')),importLimits.workerMs);
    worker.once('message',(value:ParsedImport)=>finish(value));worker.once('error',()=>finish(failed('INVALID_FILE')));worker.once('exit',()=>{if(!settled)finish(failed('INVALID_FILE'));});
  });}finally{active--;}
}

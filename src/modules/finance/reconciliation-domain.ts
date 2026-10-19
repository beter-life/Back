import { createHash } from 'node:crypto';
import { AppError } from '../../shared/errors/index.js';
import type { InboxDraft } from './inbox-contracts.js';
export function reconciliationRange(from:string,to:string){const a=Date.parse(from),b=Date.parse(to);if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a||b-a>366*86400000)throw new AppError('VALIDATION_ERROR');}
export function evidenceKey(fileHash:string,rowNumber:number,draft:InboxDraft,externalId:string|null){return (externalId?'id:':'file:')+createHash('sha256').update(JSON.stringify([draft.accountId,draft.currency,...(externalId?[externalId]:[fileHash,rowNumber])])).digest('hex');}
export function ledgerFingerprint(t:{accountId:string;currency:string;type:string;amountMinor:bigint|string;occurredAt:Date|string}){return createHash('sha256').update(JSON.stringify([t.accountId,t.currency,t.type,String(t.amountMinor),new Date(t.occurredAt).toISOString()])).digest('hex');}
export function compareEvidence(e:{accountId:string;currency:string;type:string;amountMinor:bigint|string;occurredAt:Date|string},t:{accountId:string;currency:string;type:string;amountMinor:bigint|string;occurredAt:Date|string;isCancelled:boolean}){
  const distance=Math.abs(new Date(e.occurredAt).getTime()-new Date(t.occurredAt).getTime());
  const amountDifference=BigInt(e.amountMinor)!==BigInt(t.amountMinor),dateDifference=distance!==0;
  return {compatible:e.accountId===t.accountId&&e.currency===t.currency&&e.type===t.type&&!amountDifference&&!t.isCancelled&&distance<=31*86400000,amountDifference,dateDifference,cancelled:t.isCancelled};
}

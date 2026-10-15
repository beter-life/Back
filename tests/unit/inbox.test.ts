import { describe, it, expect } from 'vitest';
import { normalizeInboxDraft, inboxFingerprint } from '../../src/modules/finance/inbox-domain.js';
import type { InboxDraft } from '../../src/modules/finance/inbox-contracts.js';

const draft: InboxDraft = { description:' Proposta manual ',type:'EXPENSE',currency:'BRL',accountId:null,categoryId:null,amountMinor:'9007199254740993',occurredAt:'2026-10-15T09:00:00-03:00' };
describe('Inbox canonical proposal boundary',()=>{
  it('keeps exact minor units and normalizes description/instant without financial side effects',()=>{
    expect(normalizeInboxDraft(draft)).toMatchObject({description:'Proposta manual',amountMinor:'9007199254740993',occurredAt:'2026-10-15T12:00:00.000Z'});
    expect(draft.description).toBe(' Proposta manual ');
  });
  it('uses a canonical creation fingerprint, independent of object property order and timezone spelling',()=>{
    expect(inboxFingerprint(draft)).toBe(inboxFingerprint({...draft,description:'Proposta manual',occurredAt:'2026-10-15T12:00:00Z'}));
    expect(inboxFingerprint(draft)).not.toBe(inboxFingerprint({...draft,amountMinor:'1'}));
    const accountId='AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA';
    expect(inboxFingerprint({...draft,accountId})).toBe(inboxFingerprint({...draft,accountId:accountId.toLowerCase()}));
  });
  it('allows incomplete drafts but rejects invalid money/dates and blank descriptions',()=>{
    expect(normalizeInboxDraft({...draft,amountMinor:null,occurredAt:null})).toMatchObject({amountMinor:null,occurredAt:null});
    for(const amountMinor of ['0','-1','1.2','01','9223372036854775808'])expect(()=>normalizeInboxDraft({...draft,amountMinor})).toThrow();
    expect(()=>normalizeInboxDraft({...draft,occurredAt:'invalid'})).toThrow();
    expect(()=>normalizeInboxDraft({...draft,description:'  '})).toThrow();
  });
  it.each(['JPY','KWD','BRL'] as const)('does not convert or round %s minor units',currency=>{
    expect(normalizeInboxDraft({...draft,currency,amountMinor:'123'}).amountMinor).toBe('123');
  });
});

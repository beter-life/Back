import { createHash } from 'node:crypto';
import { AppError } from '../../shared/errors/index.js';
import { dateRange, money } from './domain.js';
import type { InboxDraft } from './inbox-contracts.js';

export function normalizeInboxDraft(input: InboxDraft): InboxDraft {
  const description = input.description.trim();
  if (!description || description.length > 500) throw new AppError('VALIDATION_ERROR');
  if (input.amountMinor !== null) money(input.amountMinor, input.currency);
  if (input.occurredAt !== null) dateRange(input.occurredAt);
  return { description, type: input.type, currency: input.currency,
    accountId: input.accountId?.toLowerCase() ?? null, categoryId: input.categoryId?.toLowerCase() ?? null,
    amountMinor: input.amountMinor,
    occurredAt: input.occurredAt === null ? null : new Date(input.occurredAt).toISOString() };
}
export function inboxFingerprint(input: InboxDraft): string {
  return createHash('sha256').update(JSON.stringify(normalizeInboxDraft(input))).digest('hex');
}

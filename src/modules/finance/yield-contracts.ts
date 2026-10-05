import { Type, type Static, type TSchema, type TLiteral, type TUnion } from 'typebox';
import { Currency } from './contracts.js';
import { RecurrenceDate } from './recurrence-contracts.js';
const strict = { additionalProperties: false };
const choices = <const T extends [string,...string[]]>(values:T):TUnion<{[K in keyof T]:TLiteral<T[K]>}> => Type.Union(values.map(v=>Type.Literal(v)) as {[K in keyof T]:TLiteral<T[K]>}) as TUnion<{[K in keyof T]:TLiteral<T[K]>}>;
const nullable = <T extends TSchema>(s:T) => Type.Union([s,Type.Null()]);
const Id = Type.String({format:'uuid'}), Instant=Type.String({format:'date-time'});
const Minor=Type.String({pattern:'^(0|[1-9][0-9]*)$',maxLength:19});
const Aggregate=Type.String({pattern:'^(0|[1-9][0-9]*)$'});
const Decimal=Type.String({pattern:'^(0|[1-9][0-9]*)(\\.[0-9]{1,18})?$',maxLength:24});
export const YieldRuleType=choices(['ZERO','FIXED_RATE','BENCHMARK_PERCENTAGE','SAVINGS_BR']);
export const YieldBenchmark=choices(['CDI','SELIC','SELIC_TARGET','TR']);
export const YieldSourceStatus=choices(['CURRENT','STALE','UNAVAILABLE']);
export const YieldRuleInput=Type.Object({
  ruleType:YieldRuleType,effectiveFrom:RecurrenceDate,
  benchmark:Type.Optional(nullable(choices(['CDI','SELIC']))),
  fixedRate:Type.Optional(nullable(Decimal)),benchmarkPercentage:Type.Optional(nullable(Decimal)),
  ratePeriod:Type.Optional(nullable(choices(['ANNUAL','MONTHLY']))),
  dayCountConvention:choices(['BUSINESS_252','CALENDAR_365','MONTHLY_ANNIVERSARY']),
  eligibilityDelayDays:Type.Optional(Type.Integer({minimum:0,maximum:3650})),
  eligibleBalanceCapMinor:Type.Optional(nullable(Minor)),
  taxTreatment:choices(['NONE','BR_FIXED_INCOME_STANDARD','BR_SAVINGS_EXEMPT']),
  taxReferenceDate:Type.Optional(nullable(RecurrenceDate)),
},strict);
export const YieldRule=Type.Object({...YieldRuleInput.properties,
  id:Id,profileId:Id,effectiveTo:nullable(RecurrenceDate),createdAt:Instant,
  benchmark:nullable(choices(['CDI','SELIC'])),fixedRate:nullable(Decimal),benchmarkPercentage:nullable(Decimal),ratePeriod:nullable(choices(['ANNUAL','MONTHLY'])),
  eligibilityDelayDays:Type.Integer(),eligibleBalanceCapMinor:nullable(Minor),taxReferenceDate:nullable(RecurrenceDate),
},strict);
export const YieldProfile=Type.Object({id:Id,accountId:Id,currency:Currency,status:choices(['ACTIVE','ARCHIVED']),createdAt:Instant,updatedAt:Instant,rules:Type.Array(YieldRule,{maxItems:500})},strict);
export const YieldProfileResult=nullable(YieldProfile);
export const YieldProfiles=Type.Array(YieldProfile,{maxItems:500});
export const YieldAccountParams=Type.Object({accountId:Id},strict);
export const YieldEstimateQuery=Type.Object({from:Type.Optional(RecurrenceDate),to:RecurrenceDate,assumption:Type.Optional(Type.Literal('CURRENT_RATE'))},strict);
export const YieldMarketRate=Type.Object({benchmark:YieldBenchmark,seriesCode:Type.String(),value:nullable(Decimal),unit:choices(['ANNUAL_DECIMAL','MONTHLY_DECIMAL']),observedDate:nullable(RecurrenceDate),source:Type.Literal('BCB'),sourceStatus:YieldSourceStatus,lastUpdatedAt:nullable(Instant)},strict);
export const YieldBenchmarks=Type.Array(YieldMarketRate);
export const YieldEstimate=Type.Object({
  currency:Currency,from:RecurrenceDate,to:RecurrenceDate,principalMinor:Aggregate,
  grossYieldMinor:nullable(Aggregate),grossValueMinor:nullable(Aggregate),estimatedIofMinor:nullable(Aggregate),estimatedIrMinor:nullable(Aggregate),estimatedTaxesMinor:nullable(Aggregate),estimatedNetYieldMinor:nullable(Aggregate),estimatedNetValueMinor:nullable(Aggregate),
  estimatedIrRate:nullable(Decimal),taxReferenceDate:RecurrenceDate,
  status:choices(['AVAILABLE','UNAVAILABLE']),sourceStatus:YieldSourceStatus,
  projection:Type.Boolean(),observed:Type.Boolean(),assumption:nullable(Type.Literal('CURRENT_RATE')),
  calendarAssumption:choices(['OBSERVED_DATES','WEEKDAYS_ONLY','CALENDAR_DAYS','MONTHLY_ANNIVERSARY']),
  benchmarkSource:nullable(Type.Literal('BCB')),benchmarkAsOf:nullable(RecurrenceDate),
  nextAnniversary:nullable(RecurrenceDate),model:choices(['CURRENT_PRINCIPAL','REAL_BALANCE_HISTORY']),
  points:Type.Array(Type.Object({date:RecurrenceDate,grossYieldMinor:Aggregate},strict),{maxItems:3661}),
},strict);
export const YieldSummary=Type.Object({from:RecurrenceDate,to:RecurrenceDate,totals:Type.Array(Type.Object({currency:Currency,yieldingAccounts:Type.Integer(),principalMinor:Aggregate,estimatedGrossYieldMinor:Aggregate,estimatedNetYieldMinor:Aggregate,unavailableAccounts:Type.Integer()},strict))},strict);
export const YieldComparisonInput=Type.Object({currency:Currency,principalMinor:Minor,from:RecurrenceDate,to:RecurrenceDate,fixedRate:Decimal,ratePeriod:choices(['ANNUAL','MONTHLY']),taxTreatment:choices(['NONE','BR_FIXED_INCOME_STANDARD'])},strict);
export const YieldComparison=Type.Object({cdi:YieldEstimate,savings:YieldEstimate,fixed:YieldEstimate},strict);
export type YieldRuleInput=Static<typeof YieldRuleInput>;
export type YieldRule=Static<typeof YieldRule>;
export type YieldProfile=Static<typeof YieldProfile>;
export type YieldEstimateQuery=Static<typeof YieldEstimateQuery>;
export type YieldEstimate=Static<typeof YieldEstimate>;
export type YieldMarketRate=Static<typeof YieldMarketRate>;
export type YieldSummary=Static<typeof YieldSummary>;
export type YieldComparisonInput=Static<typeof YieldComparisonInput>;

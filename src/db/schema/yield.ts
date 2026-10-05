import { sql } from 'drizzle-orm';
import { authenticatedRole } from 'drizzle-orm/supabase';
import { bigint,check,date,foreignKey,index,integer,numeric,pgPolicy,timestamp,unique,uuid,varchar } from 'drizzle-orm/pg-core';
import { appSchema } from './profiles.js';
import { financialAccounts } from './finance.js';
import type { Currency } from '../../modules/finance/domain.js';
import type { YieldRuleInput } from '../../modules/finance/yield-contracts.js';
export const yieldProfiles=appSchema.table('financial_yield_profiles',{
  id:uuid('id').primaryKey().defaultRandom(),authUserId:uuid('auth_user_id').notNull(),accountId:uuid('account_id').notNull(),currency:varchar('currency',{length:3}).$type<Currency>().notNull(),
  status:varchar('status',{length:8}).$type<'ACTIVE'|'ARCHIVED'>().notNull().default('ACTIVE'),
  createdAt:timestamp('created_at',{withTimezone:true}).notNull().defaultNow(),updatedAt:timestamp('updated_at',{withTimezone:true}).notNull().defaultNow(),
},t=>[
  unique('yield_profile_account_unique').on(t.accountId),unique('yield_profile_id_owner_unique').on(t.id,t.authUserId),
  foreignKey({name:'yield_profile_account_owner_currency_fk',columns:[t.accountId,t.authUserId,t.currency],foreignColumns:[financialAccounts.id,financialAccounts.authUserId,financialAccounts.currency]}),
  check('yield_profile_status_check',sql`${t.status} in ('ACTIVE','ARCHIVED')`),index('yield_profile_owner_idx').on(t.authUserId),
  pgPolicy('yield_profile_select_own',{for:'select',to:authenticatedRole,using:sql`(select auth.uid())=${t.authUserId}`}),
  pgPolicy('yield_profile_insert_own',{for:'insert',to:authenticatedRole,withCheck:sql`(select auth.uid())=${t.authUserId}`}),
  pgPolicy('yield_profile_update_own',{for:'update',to:authenticatedRole,using:sql`(select auth.uid())=${t.authUserId}`,withCheck:sql`(select auth.uid())=${t.authUserId}`}),
]).enableRLS();
export const yieldRules=appSchema.table('financial_yield_rules',{
  id:uuid('id').primaryKey().defaultRandom(),authUserId:uuid('auth_user_id').notNull(),profileId:uuid('profile_id').notNull(),
  ruleType:varchar('rule_type',{length:20}).$type<YieldRuleInput['ruleType']>().notNull(),effectiveFrom:date('effective_from').notNull(),effectiveTo:date('effective_to'),
  benchmark:varchar('benchmark',{length:5}).$type<'CDI'|'SELIC'>(),fixedRate:numeric('fixed_rate',{precision:38,scale:18}),benchmarkPercentage:numeric('benchmark_percentage',{precision:38,scale:18}),
  ratePeriod:varchar('rate_period',{length:7}).$type<'ANNUAL'|'MONTHLY'>(),dayCountConvention:varchar('day_count_convention',{length:20}).$type<YieldRuleInput['dayCountConvention']>().notNull(),
  eligibilityDelayDays:integer('eligibility_delay_days').notNull().default(0),eligibleBalanceCapMinor:bigint('eligible_balance_cap_minor',{mode:'bigint'}),
  taxTreatment:varchar('tax_treatment',{length:24}).$type<YieldRuleInput['taxTreatment']>().notNull(),taxReferenceDate:date('tax_reference_date'),createdAt:timestamp('created_at',{withTimezone:true}).notNull().defaultNow(),
},t=>[
  foreignKey({name:'yield_rule_profile_owner_fk',columns:[t.profileId,t.authUserId],foreignColumns:[yieldProfiles.id,yieldProfiles.authUserId]}),
  unique('yield_rule_start_unique').on(t.profileId,t.effectiveFrom),index('yield_rule_owner_profile_date_idx').on(t.authUserId,t.profileId,t.effectiveFrom),
  check('yield_rule_interval_check',sql`${t.effectiveFrom} between date '1000-01-01' and date '9988-12-31' and (${t.effectiveTo} is null or ${t.effectiveTo}>${t.effectiveFrom})`),
  check('yield_rule_delay_cap_check',sql`${t.eligibilityDelayDays} between 0 and 3650 and (${t.eligibleBalanceCapMinor} is null or ${t.eligibleBalanceCapMinor}>0)`),
  check('yield_rule_tax_check',sql`${t.taxTreatment} in ('NONE','BR_FIXED_INCOME_STANDARD','BR_SAVINGS_EXEMPT') and (${t.taxReferenceDate} is null or ${t.taxReferenceDate}<=${t.effectiveFrom})`),
  check('yield_rule_shape_check',sql`(${t.ruleType}='ZERO' and ${t.fixedRate} is null and ${t.benchmark} is null and ${t.benchmarkPercentage} is null and ${t.ratePeriod} is null and ${t.dayCountConvention}='CALENDAR_365' and ${t.taxTreatment}='NONE') or (${t.ruleType}='FIXED_RATE' and ${t.fixedRate} between 0 and 10 and ${t.benchmark} is null and ${t.benchmarkPercentage} is null and ${t.ratePeriod} in ('ANNUAL','MONTHLY') and ${t.dayCountConvention} in ('CALENDAR_365','BUSINESS_252') and ${t.taxTreatment} in ('NONE','BR_FIXED_INCOME_STANDARD')) or (${t.ruleType}='BENCHMARK_PERCENTAGE' and ${t.fixedRate} is null and ${t.benchmark} in ('CDI','SELIC') and ${t.benchmarkPercentage} between 0 and 10 and ${t.ratePeriod} is null and ${t.dayCountConvention}='BUSINESS_252' and ${t.taxTreatment} in ('NONE','BR_FIXED_INCOME_STANDARD')) or (${t.ruleType}='SAVINGS_BR' and ${t.fixedRate} is null and ${t.benchmark} is null and ${t.benchmarkPercentage} is null and ${t.ratePeriod} is null and ${t.dayCountConvention}='MONTHLY_ANNIVERSARY' and ${t.taxTreatment}='BR_SAVINGS_EXEMPT')`),
  pgPolicy('yield_rule_select_own',{for:'select',to:authenticatedRole,using:sql`(select auth.uid())=${t.authUserId}`}),
  pgPolicy('yield_rule_insert_own',{for:'insert',to:authenticatedRole,withCheck:sql`(select auth.uid())=${t.authUserId} and exists(select 1 from app.financial_yield_profiles p where p.id=${t.profileId} and p.auth_user_id=${t.authUserId} and p.status='ACTIVE')`}),
]).enableRLS();
export const marketRates=appSchema.table('financial_market_rates',{
  id:uuid('id').primaryKey().defaultRandom(),benchmark:varchar('benchmark',{length:12}).notNull(),seriesCode:varchar('series_code',{length:4}).notNull(),rateDate:date('rate_date').notNull(),rateValue:numeric('rate_value',{precision:38,scale:18}).notNull(),rateUnit:varchar('rate_unit',{length:16}).notNull(),source:varchar('source',{length:3}).notNull().default('BCB'),fetchedAt:timestamp('fetched_at',{withTimezone:true}).notNull().defaultNow(),
},t=>[
  unique('market_rate_observation_unique').on(t.benchmark,t.seriesCode,t.rateDate),index('market_rate_series_date_idx').on(t.seriesCode,t.rateDate),
  check('market_rate_value_check',sql`${t.rateValue} between 0 and 10 and ${t.source}='BCB'`),
  check('market_rate_series_check',sql`(${t.benchmark}='CDI' and ((${t.seriesCode}='12' and ${t.rateUnit}='DAILY_DECIMAL') or (${t.seriesCode}='4389' and ${t.rateUnit}='ANNUAL_DECIMAL'))) or (${t.benchmark}='SELIC' and ((${t.seriesCode}='11' and ${t.rateUnit}='DAILY_DECIMAL') or (${t.seriesCode}='1178' and ${t.rateUnit}='ANNUAL_DECIMAL'))) or (${t.benchmark}='SELIC_TARGET' and ${t.seriesCode}='432' and ${t.rateUnit}='ANNUAL_DECIMAL') or (${t.benchmark}='TR' and ${t.seriesCode}='226' and ${t.rateUnit}='MONTHLY_DECIMAL')`),
]).enableRLS();

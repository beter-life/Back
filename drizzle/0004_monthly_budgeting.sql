-- MDL 3: additive monthly budgeting inside the private Finance schema.
CREATE TABLE "app"."financial_budget_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"budget_period_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"category_kind" varchar(7) DEFAULT 'EXPENSE' NOT NULL,
	"currency" varchar(3) NOT NULL,
	"amount_minor" bigint NOT NULL,
	"rollover_policy" varchar(13) DEFAULT 'NONE' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "financial_budget_allocation_period_category_key" UNIQUE("budget_period_id","category_id"),
	CONSTRAINT "financial_budget_allocation_amount_check" CHECK ("app"."financial_budget_allocations"."amount_minor" >= 0),
	CONSTRAINT "financial_budget_allocation_category_kind_check" CHECK ("app"."financial_budget_allocations"."category_kind" = 'EXPENSE'),
	CONSTRAINT "financial_budget_allocation_rollover_check" CHECK ("app"."financial_budget_allocations"."rollover_policy" in ('NONE','POSITIVE_ONLY'))
);
--> statement-breakpoint
ALTER TABLE "app"."financial_budget_allocations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."financial_budget_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"period_month" varchar(7) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"time_zone" varchar(100) NOT NULL,
	CONSTRAINT "financial_budget_period_owner_month_currency_key" UNIQUE("auth_user_id","period_month","currency"),
	CONSTRAINT "financial_budget_period_owner_currency_key" UNIQUE("id","auth_user_id","currency"),
	CONSTRAINT "financial_budget_period_month_check" CHECK ("app"."financial_budget_periods"."period_month" ~ '^[1-9][0-9]{3}-(0[1-9]|1[0-2])$' and left("app"."financial_budget_periods"."period_month",4)::integer <= 9998),
	CONSTRAINT "financial_budget_period_currency_check" CHECK ("app"."financial_budget_periods"."currency" in ('BRL','USD','EUR','GBP','CAD','AUD','CHF','JPY','CLP','KRW','KWD','BHD')),
	CONSTRAINT "financial_budget_period_timezone_check" CHECK (timezone("app"."financial_budget_periods"."time_zone", timestamp '2000-01-01') is not null)
);
--> statement-breakpoint
ALTER TABLE "app"."financial_budget_periods" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."financial_budget_allocations" ADD CONSTRAINT "financial_budget_allocation_period_owner_fk" FOREIGN KEY ("budget_period_id","auth_user_id","currency") REFERENCES "app"."financial_budget_periods"("id","auth_user_id","currency") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."financial_budget_allocations" ADD CONSTRAINT "financial_budget_allocation_category_owner_fk" FOREIGN KEY ("category_id","auth_user_id","category_kind") REFERENCES "app"."financial_categories"("id","auth_user_id","kind") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "financial_budget_allocation_owner_period_idx" ON "app"."financial_budget_allocations" USING btree ("auth_user_id","budget_period_id");--> statement-breakpoint
CREATE POLICY "financial_budget_allocations_select_own" ON "app"."financial_budget_allocations" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "app"."financial_budget_allocations"."auth_user_id");--> statement-breakpoint
CREATE POLICY "financial_budget_allocations_insert_own" ON "app"."financial_budget_allocations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "app"."financial_budget_allocations"."auth_user_id");--> statement-breakpoint
CREATE POLICY "financial_budget_allocations_update_own" ON "app"."financial_budget_allocations" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "app"."financial_budget_allocations"."auth_user_id") WITH CHECK ((select auth.uid()) = "app"."financial_budget_allocations"."auth_user_id");--> statement-breakpoint
CREATE POLICY "financial_budget_periods_select_own" ON "app"."financial_budget_periods" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "app"."financial_budget_periods"."auth_user_id");--> statement-breakpoint
CREATE POLICY "financial_budget_periods_insert_own" ON "app"."financial_budget_periods" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "app"."financial_budget_periods"."auth_user_id");--> statement-breakpoint
CREATE POLICY "financial_budget_periods_update_own" ON "app"."financial_budget_periods" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "app"."financial_budget_periods"."auth_user_id") WITH CHECK ((select auth.uid()) = "app"."financial_budget_periods"."auth_user_id");

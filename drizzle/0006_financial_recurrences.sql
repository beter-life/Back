CREATE TABLE "app"."financial_recurrences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(1000),
	"transaction_type" varchar(7) NOT NULL,
	"recurrence_kind" varchar(12) NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" varchar(3) NOT NULL,
	"account_id" uuid,
	"category_id" uuid,
	"frequency" varchar(7) NOT NULL,
	"interval_count" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"status" varchar(8) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "financial_recurrences_name_check" CHECK (length(trim("app"."financial_recurrences"."name")) > 0),
	CONSTRAINT "financial_recurrences_amount_check" CHECK ("app"."financial_recurrences"."amount_minor" > 0),
	CONSTRAINT "financial_recurrences_currency_check" CHECK ("app"."financial_recurrences"."currency" in ('BRL','USD','EUR','GBP','CAD','AUD','CHF','JPY','CLP','KRW','KWD','BHD')),
	CONSTRAINT "financial_recurrences_type_check" CHECK ("app"."financial_recurrences"."transaction_type" in ('INCOME','EXPENSE')),
	CONSTRAINT "financial_recurrences_kind_check" CHECK ("app"."financial_recurrences"."recurrence_kind" in ('STANDARD','SUBSCRIPTION')),
	CONSTRAINT "financial_recurrences_subscription_check" CHECK ("app"."financial_recurrences"."recurrence_kind" <> 'SUBSCRIPTION' or "app"."financial_recurrences"."transaction_type" = 'EXPENSE'),
	CONSTRAINT "financial_recurrences_frequency_check" CHECK ("app"."financial_recurrences"."frequency" in ('WEEKLY','MONTHLY','YEARLY')),
	CONSTRAINT "financial_recurrences_interval_check" CHECK ("app"."financial_recurrences"."interval_count" between 1 and case "app"."financial_recurrences"."frequency" when 'WEEKLY' then 52 when 'MONTHLY' then 24 when 'YEARLY' then 10 else 0 end),
	CONSTRAINT "financial_recurrences_dates_check" CHECK ("app"."financial_recurrences"."start_date" between date '1000-01-01' and date '9998-12-31' and ("app"."financial_recurrences"."end_date" is null or ("app"."financial_recurrences"."end_date" >= "app"."financial_recurrences"."start_date" and "app"."financial_recurrences"."end_date" <= date '9998-12-31'))),
	CONSTRAINT "financial_recurrences_status_check" CHECK ("app"."financial_recurrences"."status" in ('ACTIVE','PAUSED','ARCHIVED')),
	CONSTRAINT "financial_recurrences_archive_check" CHECK (("app"."financial_recurrences"."status" = 'ARCHIVED') = ("app"."financial_recurrences"."archived_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "app"."financial_recurrences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."financial_recurrences" ADD CONSTRAINT "financial_recurrences_account_owner_fk" FOREIGN KEY ("account_id","auth_user_id","currency") REFERENCES "app"."financial_accounts"("id","auth_user_id","currency") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."financial_recurrences" ADD CONSTRAINT "financial_recurrences_category_owner_fk" FOREIGN KEY ("category_id","auth_user_id","transaction_type") REFERENCES "app"."financial_categories"("id","auth_user_id","kind") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "financial_recurrences_owner_status_idx" ON "app"."financial_recurrences" USING btree ("auth_user_id","status");--> statement-breakpoint
CREATE INDEX "financial_recurrences_owner_kind_idx" ON "app"."financial_recurrences" USING btree ("auth_user_id","recurrence_kind");--> statement-breakpoint
CREATE INDEX "financial_recurrences_owner_currency_idx" ON "app"."financial_recurrences" USING btree ("auth_user_id","currency");--> statement-breakpoint
CREATE POLICY "financial_recurrences_select_own" ON "app"."financial_recurrences" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "app"."financial_recurrences"."auth_user_id");--> statement-breakpoint
CREATE POLICY "financial_recurrences_insert_own" ON "app"."financial_recurrences" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "app"."financial_recurrences"."auth_user_id");--> statement-breakpoint
CREATE POLICY "financial_recurrences_update_own" ON "app"."financial_recurrences" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "app"."financial_recurrences"."auth_user_id") WITH CHECK ((select auth.uid()) = "app"."financial_recurrences"."auth_user_id");
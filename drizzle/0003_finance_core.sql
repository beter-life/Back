CREATE TABLE "app"."financial_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" varchar(20) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"initial_balance_minor" bigint NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "financial_accounts_owner_currency_key" UNIQUE("id","auth_user_id","currency"),
	CONSTRAINT "financial_accounts_name_check" CHECK (length(trim("app"."financial_accounts"."name")) > 0),
	CONSTRAINT "financial_accounts_type_check" CHECK ("app"."financial_accounts"."type" in ('checking','savings','cash','credit','investment','other')),
	CONSTRAINT "financial_accounts_currency_check" CHECK ("app"."financial_accounts"."currency" in ('BRL','USD','EUR','GBP','CAD','AUD','CHF','JPY','CLP','KRW','KWD','BHD'))
);
--> statement-breakpoint
ALTER TABLE "app"."financial_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."financial_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" varchar(100) NOT NULL,
	"kind" varchar(7) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "financial_categories_owner_kind_key" UNIQUE("id","auth_user_id","kind"),
	CONSTRAINT "financial_categories_name_check" CHECK (length(trim("app"."financial_categories"."name")) > 0),
	CONSTRAINT "financial_categories_kind_check" CHECK ("app"."financial_categories"."kind" in ('INCOME','EXPENSE'))
);
--> statement-breakpoint
ALTER TABLE "app"."financial_categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."financial_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"account_id" uuid NOT NULL,
	"category_id" uuid,
	"type" varchar(7) NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" varchar(3) NOT NULL,
	"description" varchar(500) NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"is_cancelled" boolean DEFAULT false NOT NULL,
	CONSTRAINT "financial_transactions_amount_check" CHECK ("app"."financial_transactions"."amount_minor" > 0),
	CONSTRAINT "financial_transactions_type_check" CHECK ("app"."financial_transactions"."type" in ('INCOME','EXPENSE'))
);
--> statement-breakpoint
ALTER TABLE "app"."financial_transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."financial_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_account_id" uuid NOT NULL,
	"destination_account_id" uuid NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" varchar(3) NOT NULL,
	"description" varchar(500) NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"is_cancelled" boolean DEFAULT false NOT NULL,
	"idempotency_key" uuid NOT NULL,
	CONSTRAINT "financial_transfers_idempotency_key" UNIQUE("auth_user_id","idempotency_key"),
	CONSTRAINT "financial_transfers_amount_check" CHECK ("app"."financial_transfers"."amount_minor" > 0),
	CONSTRAINT "financial_transfers_different_accounts_check" CHECK ("app"."financial_transfers"."source_account_id" <> "app"."financial_transfers"."destination_account_id")
);
--> statement-breakpoint
ALTER TABLE "app"."financial_transfers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."financial_transactions" ADD CONSTRAINT "financial_transactions_account_owner_fk" FOREIGN KEY ("account_id","auth_user_id","currency") REFERENCES "app"."financial_accounts"("id","auth_user_id","currency") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."financial_transactions" ADD CONSTRAINT "financial_transactions_category_owner_fk" FOREIGN KEY ("category_id","auth_user_id","type") REFERENCES "app"."financial_categories"("id","auth_user_id","kind") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."financial_transfers" ADD CONSTRAINT "financial_transfers_source_owner_fk" FOREIGN KEY ("source_account_id","auth_user_id","currency") REFERENCES "app"."financial_accounts"("id","auth_user_id","currency") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."financial_transfers" ADD CONSTRAINT "financial_transfers_destination_owner_fk" FOREIGN KEY ("destination_account_id","auth_user_id","currency") REFERENCES "app"."financial_accounts"("id","auth_user_id","currency") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "financial_accounts_owner_idx" ON "app"."financial_accounts" USING btree ("auth_user_id");--> statement-breakpoint
CREATE INDEX "financial_categories_owner_idx" ON "app"."financial_categories" USING btree ("auth_user_id");--> statement-breakpoint
CREATE INDEX "financial_transactions_owner_date_idx" ON "app"."financial_transactions" USING btree ("auth_user_id","occurred_at","id");--> statement-breakpoint
CREATE INDEX "financial_transactions_account_date_idx" ON "app"."financial_transactions" USING btree ("auth_user_id","account_id","occurred_at");--> statement-breakpoint
CREATE INDEX "financial_transactions_category_date_idx" ON "app"."financial_transactions" USING btree ("auth_user_id","category_id","occurred_at");--> statement-breakpoint
CREATE INDEX "financial_transfers_owner_date_idx" ON "app"."financial_transfers" USING btree ("auth_user_id","occurred_at","id");--> statement-breakpoint
CREATE INDEX "financial_transfers_source_date_idx" ON "app"."financial_transfers" USING btree ("auth_user_id","source_account_id","occurred_at");--> statement-breakpoint
CREATE INDEX "financial_transfers_destination_date_idx" ON "app"."financial_transfers" USING btree ("auth_user_id","destination_account_id","occurred_at");--> statement-breakpoint
CREATE POLICY "financial_accounts_select_own" ON "app"."financial_accounts" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "app"."financial_accounts"."auth_user_id");--> statement-breakpoint
CREATE POLICY "financial_accounts_insert_own" ON "app"."financial_accounts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "app"."financial_accounts"."auth_user_id");--> statement-breakpoint
CREATE POLICY "financial_accounts_update_own" ON "app"."financial_accounts" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "app"."financial_accounts"."auth_user_id") WITH CHECK ((select auth.uid()) = "app"."financial_accounts"."auth_user_id");--> statement-breakpoint
CREATE POLICY "financial_categories_select_own" ON "app"."financial_categories" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "app"."financial_categories"."auth_user_id");--> statement-breakpoint
CREATE POLICY "financial_categories_insert_own" ON "app"."financial_categories" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "app"."financial_categories"."auth_user_id");--> statement-breakpoint
CREATE POLICY "financial_categories_update_own" ON "app"."financial_categories" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "app"."financial_categories"."auth_user_id") WITH CHECK ((select auth.uid()) = "app"."financial_categories"."auth_user_id");--> statement-breakpoint
CREATE POLICY "financial_transactions_select_own" ON "app"."financial_transactions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "app"."financial_transactions"."auth_user_id");--> statement-breakpoint
CREATE POLICY "financial_transactions_insert_own" ON "app"."financial_transactions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "app"."financial_transactions"."auth_user_id");--> statement-breakpoint
CREATE POLICY "financial_transactions_update_own" ON "app"."financial_transactions" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "app"."financial_transactions"."auth_user_id") WITH CHECK ((select auth.uid()) = "app"."financial_transactions"."auth_user_id");--> statement-breakpoint
CREATE POLICY "financial_transfers_select_own" ON "app"."financial_transfers" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "app"."financial_transfers"."auth_user_id");--> statement-breakpoint
CREATE POLICY "financial_transfers_insert_own" ON "app"."financial_transfers" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "app"."financial_transfers"."auth_user_id");--> statement-breakpoint
CREATE POLICY "financial_transfers_update_own" ON "app"."financial_transfers" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "app"."financial_transfers"."auth_user_id") WITH CHECK ((select auth.uid()) = "app"."financial_transfers"."auth_user_id");

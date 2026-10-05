CREATE TABLE "app"."financial_net_worth_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(1000),
	"kind" varchar(9) NOT NULL,
	"category" varchar(10) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"status" varchar(8) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "net_worth_items_id_owner_unique" UNIQUE("id","auth_user_id"),
	CONSTRAINT "net_worth_items_name_check" CHECK (length(trim("app"."financial_net_worth_items"."name")) > 0),
	CONSTRAINT "net_worth_items_currency_check" CHECK ("app"."financial_net_worth_items"."currency" in ('BRL','USD','EUR','GBP','CAD','AUD','CHF','JPY','CLP','KRW','KWD','BHD')),
	CONSTRAINT "net_worth_items_category_check" CHECK (("app"."financial_net_worth_items"."kind" = 'ASSET' and "app"."financial_net_worth_items"."category" in ('PROPERTY','VEHICLE','BUSINESS','VALUABLE','OTHER')) or ("app"."financial_net_worth_items"."kind" = 'LIABILITY' and "app"."financial_net_worth_items"."category" in ('MORTGAGE','LOAN','FINANCING','OTHER'))),
	CONSTRAINT "net_worth_items_status_check" CHECK ("app"."financial_net_worth_items"."status" in ('ACTIVE','ARCHIVED')),
	CONSTRAINT "net_worth_items_archive_check" CHECK (("app"."financial_net_worth_items"."status" = 'ARCHIVED') = ("app"."financial_net_worth_items"."archived_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "app"."financial_net_worth_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."financial_net_worth_valuations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"value_minor" bigint NOT NULL,
	"valuation_date" date NOT NULL,
	"note" varchar(1000),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "net_worth_valuations_value_check" CHECK ("app"."financial_net_worth_valuations"."value_minor" >= 0),
	CONSTRAINT "net_worth_valuations_date_check" CHECK ("app"."financial_net_worth_valuations"."valuation_date" between date '1000-01-01' and date '9998-12-31')
);
--> statement-breakpoint
ALTER TABLE "app"."financial_net_worth_valuations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."financial_net_worth_valuations" ADD CONSTRAINT "net_worth_valuations_item_owner_fk" FOREIGN KEY ("item_id","auth_user_id") REFERENCES "app"."financial_net_worth_items"("id","auth_user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "net_worth_items_owner_created_idx" ON "app"."financial_net_worth_items" USING btree ("auth_user_id","created_at","id");--> statement-breakpoint
CREATE INDEX "net_worth_valuations_owner_item_date_idx" ON "app"."financial_net_worth_valuations" USING btree ("auth_user_id","item_id","valuation_date","created_at","id");--> statement-breakpoint
CREATE POLICY "net_worth_items_select_own" ON "app"."financial_net_worth_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "app"."financial_net_worth_items"."auth_user_id");--> statement-breakpoint
CREATE POLICY "net_worth_items_insert_own" ON "app"."financial_net_worth_items" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "app"."financial_net_worth_items"."auth_user_id");--> statement-breakpoint
CREATE POLICY "net_worth_items_update_own" ON "app"."financial_net_worth_items" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "app"."financial_net_worth_items"."auth_user_id") WITH CHECK ((select auth.uid()) = "app"."financial_net_worth_items"."auth_user_id");--> statement-breakpoint
CREATE POLICY "net_worth_valuations_select_own" ON "app"."financial_net_worth_valuations" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "app"."financial_net_worth_valuations"."auth_user_id");--> statement-breakpoint
CREATE POLICY "net_worth_valuations_insert_own" ON "app"."financial_net_worth_valuations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "app"."financial_net_worth_valuations"."auth_user_id" and exists (select 1 from app.financial_net_worth_items i where i.id = "app"."financial_net_worth_valuations"."item_id" and i.auth_user_id = "app"."financial_net_worth_valuations"."auth_user_id" and i.status = 'ACTIVE'));

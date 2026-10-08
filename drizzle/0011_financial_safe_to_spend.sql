-- MDL10 adds only private settings; no existing financial rows are changed.
CREATE TABLE "app"."financial_safe_spend_accounts" (
	"profile_id" uuid NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"currency" varchar(3) NOT NULL,
	"account_type" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_safe_spend_accounts_profile_id_account_id_pk" PRIMARY KEY("profile_id","account_id"),
	CONSTRAINT "safe_spend_account_type_check" CHECK ("app"."financial_safe_spend_accounts"."account_type" in ('checking','cash','savings','other'))
);
--> statement-breakpoint
ALTER TABLE "app"."financial_safe_spend_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."financial_safe_spend_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"currency" varchar(3) NOT NULL,
	"safety_buffer_minor" bigint DEFAULT 0 NOT NULL,
	"respect_budget" boolean DEFAULT true NOT NULL,
	"reserve_recurrences" boolean DEFAULT true NOT NULL,
	"reserve_goal_plans" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "safe_spend_owner_currency_key" UNIQUE("auth_user_id","currency"),
	CONSTRAINT "safe_spend_id_owner_currency_key" UNIQUE("id","auth_user_id","currency"),
	CONSTRAINT "safe_spend_profile_shape_check" CHECK ("app"."financial_safe_spend_profiles"."safety_buffer_minor">=0 and "app"."financial_safe_spend_profiles"."currency" in ('BRL','USD','EUR','GBP','CAD','AUD','CHF','JPY','CLP','KRW','KWD','BHD'))
);
--> statement-breakpoint
ALTER TABLE "app"."financial_safe_spend_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."financial_safe_spend_accounts" ADD CONSTRAINT "safe_spend_profile_owner_currency_fk" FOREIGN KEY ("profile_id","auth_user_id","currency") REFERENCES "app"."financial_safe_spend_profiles"("id","auth_user_id","currency") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."financial_safe_spend_accounts" ADD CONSTRAINT "safe_spend_account_owner_currency_type_fk" FOREIGN KEY ("account_id","auth_user_id","currency","account_type") REFERENCES "app"."financial_accounts"("id","auth_user_id","currency","type") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "safe_spend_account_owner_idx" ON "app"."financial_safe_spend_accounts" USING btree ("auth_user_id","account_id");--> statement-breakpoint
CREATE POLICY "safe_spend_account_select_own" ON "app"."financial_safe_spend_accounts" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid())="app"."financial_safe_spend_accounts"."auth_user_id");--> statement-breakpoint
CREATE POLICY "safe_spend_profile_select_own" ON "app"."financial_safe_spend_profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid())="app"."financial_safe_spend_profiles"."auth_user_id");
--> statement-breakpoint
REVOKE ALL ON app.financial_safe_spend_profiles, app.financial_safe_spend_accounts FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
CREATE FUNCTION app.safe_spend_identity_immutable() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
DECLARE field text;
BEGIN
  FOREACH field IN ARRAY TG_ARGV LOOP
    IF (pg_catalog.to_jsonb(NEW)->field) IS DISTINCT FROM (pg_catalog.to_jsonb(OLD)->field) THEN
      RAISE EXCEPTION 'Safe to Spend identity is immutable' USING ERRCODE = '23514';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$function$;
--> statement-breakpoint
CREATE TRIGGER safe_spend_profile_identity BEFORE UPDATE ON app.financial_safe_spend_profiles
FOR EACH ROW EXECUTE FUNCTION app.safe_spend_identity_immutable('id','auth_user_id','currency','created_at');
--> statement-breakpoint
CREATE TRIGGER safe_spend_account_identity BEFORE UPDATE ON app.financial_safe_spend_accounts
FOR EACH ROW EXECUTE FUNCTION app.safe_spend_identity_immutable('profile_id','auth_user_id','currency','account_id','account_type','created_at');
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION app.safe_spend_identity_immutable() FROM PUBLIC, anon, authenticated;

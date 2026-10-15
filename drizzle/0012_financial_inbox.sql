CREATE TABLE "app"."financial_inbox_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"source" varchar(10) DEFAULT 'MANUAL' NOT NULL,
	"status" varchar(10) DEFAULT 'PENDING' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"description" varchar(500) NOT NULL,
	"type" varchar(7) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"amount_minor" bigint,
	"occurred_at" timestamp with time zone,
	"account_id" uuid,
	"category_id" uuid,
	"idempotency_key" uuid NOT NULL,
	"creation_fingerprint" varchar(64) NOT NULL,
	"transaction_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "inbox_owner_creation_key" UNIQUE("auth_user_id","idempotency_key"),
	CONSTRAINT "inbox_posted_transaction_key" UNIQUE("transaction_id"),
	CONSTRAINT "inbox_shape_check" CHECK ("app"."financial_inbox_candidates"."source"='MANUAL' and "app"."financial_inbox_candidates"."type" in ('INCOME','EXPENSE') and "app"."financial_inbox_candidates"."currency" in ('BRL','USD','EUR','GBP','CAD','AUD','CHF','JPY','CLP','KRW','KWD','BHD') and "app"."financial_inbox_candidates"."version">0 and length(trim("app"."financial_inbox_candidates"."description"))>0 and ("app"."financial_inbox_candidates"."amount_minor" is null or "app"."financial_inbox_candidates"."amount_minor">0) and "app"."financial_inbox_candidates"."creation_fingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "inbox_state_check" CHECK (("app"."financial_inbox_candidates"."status"='PENDING' and "app"."financial_inbox_candidates"."transaction_id" is null and "app"."financial_inbox_candidates"."processed_at" is null) or ("app"."financial_inbox_candidates"."status"='DISCARDED' and "app"."financial_inbox_candidates"."transaction_id" is null and "app"."financial_inbox_candidates"."processed_at" is not null) or ("app"."financial_inbox_candidates"."status"='CONFIRMED' and "app"."financial_inbox_candidates"."transaction_id" is not null and "app"."financial_inbox_candidates"."processed_at" is not null and "app"."financial_inbox_candidates"."account_id" is not null and "app"."financial_inbox_candidates"."amount_minor" is not null and "app"."financial_inbox_candidates"."occurred_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "app"."financial_inbox_candidates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."financial_inbox_candidates" ADD CONSTRAINT "inbox_account_owner_currency_fk" FOREIGN KEY ("account_id","auth_user_id","currency") REFERENCES "app"."financial_accounts"("id","auth_user_id","currency") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."financial_inbox_candidates" ADD CONSTRAINT "inbox_category_owner_kind_fk" FOREIGN KEY ("category_id","auth_user_id","type") REFERENCES "app"."financial_categories"("id","auth_user_id","kind") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."financial_inbox_candidates" ADD CONSTRAINT "inbox_transaction_owner_fk" FOREIGN KEY ("transaction_id","auth_user_id") REFERENCES "app"."financial_transactions"("id","auth_user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inbox_owner_status_created_idx" ON "app"."financial_inbox_candidates" USING btree ("auth_user_id","status","created_at","id");--> statement-breakpoint
CREATE INDEX "inbox_owner_created_idx" ON "app"."financial_inbox_candidates" USING btree ("auth_user_id","created_at","id");--> statement-breakpoint
CREATE INDEX "inbox_pending_duplicate_idx" ON "app"."financial_inbox_candidates" USING btree ("auth_user_id","account_id","currency","type","amount_minor","occurred_at") WHERE "app"."financial_inbox_candidates"."status"='PENDING';--> statement-breakpoint
CREATE INDEX "inbox_category_owner_idx" ON "app"."financial_inbox_candidates" USING btree ("category_id","auth_user_id","type");--> statement-breakpoint
CREATE POLICY "inbox_select_own" ON "app"."financial_inbox_candidates" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid())="app"."financial_inbox_candidates"."auth_user_id");
--> statement-breakpoint
REVOKE ALL ON app.financial_inbox_candidates FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
CREATE FUNCTION app.inbox_state_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
DECLARE field text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Inbox history is retained' USING ERRCODE = '23514';
  ELSIF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'PENDING' OR NEW.version <> 1 THEN
      RAISE EXCEPTION 'Inbox must start pending' USING ERRCODE = '23514';
    END IF;
  ELSE
    IF OLD.status <> 'PENDING' OR NEW.version <> OLD.version + 1 THEN
      RAISE EXCEPTION 'Inbox terminal state or stale version' USING ERRCODE = '23514';
    END IF;
    FOREACH field IN ARRAY ARRAY['id','auth_user_id','source','idempotency_key','creation_fingerprint','created_at'] LOOP
      IF (pg_catalog.to_jsonb(NEW)->field) IS DISTINCT FROM (pg_catalog.to_jsonb(OLD)->field) THEN
        RAISE EXCEPTION 'Inbox identity is immutable' USING ERRCODE = '23514';
      END IF;
    END LOOP;
    IF NEW.status <> 'PENDING' THEN
      FOREACH field IN ARRAY ARRAY['account_id','category_id','type','currency','amount_minor','occurred_at','description'] LOOP
        IF (pg_catalog.to_jsonb(NEW)->field) IS DISTINCT FROM (pg_catalog.to_jsonb(OLD)->field) THEN
          RAISE EXCEPTION 'Review changes before processing' USING ERRCODE = '23514';
        END IF;
      END LOOP;
    END IF;
    IF NEW.status = 'CONFIRMED' AND NOT EXISTS (
      SELECT 1 FROM app.financial_transactions t WHERE t.id = NEW.transaction_id
      AND t.auth_user_id = NEW.auth_user_id AND t.account_id = NEW.account_id
      AND t.category_id IS NOT DISTINCT FROM NEW.category_id AND t.type = NEW.type
      AND t.currency = NEW.currency AND t.amount_minor = NEW.amount_minor
      AND t.occurred_at = NEW.occurred_at AND t.description = NEW.description
      AND NOT t.is_cancelled
    ) THEN
      RAISE EXCEPTION 'Inbox posting does not match reviewed candidate' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
--> statement-breakpoint
CREATE TRIGGER inbox_state_guard BEFORE INSERT OR UPDATE OR DELETE ON app.financial_inbox_candidates
FOR EACH ROW EXECUTE FUNCTION app.inbox_state_guard();
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION app.inbox_state_guard() FROM PUBLIC, anon, authenticated;

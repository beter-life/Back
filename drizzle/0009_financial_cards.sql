CREATE TABLE "app"."financial_card_billing_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"card_id" uuid NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"closing_day" integer NOT NULL,
	"due_day" integer NOT NULL,
	CONSTRAINT "card_rule_start_unique" UNIQUE("card_id","effective_from"),
	CONSTRAINT "card_rule_shape_check" CHECK ("app"."financial_card_billing_rules"."closing_day" between 1 and 31 and "app"."financial_card_billing_rules"."due_day" between 1 and 31 and ("app"."financial_card_billing_rules"."effective_to" is null or "app"."financial_card_billing_rules"."effective_to">"app"."financial_card_billing_rules"."effective_from"))
);
--> statement-breakpoint
ALTER TABLE "app"."financial_card_billing_rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."financial_card_installments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"card_id" uuid NOT NULL,
	"purchase_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"installment_number" integer NOT NULL,
	"amount_minor" bigint NOT NULL,
	"scheduled_date" date NOT NULL,
	CONSTRAINT "card_installment_number_unique" UNIQUE("purchase_id","installment_number"),
	CONSTRAINT "card_installment_transaction_unique" UNIQUE("transaction_id"),
	CONSTRAINT "card_installment_shape_check" CHECK ("app"."financial_card_installments"."amount_minor">0 and "app"."financial_card_installments"."installment_number" between 1 and 60)
);
--> statement-breakpoint
ALTER TABLE "app"."financial_card_installments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."financial_card_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"card_id" uuid NOT NULL,
	"currency" varchar(3) NOT NULL,
	"category_id" uuid NOT NULL,
	"category_kind" varchar(7) DEFAULT 'EXPENSE' NOT NULL,
	"description" varchar(400) NOT NULL,
	"merchant_name" varchar(100),
	"purchase_date" date NOT NULL,
	"total_amount_minor" bigint NOT NULL,
	"installment_count" integer NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"request_fingerprint" varchar(64) NOT NULL,
	"status" varchar(9) DEFAULT 'ACTIVE' NOT NULL,
	"cancelled_at" timestamp with time zone,
	CONSTRAINT "card_purchase_owner_key_unique" UNIQUE("auth_user_id","idempotency_key"),
	CONSTRAINT "card_purchase_id_owner_card_unique" UNIQUE("id","auth_user_id","card_id"),
	CONSTRAINT "card_purchase_shape_check" CHECK ("app"."financial_card_purchases"."total_amount_minor" >= "app"."financial_card_purchases"."installment_count" and "app"."financial_card_purchases"."installment_count" between 1 and 60 and "app"."financial_card_purchases"."category_kind"='EXPENSE' and length(trim("app"."financial_card_purchases"."description"))>0 and (("app"."financial_card_purchases"."status"='ACTIVE' and "app"."financial_card_purchases"."cancelled_at" is null) or ("app"."financial_card_purchases"."status"='CANCELLED' and "app"."financial_card_purchases"."cancelled_at" is not null)))
);
--> statement-breakpoint
ALTER TABLE "app"."financial_card_purchases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."financial_credit_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"account_id" uuid NOT NULL,
	"currency" varchar(3) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"issuer_name" varchar(100),
	"brand" varchar(100),
	"last4" varchar(4),
	"credit_limit_minor" bigint,
	"tracking_start_date" date NOT NULL,
	"status" varchar(8) DEFAULT 'ACTIVE' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "card_account_unique" UNIQUE("account_id"),
	CONSTRAINT "card_id_owner_unique" UNIQUE("id","auth_user_id"),
	CONSTRAINT "card_id_owner_currency_unique" UNIQUE("id","auth_user_id","currency"),
	CONSTRAINT "card_shape_check" CHECK (length(trim("app"."financial_credit_cards"."display_name"))>0 and ("app"."financial_credit_cards"."last4" is null or "app"."financial_credit_cards"."last4" ~ '^[0-9]{4}$') and ("app"."financial_credit_cards"."credit_limit_minor" is null or "app"."financial_credit_cards"."credit_limit_minor">0) and (("app"."financial_credit_cards"."status"='ACTIVE' and "app"."financial_credit_cards"."archived_at" is null) or ("app"."financial_credit_cards"."status"='ARCHIVED' and "app"."financial_credit_cards"."archived_at" is not null)) and "app"."financial_credit_cards"."tracking_start_date" between date '1000-01-01' and date '9993-12-31')
);
--> statement-breakpoint
ALTER TABLE "app"."financial_credit_cards" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- Drizzle generates ALTER uniques after FKs; the referenced compound key must exist first.
ALTER TABLE "app"."financial_transactions" ADD CONSTRAINT "financial_transactions_id_owner_unique" UNIQUE("id","auth_user_id");--> statement-breakpoint
ALTER TABLE "app"."financial_card_billing_rules" ADD CONSTRAINT "card_rule_owner_fk" FOREIGN KEY ("card_id","auth_user_id") REFERENCES "app"."financial_credit_cards"("id","auth_user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."financial_card_installments" ADD CONSTRAINT "card_installment_purchase_owner_card_fk" FOREIGN KEY ("purchase_id","auth_user_id","card_id") REFERENCES "app"."financial_card_purchases"("id","auth_user_id","card_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."financial_card_installments" ADD CONSTRAINT "card_installment_transaction_owner_fk" FOREIGN KEY ("transaction_id","auth_user_id") REFERENCES "app"."financial_transactions"("id","auth_user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."financial_card_purchases" ADD CONSTRAINT "card_purchase_owner_currency_fk" FOREIGN KEY ("card_id","auth_user_id","currency") REFERENCES "app"."financial_credit_cards"("id","auth_user_id","currency") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."financial_card_purchases" ADD CONSTRAINT "card_purchase_category_owner_kind_fk" FOREIGN KEY ("category_id","auth_user_id","category_kind") REFERENCES "app"."financial_categories"("id","auth_user_id","kind") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."financial_credit_cards" ADD CONSTRAINT "card_account_owner_currency_fk" FOREIGN KEY ("account_id","auth_user_id","currency") REFERENCES "app"."financial_accounts"("id","auth_user_id","currency") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "card_rule_owner_date_idx" ON "app"."financial_card_billing_rules" USING btree ("auth_user_id","card_id","effective_from");--> statement-breakpoint
CREATE INDEX "card_installment_owner_date_idx" ON "app"."financial_card_installments" USING btree ("auth_user_id","card_id","scheduled_date");--> statement-breakpoint
CREATE INDEX "card_purchase_owner_date_idx" ON "app"."financial_card_purchases" USING btree ("auth_user_id","card_id","created_at","id");--> statement-breakpoint
CREATE INDEX "card_owner_idx" ON "app"."financial_credit_cards" USING btree ("auth_user_id");--> statement-breakpoint
CREATE POLICY "card_rule_select_own" ON "app"."financial_card_billing_rules" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "app"."financial_card_billing_rules"."auth_user_id");--> statement-breakpoint
CREATE POLICY "card_installment_select_own" ON "app"."financial_card_installments" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "app"."financial_card_installments"."auth_user_id");--> statement-breakpoint
CREATE POLICY "card_purchase_select_own" ON "app"."financial_card_purchases" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "app"."financial_card_purchases"."auth_user_id");--> statement-breakpoint
CREATE POLICY "card_select_own" ON "app"."financial_credit_cards" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "app"."financial_credit_cards"."auth_user_id");--> statement-breakpoint
CREATE POLICY "card_insert_own" ON "app"."financial_credit_cards" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "app"."financial_credit_cards"."auth_user_id");--> statement-breakpoint
CREATE POLICY "card_update_own" ON "app"."financial_credit_cards" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "app"."financial_credit_cards"."auth_user_id") WITH CHECK ((select auth.uid()) = "app"."financial_credit_cards"."auth_user_id");
--> statement-breakpoint
-- Invoker functions, private schema, pinned search_path; no new public grants.
CREATE FUNCTION app.card_account_integrity() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF TG_TABLE_NAME='financial_accounts' THEN
    IF NEW.type<>'credit' AND EXISTS(SELECT 1 FROM app.financial_credit_cards WHERE account_id=NEW.id) THEN
      RAISE EXCEPTION 'managed credit account type is immutable' USING ERRCODE='23514';
    END IF;
  ELSE
    IF TG_OP='UPDATE' AND (ROW(NEW.id,NEW.auth_user_id,NEW.account_id,NEW.currency,NEW.tracking_start_date,NEW.created_at) IS DISTINCT FROM ROW(OLD.id,OLD.auth_user_id,OLD.account_id,OLD.currency,OLD.tracking_start_date,OLD.created_at) OR (OLD.status='ARCHIVED' AND NEW.status<>'ARCHIVED')) THEN
      RAISE EXCEPTION 'card identity and archive are immutable' USING ERRCODE='23514';
    END IF;
    PERFORM 1 FROM app.financial_accounts WHERE id=NEW.account_id AND auth_user_id=NEW.auth_user_id AND currency=NEW.currency AND type='credit' AND (TG_OP='UPDATE' OR is_active) FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'invalid credit backing account' USING ERRCODE='23514'; END IF;
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER card_account_integrity BEFORE INSERT OR UPDATE ON app.financial_credit_cards FOR EACH ROW EXECUTE FUNCTION app.card_account_integrity();
--> statement-breakpoint
CREATE TRIGGER card_backing_type_integrity BEFORE UPDATE OF type ON app.financial_accounts FOR EACH ROW EXECUTE FUNCTION app.card_account_integrity();
--> statement-breakpoint
CREATE FUNCTION app.card_rule_integrity() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  PERFORM 1 FROM app.financial_credit_cards WHERE id=NEW.card_id AND auth_user_id=NEW.auth_user_id AND status='ACTIVE' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'active card required' USING ERRCODE='23514'; END IF;
  IF TG_OP='UPDATE' AND (ROW(NEW.id,NEW.auth_user_id,NEW.card_id,NEW.effective_from,NEW.closing_day,NEW.due_day,NEW.created_at) IS DISTINCT FROM ROW(OLD.id,OLD.auth_user_id,OLD.card_id,OLD.effective_from,OLD.closing_day,OLD.due_day,OLD.created_at) OR OLD.effective_to IS NOT NULL OR NEW.effective_to IS NULL) THEN
    RAISE EXCEPTION 'historical billing rule is immutable' USING ERRCODE='23514';
  END IF;
  IF EXISTS(SELECT 1 FROM app.financial_card_billing_rules r WHERE r.card_id=NEW.card_id AND r.id<>NEW.id AND daterange(r.effective_from,r.effective_to,'[)') && daterange(NEW.effective_from,NEW.effective_to,'[)')) THEN
    RAISE EXCEPTION 'billing rules overlap' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER card_rule_integrity BEFORE INSERT OR UPDATE ON app.financial_card_billing_rules FOR EACH ROW EXECUTE FUNCTION app.card_rule_integrity();
--> statement-breakpoint
CREATE FUNCTION app.card_purchase_immutable() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF ROW(NEW.id,NEW.auth_user_id,NEW.card_id,NEW.currency,NEW.category_id,NEW.category_kind,NEW.purchase_date,NEW.total_amount_minor,NEW.installment_count,NEW.idempotency_key,NEW.request_fingerprint,NEW.created_at) IS DISTINCT FROM ROW(OLD.id,OLD.auth_user_id,OLD.card_id,OLD.currency,OLD.category_id,OLD.category_kind,OLD.purchase_date,OLD.total_amount_minor,OLD.installment_count,OLD.idempotency_key,OLD.request_fingerprint,OLD.created_at) OR (OLD.status='CANCELLED' AND NEW IS DISTINCT FROM OLD) THEN
    RAISE EXCEPTION 'purchase ledger fields are immutable' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER card_purchase_immutable BEFORE UPDATE ON app.financial_card_purchases FOR EACH ROW EXECUTE FUNCTION app.card_purchase_immutable();
--> statement-breakpoint
CREATE FUNCTION app.card_installment_immutable() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'installment ledger is immutable' USING ERRCODE='23514';
END $$;
--> statement-breakpoint
CREATE TRIGGER card_installment_immutable BEFORE UPDATE ON app.financial_card_installments FOR EACH ROW EXECUTE FUNCTION app.card_installment_immutable();
--> statement-breakpoint
CREATE FUNCTION app.card_purchase_complete() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE target uuid; p app.financial_card_purchases%ROWTYPE; n bigint; total numeric;
BEGIN
  IF TG_TABLE_NAME='financial_card_purchases' THEN target:=NEW.id;
  ELSIF TG_TABLE_NAME='financial_card_installments' THEN target:=NEW.purchase_id;
  ELSE SELECT purchase_id INTO target FROM app.financial_card_installments WHERE transaction_id=NEW.id; END IF;
  IF target IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO p FROM app.financial_card_purchases WHERE id=target;
  SELECT count(*),sum(amount_minor::numeric) INTO n,total FROM app.financial_card_installments WHERE purchase_id=target;
  IF n<>p.installment_count OR total<>p.total_amount_minor OR EXISTS(
    SELECT 1 FROM app.financial_card_installments i
    JOIN app.financial_transactions t ON t.id=i.transaction_id
    JOIN app.financial_credit_cards c ON c.id=i.card_id
    WHERE i.purchase_id=target AND (i.installment_number>p.installment_count OR t.auth_user_id<>p.auth_user_id OR t.account_id<>c.account_id OR t.currency<>p.currency OR t.category_id IS DISTINCT FROM p.category_id OR t.type<>'EXPENSE' OR t.amount_minor<>i.amount_minor OR t.is_cancelled<>(p.status='CANCELLED') OR i.scheduled_date<>(p.purchase_date + (i.installment_number-1)*interval '1 month')::date)
  ) THEN RAISE EXCEPTION 'purchase installments and ledger must agree' USING ERRCODE='23514'; END IF;
  RETURN NULL;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER card_purchase_complete AFTER INSERT OR UPDATE ON app.financial_card_purchases DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.card_purchase_complete();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER card_installment_complete AFTER INSERT ON app.financial_card_installments DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.card_purchase_complete();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER card_transaction_complete AFTER UPDATE ON app.financial_transactions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.card_purchase_complete();
--> statement-breakpoint
REVOKE ALL ON FUNCTION app.card_account_integrity(), app.card_rule_integrity(), app.card_purchase_immutable(), app.card_installment_immutable(), app.card_purchase_complete() FROM PUBLIC;

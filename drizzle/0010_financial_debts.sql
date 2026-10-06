CREATE TABLE "app"."financial_debt_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"debt_id" uuid NOT NULL,
	"source_account_id" uuid NOT NULL,
	"currency" varchar(3) NOT NULL,
	"principal_amount_minor" bigint NOT NULL,
	"interest_amount_minor" bigint NOT NULL,
	"fee_amount_minor" bigint NOT NULL,
	"remaining_principal_minor" bigint NOT NULL,
	"transfer_id" uuid,
	"interest_transaction_id" uuid,
	"fee_transaction_id" uuid,
	"paid_at" timestamp with time zone NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"request_fingerprint" varchar(64) NOT NULL,
	"status" varchar(9) DEFAULT 'ACTIVE' NOT NULL,
	"cancelled_at" timestamp with time zone,
	CONSTRAINT "debt_payment_owner_key" UNIQUE("auth_user_id","idempotency_key"),
	CONSTRAINT "debt_payment_transfer_unique" UNIQUE("transfer_id"),
	CONSTRAINT "debt_payment_interest_unique" UNIQUE("interest_transaction_id"),
	CONSTRAINT "debt_payment_fee_unique" UNIQUE("fee_transaction_id"),
	CONSTRAINT "debt_payment_shape_check" CHECK ("app"."financial_debt_payments"."principal_amount_minor">=0 and "app"."financial_debt_payments"."interest_amount_minor">=0 and "app"."financial_debt_payments"."fee_amount_minor">=0 and "app"."financial_debt_payments"."principal_amount_minor"::numeric+"app"."financial_debt_payments"."interest_amount_minor"+"app"."financial_debt_payments"."fee_amount_minor">0 and "app"."financial_debt_payments"."remaining_principal_minor">=0 and ("app"."financial_debt_payments"."principal_amount_minor">0)=("app"."financial_debt_payments"."transfer_id" is not null) and ("app"."financial_debt_payments"."interest_amount_minor">0)=("app"."financial_debt_payments"."interest_transaction_id" is not null) and ("app"."financial_debt_payments"."fee_amount_minor">0)=("app"."financial_debt_payments"."fee_transaction_id" is not null) and (("app"."financial_debt_payments"."status"='ACTIVE' and "app"."financial_debt_payments"."cancelled_at" is null) or ("app"."financial_debt_payments"."status"='CANCELLED' and "app"."financial_debt_payments"."cancelled_at" is not null)))
);
--> statement-breakpoint
ALTER TABLE "app"."financial_debt_payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."financial_debt_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"debt_id" uuid NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"rate" numeric(11, 10) NOT NULL,
	"rate_period" varchar(20) NOT NULL,
	"minimum_payment_minor" bigint NOT NULL,
	"due_day" integer NOT NULL,
	CONSTRAINT "debt_term_start_key" UNIQUE("debt_id","effective_from"),
	CONSTRAINT "debt_term_shape_check" CHECK ("app"."financial_debt_terms"."rate" between 0 and 1 and "app"."financial_debt_terms"."rate_period" in ('EFFECTIVE_ANNUAL','EFFECTIVE_MONTHLY') and "app"."financial_debt_terms"."minimum_payment_minor">0 and "app"."financial_debt_terms"."due_day" between 1 and 31 and ("app"."financial_debt_terms"."effective_to" is null or "app"."financial_debt_terms"."effective_to">"app"."financial_debt_terms"."effective_from"))
);
--> statement-breakpoint
ALTER TABLE "app"."financial_debt_terms" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."financial_debts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"account_id" uuid NOT NULL,
	"account_type" varchar(20) DEFAULT 'debt' NOT NULL,
	"currency" varchar(3) NOT NULL,
	"name" varchar(100) NOT NULL,
	"lender" varchar(100),
	"debt_type" varchar(25) NOT NULL,
	"tracking_start_date" date NOT NULL,
	"status" varchar(8) DEFAULT 'ACTIVE' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_off_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	CONSTRAINT "debt_account_unique" UNIQUE("account_id"),
	CONSTRAINT "debt_id_owner_key" UNIQUE("id","auth_user_id"),
	CONSTRAINT "debt_id_owner_currency_key" UNIQUE("id","auth_user_id","currency"),
	CONSTRAINT "debt_shape_check" CHECK ("app"."financial_debts"."account_type"='debt' and length(trim("app"."financial_debts"."name"))>0 and "app"."financial_debts"."debt_type" in ('PERSONAL_LOAN','MORTGAGE','VEHICLE_FINANCING','CONSUMER_FINANCING','STUDENT','MEDICAL','TAX','OTHER') and "app"."financial_debts"."tracking_start_date" between date '1000-01-01' and date '9998-12-31' and (("app"."financial_debts"."status"='ACTIVE' and "app"."financial_debts"."paid_off_at" is null and "app"."financial_debts"."archived_at" is null) or ("app"."financial_debts"."status"='PAID_OFF' and "app"."financial_debts"."paid_off_at" is not null and "app"."financial_debts"."archived_at" is null) or ("app"."financial_debts"."status"='ARCHIVED' and "app"."financial_debts"."paid_off_at" is not null and "app"."financial_debts"."archived_at" is not null)))
);
--> statement-breakpoint
ALTER TABLE "app"."financial_debts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."financial_accounts" DROP CONSTRAINT "financial_accounts_type_check";--> statement-breakpoint
ALTER TABLE "app"."financial_accounts" ADD CONSTRAINT "financial_accounts_owner_currency_type_key" UNIQUE("id","auth_user_id","currency","type");--> statement-breakpoint
ALTER TABLE "app"."financial_transfers" ADD CONSTRAINT "financial_transfers_id_owner_key" UNIQUE("id","auth_user_id");--> statement-breakpoint
ALTER TABLE "app"."financial_debt_payments" ADD CONSTRAINT "debt_payment_owner_currency_fk" FOREIGN KEY ("debt_id","auth_user_id","currency") REFERENCES "app"."financial_debts"("id","auth_user_id","currency") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."financial_debt_payments" ADD CONSTRAINT "debt_payment_source_owner_currency_fk" FOREIGN KEY ("source_account_id","auth_user_id","currency") REFERENCES "app"."financial_accounts"("id","auth_user_id","currency") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."financial_debt_payments" ADD CONSTRAINT "debt_payment_transfer_owner_fk" FOREIGN KEY ("transfer_id","auth_user_id") REFERENCES "app"."financial_transfers"("id","auth_user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."financial_debt_payments" ADD CONSTRAINT "debt_payment_interest_owner_fk" FOREIGN KEY ("interest_transaction_id","auth_user_id") REFERENCES "app"."financial_transactions"("id","auth_user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."financial_debt_payments" ADD CONSTRAINT "debt_payment_fee_owner_fk" FOREIGN KEY ("fee_transaction_id","auth_user_id") REFERENCES "app"."financial_transactions"("id","auth_user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."financial_debt_terms" ADD CONSTRAINT "debt_term_owner_fk" FOREIGN KEY ("debt_id","auth_user_id") REFERENCES "app"."financial_debts"("id","auth_user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."financial_debts" ADD CONSTRAINT "debt_account_owner_currency_type_fk" FOREIGN KEY ("account_id","auth_user_id","currency","account_type") REFERENCES "app"."financial_accounts"("id","auth_user_id","currency","type") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "debt_payment_owner_date_idx" ON "app"."financial_debt_payments" USING btree ("auth_user_id","debt_id","created_at","id");--> statement-breakpoint
CREATE INDEX "debt_term_owner_date_idx" ON "app"."financial_debt_terms" USING btree ("auth_user_id","debt_id","effective_from");--> statement-breakpoint
CREATE INDEX "debt_owner_idx" ON "app"."financial_debts" USING btree ("auth_user_id");--> statement-breakpoint


ALTER TABLE "app"."financial_accounts" ADD CONSTRAINT "financial_accounts_type_check" CHECK ("app"."financial_accounts"."type" in ('checking','savings','cash','credit','investment','other','debt'));--> statement-breakpoint
CREATE POLICY "debt_payment_select_own" ON "app"."financial_debt_payments" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid())="app"."financial_debt_payments"."auth_user_id");--> statement-breakpoint
CREATE POLICY "debt_term_select_own" ON "app"."financial_debt_terms" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid())="app"."financial_debt_terms"."auth_user_id");--> statement-breakpoint
CREATE POLICY "debt_select_own" ON "app"."financial_debts" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid())="app"."financial_debts"."auth_user_id");
--> statement-breakpoint
-- Controlled version closure: immutable terms, serial parent lock, no overlap.
CREATE FUNCTION app.debt_term_integrity() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  PERFORM 1 FROM app.financial_debts WHERE id=NEW.debt_id AND auth_user_id=NEW.auth_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'debt required' USING ERRCODE='23514'; END IF;
  IF TG_OP='UPDATE' AND (ROW(NEW.id,NEW.auth_user_id,NEW.debt_id,NEW.effective_from,NEW.rate,NEW.rate_period,NEW.minimum_payment_minor,NEW.due_day,NEW.created_at) IS DISTINCT FROM ROW(OLD.id,OLD.auth_user_id,OLD.debt_id,OLD.effective_from,OLD.rate,OLD.rate_period,OLD.minimum_payment_minor,OLD.due_day,OLD.created_at) OR OLD.effective_to IS NOT NULL OR NEW.effective_to IS NULL) THEN
    RAISE EXCEPTION 'historical debt terms are immutable' USING ERRCODE='23514';
  END IF;
  IF EXISTS(SELECT 1 FROM app.financial_debt_terms t WHERE t.debt_id=NEW.debt_id AND t.id<>NEW.id AND daterange(t.effective_from,t.effective_to,'[)') && daterange(NEW.effective_from,NEW.effective_to,'[)')) THEN
    RAISE EXCEPTION 'debt terms overlap' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER debt_term_integrity BEFORE INSERT OR UPDATE ON app.financial_debt_terms FOR EACH ROW EXECUTE FUNCTION app.debt_term_integrity();
--> statement-breakpoint
CREATE FUNCTION app.debt_identity_integrity() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF TG_TABLE_NAME='financial_accounts' THEN
    IF EXISTS(SELECT 1 FROM app.financial_debts WHERE account_id=OLD.id) AND ROW(NEW.id,NEW.auth_user_id,NEW.type,NEW.currency,NEW.initial_balance_minor,NEW.is_active) IS DISTINCT FROM ROW(OLD.id,OLD.auth_user_id,OLD.type,OLD.currency,OLD.initial_balance_minor,OLD.is_active) THEN
      RAISE EXCEPTION 'debt backing account is immutable' USING ERRCODE='23514';
    END IF;
  ELSE
    IF ROW(NEW.id,NEW.auth_user_id,NEW.account_id,NEW.account_type,NEW.currency,NEW.tracking_start_date,NEW.created_at) IS DISTINCT FROM ROW(OLD.id,OLD.auth_user_id,OLD.account_id,OLD.account_type,OLD.currency,OLD.tracking_start_date,OLD.created_at) OR (OLD.status='ARCHIVED' AND NEW IS DISTINCT FROM OLD) THEN
      RAISE EXCEPTION 'debt identity and archive are immutable' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER debt_identity_integrity BEFORE UPDATE ON app.financial_debts FOR EACH ROW EXECUTE FUNCTION app.debt_identity_integrity();
--> statement-breakpoint
CREATE TRIGGER debt_backing_integrity BEFORE UPDATE ON app.financial_accounts FOR EACH ROW EXECUTE FUNCTION app.debt_identity_integrity();
--> statement-breakpoint
CREATE FUNCTION app.debt_payment_immutable() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF ROW(NEW.id,NEW.auth_user_id,NEW.debt_id,NEW.source_account_id,NEW.currency,NEW.principal_amount_minor,NEW.interest_amount_minor,NEW.fee_amount_minor,NEW.remaining_principal_minor,NEW.transfer_id,NEW.interest_transaction_id,NEW.fee_transaction_id,NEW.paid_at,NEW.idempotency_key,NEW.request_fingerprint,NEW.created_at) IS DISTINCT FROM ROW(OLD.id,OLD.auth_user_id,OLD.debt_id,OLD.source_account_id,OLD.currency,OLD.principal_amount_minor,OLD.interest_amount_minor,OLD.fee_amount_minor,OLD.remaining_principal_minor,OLD.transfer_id,OLD.interest_transaction_id,OLD.fee_transaction_id,OLD.paid_at,OLD.idempotency_key,OLD.request_fingerprint,OLD.created_at) OR OLD.status='CANCELLED' THEN
    RAISE EXCEPTION 'debt payment is immutable' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER debt_payment_immutable BEFORE UPDATE ON app.financial_debt_payments FOR EACH ROW EXECUTE FUNCTION app.debt_payment_immutable();
--> statement-breakpoint
-- Deferred checks permit atomic materialization/cancellation, while refusing
-- generic managed-account writes and any mismatch between cost and ledger.
CREATE FUNCTION app.debt_payment_complete() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE target uuid; p app.financial_debt_payments%ROWTYPE; d app.financial_debts%ROWTYPE;
BEGIN
  IF TG_TABLE_NAME='financial_debt_payments' THEN target:=NEW.id;
  ELSIF TG_TABLE_NAME='financial_transfers' THEN
    SELECT id INTO target FROM app.financial_debt_payments WHERE transfer_id=NEW.id;
    IF target IS NULL AND EXISTS(SELECT 1 FROM app.financial_debts WHERE account_id IN (NEW.source_account_id,NEW.destination_account_id)) THEN RAISE EXCEPTION 'managed debt requires payment' USING ERRCODE='23514'; END IF;
  ELSE
    SELECT id INTO target FROM app.financial_debt_payments WHERE interest_transaction_id=NEW.id OR fee_transaction_id=NEW.id;
    IF target IS NULL AND EXISTS(SELECT 1 FROM app.financial_debts WHERE account_id=NEW.account_id) THEN RAISE EXCEPTION 'managed debt requires principal transfer' USING ERRCODE='23514'; END IF;
  END IF;
  IF target IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO p FROM app.financial_debt_payments WHERE id=target;
  SELECT * INTO d FROM app.financial_debts WHERE id=p.debt_id;
  IF (p.transfer_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM app.financial_transfers t WHERE t.id=p.transfer_id AND t.auth_user_id=p.auth_user_id AND t.currency=p.currency AND t.source_account_id=p.source_account_id AND t.destination_account_id=d.account_id AND t.amount_minor=p.principal_amount_minor AND t.occurred_at=p.paid_at AND t.is_cancelled=(p.status='CANCELLED')))
    OR (p.interest_transaction_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM app.financial_transactions t WHERE t.id=p.interest_transaction_id AND t.auth_user_id=p.auth_user_id AND t.currency=p.currency AND t.account_id=p.source_account_id AND t.type='EXPENSE' AND t.amount_minor=p.interest_amount_minor AND t.occurred_at=p.paid_at AND t.is_cancelled=(p.status='CANCELLED')))
    OR (p.fee_transaction_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM app.financial_transactions t WHERE t.id=p.fee_transaction_id AND t.auth_user_id=p.auth_user_id AND t.currency=p.currency AND t.account_id=p.source_account_id AND t.type='EXPENSE' AND t.amount_minor=p.fee_amount_minor AND t.occurred_at=p.paid_at AND t.is_cancelled=(p.status='CANCELLED'))) THEN
    RAISE EXCEPTION 'debt payment and ledger must agree' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER debt_payment_complete AFTER INSERT OR UPDATE ON app.financial_debt_payments DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.debt_payment_complete();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER debt_transfer_complete AFTER INSERT OR UPDATE ON app.financial_transfers DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.debt_payment_complete();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER debt_transaction_complete AFTER INSERT OR UPDATE ON app.financial_transactions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.debt_payment_complete();
--> statement-breakpoint
REVOKE ALL ON FUNCTION app.debt_term_integrity(),app.debt_identity_integrity(),app.debt_payment_immutable(),app.debt_payment_complete() FROM PUBLIC;

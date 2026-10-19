CREATE TABLE "app"."financial_evidence_origins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"evidence_id" uuid NOT NULL,
	"batch_id" uuid NOT NULL,
	"row_number" integer NOT NULL,
	CONSTRAINT "evidence_origin_batch_row_key" UNIQUE("auth_user_id","batch_id","row_number"),
	CONSTRAINT "evidence_origin_row_check" CHECK ("app"."financial_evidence_origins"."row_number" between 1 and 1000)
);
--> statement-breakpoint
ALTER TABLE "app"."financial_evidence_origins" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."financial_reconciliations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"evidence_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"date_acknowledged" boolean NOT NULL,
	"transaction_fingerprint" varchar(64) NOT NULL,
	"reversed_at" timestamp with time zone,
	"reversal_key" uuid,
	CONSTRAINT "reconciliation_command_key" UNIQUE("auth_user_id","idempotency_key"),
	CONSTRAINT "reconciliation_reversal_key" UNIQUE("auth_user_id","reversal_key"),
	CONSTRAINT "reconciliation_reversal_shape" CHECK (("app"."financial_reconciliations"."reversed_at" is null and "app"."financial_reconciliations"."reversal_key" is null) or ("app"."financial_reconciliations"."reversed_at" is not null and "app"."financial_reconciliations"."reversed_at">="app"."financial_reconciliations"."created_at" and "app"."financial_reconciliations"."reversal_key" is not null)),
	CONSTRAINT "reconciliation_fingerprint_shape" CHECK ("app"."financial_reconciliations"."transaction_fingerprint" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
ALTER TABLE "app"."financial_reconciliations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."financial_statement_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"account_id" uuid NOT NULL,
	"currency" varchar(3) NOT NULL,
	"type" varchar(7) NOT NULL,
	"amount_minor" bigint NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"description" varchar(500) NOT NULL,
	"fingerprint" varchar(64) NOT NULL,
	"source_key" varchar(70) NOT NULL,
	CONSTRAINT "statement_evidence_id_owner_key" UNIQUE("id","auth_user_id"),
	CONSTRAINT "statement_evidence_source_key" UNIQUE("auth_user_id","source_key"),
	CONSTRAINT "statement_evidence_shape" CHECK ("app"."financial_statement_evidence"."amount_minor">0 and "app"."financial_statement_evidence"."type" in ('INCOME','EXPENSE') and length(trim("app"."financial_statement_evidence"."description"))>0 and "app"."financial_statement_evidence"."fingerprint" ~ '^[0-9a-f]{64}$' and "app"."financial_statement_evidence"."source_key" ~ '^(file|id):[0-9a-f]{64}$')
);
--> statement-breakpoint
ALTER TABLE "app"."financial_statement_evidence" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."financial_evidence_origins" ADD CONSTRAINT "evidence_origin_evidence_owner_fk" FOREIGN KEY ("evidence_id","auth_user_id") REFERENCES "app"."financial_statement_evidence"("id","auth_user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."financial_evidence_origins" ADD CONSTRAINT "evidence_origin_batch_owner_fk" FOREIGN KEY ("batch_id","auth_user_id") REFERENCES "app"."financial_import_batches"("id","auth_user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."financial_reconciliations" ADD CONSTRAINT "reconciliation_evidence_owner_fk" FOREIGN KEY ("evidence_id","auth_user_id") REFERENCES "app"."financial_statement_evidence"("id","auth_user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."financial_reconciliations" ADD CONSTRAINT "reconciliation_transaction_owner_fk" FOREIGN KEY ("transaction_id","auth_user_id") REFERENCES "app"."financial_transactions"("id","auth_user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."financial_statement_evidence" ADD CONSTRAINT "statement_evidence_account_owner_fk" FOREIGN KEY ("account_id","auth_user_id","currency") REFERENCES "app"."financial_accounts"("id","auth_user_id","currency") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "evidence_origin_evidence_owner_idx" ON "app"."financial_evidence_origins" USING btree ("evidence_id","auth_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reconciliation_active_evidence_key" ON "app"."financial_reconciliations" USING btree ("auth_user_id","evidence_id") WHERE "app"."financial_reconciliations"."reversed_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "reconciliation_active_transaction_key" ON "app"."financial_reconciliations" USING btree ("auth_user_id","transaction_id") WHERE "app"."financial_reconciliations"."reversed_at" is null;--> statement-breakpoint
CREATE INDEX "reconciliation_evidence_owner_idx" ON "app"."financial_reconciliations" USING btree ("evidence_id","auth_user_id");--> statement-breakpoint
CREATE INDEX "reconciliation_transaction_owner_idx" ON "app"."financial_reconciliations" USING btree ("transaction_id","auth_user_id");--> statement-breakpoint
CREATE INDEX "reconciliation_owner_created_idx" ON "app"."financial_reconciliations" USING btree ("auth_user_id","created_at","id");--> statement-breakpoint
CREATE INDEX "statement_evidence_owner_account_date_idx" ON "app"."financial_statement_evidence" USING btree ("auth_user_id","account_id","occurred_at","id");--> statement-breakpoint
CREATE POLICY "evidence_origin_select_own" ON "app"."financial_evidence_origins" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid())="app"."financial_evidence_origins"."auth_user_id");--> statement-breakpoint
CREATE POLICY "reconciliation_select_own" ON "app"."financial_reconciliations" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid())="app"."financial_reconciliations"."auth_user_id");--> statement-breakpoint
CREATE POLICY "statement_evidence_select_own" ON "app"."financial_statement_evidence" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid())="app"."financial_statement_evidence"."auth_user_id");
--> statement-breakpoint
REVOKE ALL ON app.financial_statement_evidence, app.financial_evidence_origins, app.financial_reconciliations FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
CREATE FUNCTION app.reconciliation_history_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
DECLARE e app.financial_statement_evidence%ROWTYPE; t app.financial_transactions%ROWTYPE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Reconciliation history is retained' USING ERRCODE='23514';
  END IF;
  IF TG_TABLE_NAME <> 'financial_reconciliations' THEN
    RAISE EXCEPTION 'Statement evidence and origins are immutable' USING ERRCODE='23514';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF (pg_catalog.to_jsonb(NEW)-'reversed_at'-'reversal_key') IS DISTINCT FROM (pg_catalog.to_jsonb(OLD)-'reversed_at'-'reversal_key')
      OR OLD.reversed_at IS NOT NULL OR NEW.reversed_at IS NULL OR NEW.reversal_key IS NULL THEN
      RAISE EXCEPTION 'Only one-way reconciliation reversal is allowed' USING ERRCODE='23514';
    END IF;
    RETURN NEW;
  END IF;
  SELECT * INTO e FROM app.financial_statement_evidence WHERE id=NEW.evidence_id AND auth_user_id=NEW.auth_user_id;
  SELECT * INTO t FROM app.financial_transactions WHERE id=NEW.transaction_id AND auth_user_id=NEW.auth_user_id FOR SHARE;
  IF e.id IS NULL OR t.id IS NULL OR t.is_cancelled OR e.account_id<>t.account_id OR e.currency<>t.currency
    OR e.type<>t.type OR e.amount_minor<>t.amount_minor OR pg_catalog.abs(pg_catalog.date_part('epoch',e.occurred_at-t.occurred_at))>2678400
    OR NEW.reversed_at IS NOT NULL OR NEW.reversal_key IS NOT NULL
    OR (e.occurred_at<>t.occurred_at AND NOT NEW.date_acknowledged) THEN
    RAISE EXCEPTION 'Incompatible reconciliation' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$function$;
--> statement-breakpoint
CREATE TRIGGER statement_evidence_immutable BEFORE UPDATE OR DELETE ON app.financial_statement_evidence
FOR EACH ROW EXECUTE FUNCTION app.reconciliation_history_guard();
--> statement-breakpoint
CREATE TRIGGER evidence_origins_immutable BEFORE UPDATE OR DELETE ON app.financial_evidence_origins
FOR EACH ROW EXECUTE FUNCTION app.reconciliation_history_guard();
--> statement-breakpoint
CREATE TRIGGER reconciliation_history_guard BEFORE INSERT OR UPDATE OR DELETE ON app.financial_reconciliations
FOR EACH ROW EXECUTE FUNCTION app.reconciliation_history_guard();
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION app.reconciliation_history_guard() FROM PUBLIC, anon, authenticated;

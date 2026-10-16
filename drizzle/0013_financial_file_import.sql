CREATE TABLE "app"."financial_import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"file_hash" varchar(64) NOT NULL,
	"file_name" varchar(120) NOT NULL,
	"format" varchar(3) NOT NULL,
	"file_size" integer NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"row_count" integer NOT NULL,
	"parser_options" jsonb NOT NULL,
	"parsed" jsonb,
	"parsed_bytes" integer DEFAULT 0 NOT NULL,
	"issues" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"account_hint" varchar(8),
	"mapping" jsonb,
	"account_id" uuid,
	"currency" varchar(3),
	"time_zone" varchar(100) DEFAULT 'UTC' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "import_batch_id_owner_key" UNIQUE("id","auth_user_id"),
	CONSTRAINT "import_batch_owner_key" UNIQUE("auth_user_id","idempotency_key"),
	CONSTRAINT "import_batch_owner_hash_key" UNIQUE("auth_user_id","file_hash"),
	CONSTRAINT "import_batch_shape_check" CHECK ("app"."financial_import_batches"."file_hash" ~ '^[0-9a-f]{64}$' and "app"."financial_import_batches"."format" in ('CSV','OFX','PDF') and "app"."financial_import_batches"."file_size" between 1 and 2097152 and "app"."financial_import_batches"."row_count" between 0 and 1000 and "app"."financial_import_batches"."version">0 and "app"."financial_import_batches"."parsed_bytes" between 0 and 4194304 and (("app"."financial_import_batches"."mapping" is null and "app"."financial_import_batches"."account_id" is null and "app"."financial_import_batches"."currency" is null) or ("app"."financial_import_batches"."mapping" is not null and "app"."financial_import_batches"."account_id" is not null and "app"."financial_import_batches"."currency" is not null and "app"."financial_import_batches"."mapping"->>'accountId'="app"."financial_import_batches"."account_id"::text)))
);
--> statement-breakpoint
ALTER TABLE "app"."financial_import_batches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."financial_import_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"batch_id" uuid NOT NULL,
	"row_number" integer NOT NULL,
	"candidate_id" uuid NOT NULL,
	"fingerprint" varchar(64) NOT NULL,
	"external_id" varchar(160),
	"source_identity" varchar(64),
	"matched_receipt_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "import_row_id_owner_key" UNIQUE("id","auth_user_id"),
	CONSTRAINT "import_row_batch_number_key" UNIQUE("batch_id","auth_user_id","row_number"),
	CONSTRAINT "import_row_external_key" UNIQUE("auth_user_id","source_identity"),
	CONSTRAINT "import_row_shape_check" CHECK ("app"."financial_import_rows"."row_number" between 1 and 1000 and "app"."financial_import_rows"."fingerprint" ~ '^[0-9a-f]{64}$' and ("app"."financial_import_rows"."source_identity" is null or "app"."financial_import_rows"."source_identity" ~ '^[0-9a-f]{64}$') and ("app"."financial_import_rows"."matched_receipt_id" is null or "app"."financial_import_rows"."source_identity" is null))
);
--> statement-breakpoint
ALTER TABLE "app"."financial_import_rows" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."financial_inbox_candidates" DROP CONSTRAINT "inbox_shape_check";--> statement-breakpoint
ALTER TABLE "app"."financial_inbox_candidates" ADD CONSTRAINT "inbox_id_owner_key" UNIQUE("id","auth_user_id");--> statement-breakpoint
ALTER TABLE "app"."financial_import_batches" ADD CONSTRAINT "import_batch_account_owner_fk" FOREIGN KEY ("account_id","auth_user_id","currency") REFERENCES "app"."financial_accounts"("id","auth_user_id","currency") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."financial_import_rows" ADD CONSTRAINT "import_row_batch_owner_fk" FOREIGN KEY ("batch_id","auth_user_id") REFERENCES "app"."financial_import_batches"("id","auth_user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."financial_import_rows" ADD CONSTRAINT "import_row_candidate_owner_fk" FOREIGN KEY ("candidate_id","auth_user_id") REFERENCES "app"."financial_inbox_candidates"("id","auth_user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."financial_import_rows" ADD CONSTRAINT "import_row_match_owner_fk" FOREIGN KEY ("matched_receipt_id","auth_user_id") REFERENCES "app"."financial_import_rows"("id","auth_user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "import_batch_owner_created_idx" ON "app"."financial_import_batches" USING btree ("auth_user_id","created_at","id");--> statement-breakpoint
CREATE INDEX "import_batch_account_idx" ON "app"."financial_import_batches" USING btree ("account_id","auth_user_id","currency");--> statement-breakpoint
CREATE INDEX "import_row_candidate_idx" ON "app"."financial_import_rows" USING btree ("candidate_id","auth_user_id");--> statement-breakpoint
CREATE INDEX "import_row_match_idx" ON "app"."financial_import_rows" USING btree ("matched_receipt_id","auth_user_id");--> statement-breakpoint
ALTER TABLE "app"."financial_inbox_candidates" ADD CONSTRAINT "inbox_shape_check" CHECK ("app"."financial_inbox_candidates"."source" in ('MANUAL','FILE_CSV','FILE_OFX','FILE_PDF') and "app"."financial_inbox_candidates"."type" in ('INCOME','EXPENSE') and "app"."financial_inbox_candidates"."currency" in ('BRL','USD','EUR','GBP','CAD','AUD','CHF','JPY','CLP','KRW','KWD','BHD') and "app"."financial_inbox_candidates"."version">0 and length(trim("app"."financial_inbox_candidates"."description"))>0 and ("app"."financial_inbox_candidates"."amount_minor" is null or "app"."financial_inbox_candidates"."amount_minor">0) and "app"."financial_inbox_candidates"."creation_fingerprint" ~ '^[0-9a-f]{64}$');--> statement-breakpoint
CREATE POLICY "import_batch_select_own" ON "app"."financial_import_batches" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid())="app"."financial_import_batches"."auth_user_id");--> statement-breakpoint
CREATE POLICY "import_row_select_own" ON "app"."financial_import_rows" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid())="app"."financial_import_rows"."auth_user_id");
--> statement-breakpoint
REVOKE ALL ON app.financial_import_batches, app.financial_import_rows FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
CREATE FUNCTION app.import_history_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
DECLARE field text;
BEGIN
  IF TG_OP = 'DELETE' OR TG_TABLE_NAME = 'financial_import_rows' THEN
    RAISE EXCEPTION 'Import receipts and history are retained' USING ERRCODE = '23514';
  END IF;
  IF NEW.version <> OLD.version + 1 THEN
    RAISE EXCEPTION 'Import version must advance' USING ERRCODE = '23514';
  END IF;
  FOREACH field IN ARRAY ARRAY['id','auth_user_id','idempotency_key','file_hash','file_name','format','file_size','created_at'] LOOP
    IF (pg_catalog.to_jsonb(NEW)->field) IS DISTINCT FROM (pg_catalog.to_jsonb(OLD)->field) THEN
      RAISE EXCEPTION 'Import identity is immutable' USING ERRCODE = '23514';
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM app.financial_import_rows r WHERE r.batch_id=OLD.id AND r.auth_user_id=OLD.auth_user_id) THEN
    FOREACH field IN ARRAY ARRAY['mapping','account_id','currency','time_zone','parser_options','row_count','account_hint'] LOOP
      IF (pg_catalog.to_jsonb(NEW)->field) IS DISTINCT FROM (pg_catalog.to_jsonb(OLD)->field) THEN
        RAISE EXCEPTION 'Imported interpretation is immutable' USING ERRCODE = '23514';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;
--> statement-breakpoint
CREATE TRIGGER import_batch_history_guard BEFORE UPDATE OR DELETE ON app.financial_import_batches
FOR EACH ROW EXECUTE FUNCTION app.import_history_guard();
--> statement-breakpoint
CREATE TRIGGER import_row_history_guard BEFORE UPDATE OR DELETE ON app.financial_import_rows
FOR EACH ROW EXECUTE FUNCTION app.import_history_guard();
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION app.import_history_guard() FROM PUBLIC, anon, authenticated;

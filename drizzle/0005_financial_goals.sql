CREATE TABLE "app"."financial_goal_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"goal_id" uuid NOT NULL,
	"type" varchar(12) NOT NULL,
	"amount_minor" bigint NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"note" varchar(1000),
	"idempotency_key" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_goal_events_owner_idempotency_key" UNIQUE("auth_user_id","idempotency_key"),
	CONSTRAINT "financial_goal_events_amount_check" CHECK ("app"."financial_goal_events"."amount_minor" > 0),
	CONSTRAINT "financial_goal_events_type_check" CHECK ("app"."financial_goal_events"."type" in ('CONTRIBUTION','WITHDRAWAL'))
);
--> statement-breakpoint
ALTER TABLE "app"."financial_goal_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."financial_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(1000),
	"currency" varchar(3) NOT NULL,
	"target_amount_minor" bigint NOT NULL,
	"target_month" varchar(7),
	"planned_monthly_minor" bigint,
	"priority" varchar(6) NOT NULL,
	"status" varchar(8) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "financial_goals_owner_key" UNIQUE("id","auth_user_id"),
	CONSTRAINT "financial_goals_name_check" CHECK (length(trim("app"."financial_goals"."name")) > 0),
	CONSTRAINT "financial_goals_currency_check" CHECK ("app"."financial_goals"."currency" in ('BRL','USD','EUR','GBP','CAD','AUD','CHF','JPY','CLP','KRW','KWD','BHD')),
	CONSTRAINT "financial_goals_target_check" CHECK ("app"."financial_goals"."target_amount_minor" > 0),
	CONSTRAINT "financial_goals_planned_check" CHECK ("app"."financial_goals"."planned_monthly_minor" >= 0),
	CONSTRAINT "financial_goals_month_check" CHECK ("app"."financial_goals"."target_month" ~ '^[1-9][0-9]{3}-(0[1-9]|1[0-2])$' and left("app"."financial_goals"."target_month",4)::integer <= 9998),
	CONSTRAINT "financial_goals_priority_check" CHECK ("app"."financial_goals"."priority" in ('LOW','MEDIUM','HIGH')),
	CONSTRAINT "financial_goals_status_check" CHECK ("app"."financial_goals"."status" in ('ACTIVE','PAUSED','ARCHIVED')),
	CONSTRAINT "financial_goals_archive_check" CHECK (("app"."financial_goals"."status" = 'ARCHIVED') = ("app"."financial_goals"."archived_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "app"."financial_goals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."financial_goal_events" ADD CONSTRAINT "financial_goal_events_goal_owner_fk" FOREIGN KEY ("goal_id","auth_user_id") REFERENCES "app"."financial_goals"("id","auth_user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "financial_goal_events_goal_occurred_idx" ON "app"."financial_goal_events" USING btree ("goal_id","occurred_at","id");--> statement-breakpoint
CREATE INDEX "financial_goals_owner_status_idx" ON "app"."financial_goals" USING btree ("auth_user_id","status");--> statement-breakpoint
CREATE INDEX "financial_goals_owner_currency_idx" ON "app"."financial_goals" USING btree ("auth_user_id","currency");--> statement-breakpoint
CREATE POLICY "financial_goal_events_select_own" ON "app"."financial_goal_events" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "app"."financial_goal_events"."auth_user_id");--> statement-breakpoint
CREATE POLICY "financial_goals_select_own" ON "app"."financial_goals" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "app"."financial_goals"."auth_user_id");--> statement-breakpoint
CREATE POLICY "financial_goals_insert_own" ON "app"."financial_goals" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "app"."financial_goals"."auth_user_id");--> statement-breakpoint
CREATE POLICY "financial_goals_update_own" ON "app"."financial_goals" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "app"."financial_goals"."auth_user_id") WITH CHECK ((select auth.uid()) = "app"."financial_goals"."auth_user_id");
CREATE SCHEMA "app";
--> statement-breakpoint
REVOKE ALL ON SCHEMA "app" FROM PUBLIC;
--> statement-breakpoint
CREATE TABLE "app"."profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"locale" varchar(35) NOT NULL,
	"timezone" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_auth_user_id_unique" UNIQUE("auth_user_id"),
	CONSTRAINT "profiles_display_name_nonempty" CHECK (length(trim("app"."profiles"."display_name")) > 0),
	CONSTRAINT "profiles_locale_nonempty" CHECK (length(trim("app"."profiles"."locale")) > 0),
	CONSTRAINT "profiles_timezone_nonempty" CHECK (length(trim("app"."profiles"."timezone")) > 0)
);

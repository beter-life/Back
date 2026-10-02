ALTER TABLE "app"."profiles" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "profiles_select_own"
ON "app"."profiles"
FOR SELECT
TO authenticated
USING (
  (select auth.uid()) IS NOT NULL
  AND (select auth.uid()) = auth_user_id
);
--> statement-breakpoint
CREATE POLICY "profiles_insert_own"
ON "app"."profiles"
FOR INSERT
TO authenticated
WITH CHECK (
  (select auth.uid()) IS NOT NULL
  AND (select auth.uid()) = auth_user_id
);
--> statement-breakpoint
CREATE POLICY "profiles_update_own"
ON "app"."profiles"
FOR UPDATE
TO authenticated
USING (
  (select auth.uid()) IS NOT NULL
  AND (select auth.uid()) = auth_user_id
)
WITH CHECK (
  (select auth.uid()) IS NOT NULL
  AND (select auth.uid()) = auth_user_id
);
--> statement-breakpoint
CREATE POLICY "profiles_delete_own"
ON "app"."profiles"
FOR DELETE
TO authenticated
USING (
  (select auth.uid()) IS NOT NULL
  AND (select auth.uid()) = auth_user_id
);

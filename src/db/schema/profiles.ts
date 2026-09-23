import { pgSchema, uuid, varchar, timestamp, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Private application schema: do not add it to Supabase's exposed Data API schemas.
export const appSchema = pgSchema('app');
export const profiles = appSchema.table('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  authUserId: uuid('auth_user_id').notNull().unique(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  locale: varchar('locale', { length: 35 }).notNull(),
  timezone: varchar('timezone', { length: 100 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
}, (table) => [
  check('profiles_display_name_nonempty', sql`length(trim(${table.displayName})) > 0`),
  check('profiles_locale_nonempty', sql`length(trim(${table.locale})) > 0`),
  check('profiles_timezone_nonempty', sql`length(trim(${table.timezone})) > 0`),
]);

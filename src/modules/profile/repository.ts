import { eq, sql } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import { profiles } from '../../db/schema/profiles.js';
import type { ProfileInput, Profile } from './schema.js';

export interface ProfileRepository {
  findByAuthUser(authUserId: string): Promise<Profile | null>;
  upsertForAuthUser(authUserId: string, input: ProfileInput): Promise<Profile>;
}
const serialize = (row: typeof profiles.$inferSelect): Profile => ({
  id: row.id, displayName: row.displayName, locale: row.locale, timezone: row.timezone,
  createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
});
export function createProfileRepository({ db }: Database): ProfileRepository {
  return {
    async findByAuthUser(authUserId) {
      const [row] = await db.select().from(profiles).where(eq(profiles.authUserId, authUserId)).limit(1);
      return row ? serialize(row) : null;
    },
    async upsertForAuthUser(authUserId, input) {
      const [row] = await db.insert(profiles).values({ authUserId, ...input }).onConflictDoUpdate({
        target: profiles.authUserId,
        set: { ...input, updatedAt: sql`case when (${profiles.displayName}, ${profiles.locale}, ${profiles.timezone}) is distinct from (${input.displayName}, ${input.locale}, ${input.timezone}) then now() else ${profiles.updatedAt} end` },
      }).returning();
      if (!row) throw new Error('Profile write failed');
      return serialize(row);
    },
  };
}

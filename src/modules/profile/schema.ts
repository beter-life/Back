import { Type } from 'typebox';
import type { Static } from 'typebox';
import { Uuid } from '../../shared/http/schemas.js';

export const ProfileInput = Type.Object({
  displayName: Type.String({ minLength: 1, maxLength: 100, pattern: '\\S' }),
  locale: Type.String({ minLength: 2, maxLength: 35, pattern: '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$' }),
  timezone: Type.String({ minLength: 1, maxLength: 100 }),
}, { additionalProperties: false });
export type ProfileInput = Static<typeof ProfileInput>;
export const Profile = Type.Object({
  id: Uuid, ...ProfileInput.properties,
  createdAt: Type.String({ format: 'date-time' }), updatedAt: Type.String({ format: 'date-time' }),
}, { additionalProperties: false });
export type Profile = Static<typeof Profile>;
export const MeResponse = Type.Object({
  identity: Type.Object({ authUserId: Uuid }, { additionalProperties: false }),
  profile: Type.Union([Profile, Type.Null()]),
}, { additionalProperties: false });

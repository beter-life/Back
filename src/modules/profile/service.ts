import type { Identity } from '../auth/identity.js';
import type { ProfileRepository } from './repository.js';
import type { ProfileInput } from './schema.js';
import { AppError } from '../../shared/errors/index.js';

// Ownership lives here: callers cannot supply an alternate owner in route input.
export function profileService(repository: ProfileRepository) {
  return {
    me: async (identity: Identity) => ({ identity, profile: await repository.findByAuthUser(identity.authUserId) }),
    put: async (identity: Identity, input: ProfileInput) => {
      try {
        new Intl.Locale(input.locale);
        new Intl.DateTimeFormat('en', { timeZone: input.timezone });
      } catch { throw new AppError('VALIDATION_ERROR'); }
      return repository.upsertForAuthUser(identity.authUserId, { ...input, displayName: input.displayName.trim() });
    },
  };
}

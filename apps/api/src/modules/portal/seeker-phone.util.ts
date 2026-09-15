import type { AuthUser } from '../identity/identity.types';

/** Extract normalized phone from seeker JWT email (`seeker+0xxxxxxxxx@nnhn.local`). */
export function resolveSeekerPhone(user?: AuthUser): string | undefined {
  if (!user || user.role !== 'SEEKER') return undefined;
  const match = /^seeker\+(\d+)@nnhn\.local$/.exec(user.email);
  return match?.[1];
}

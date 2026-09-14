const SEEKER_KEY = 'nnhn_seeker_session';

export type SeekerSession = {
  accessToken: string;
  userId: string;
  phone: string;
  verifiedAt: string;
};

export function getSeekerSession(): SeekerSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SEEKER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SeekerSession;
  } catch {
    return null;
  }
}

export function setSeekerSession(session: SeekerSession) {
  window.localStorage.setItem(SEEKER_KEY, JSON.stringify(session));
}

export function clearSeekerSession() {
  window.localStorage.removeItem(SEEKER_KEY);
}

import { API_BASE } from './api';
import {
  clearStoredSession,
  readStoredSession,
  writeStoredSession,
  type StoredAuthSession,
} from './auth.storage';

export type AuthSession = StoredAuthSession;

let session: AuthSession | null = null;
let hydratePromise: Promise<AuthSession | null> | null = null;

export function getSession(): AuthSession | null {
  return session;
}

export function getAccessToken() {
  return session?.accessToken ?? null;
}

export function getTenantId() {
  return session?.tenantId ?? null;
}

export function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json', ...extra };
  if (session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;
  if (session?.tenantId) headers['X-Tenant-Id'] = session.tenantId;
  return headers;
}

/** Load JWT from SecureStore — call once on app start (M-S2-01) */
export async function restoreSession(): Promise<AuthSession | null> {
  if (session) return session;
  if (hydratePromise) return hydratePromise;

  hydratePromise = (async () => {
    const stored = await readStoredSession();
    session = stored;
    return stored;
  })();

  return hydratePromise;
}

function applySession(data: {
  accessToken: string;
  refreshToken: string;
  user: { tenantId: string; email: string; roles: string[] };
}): AuthSession {
  session = {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    tenantId: data.user.tenantId,
    email: data.user.email,
    roles: data.user.roles,
  };
  return session;
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const body = (await res.json()) as {
    data?: {
      accessToken: string;
      refreshToken: string;
      user: { tenantId: string; email: string; roles: string[] };
    };
    detail?: string;
  };

  if (!res.ok || !body.data) {
    throw new Error(body.detail ?? `Login failed: ${res.status}`);
  }

  const next = applySession(body.data);
  await writeStoredSession(next);
  return next;
}

export async function refreshSession(): Promise<AuthSession | null> {
  const refreshToken = session?.refreshToken ?? (await readStoredSession())?.refreshToken;
  if (!refreshToken) return null;

  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  const body = (await res.json()) as {
    data?: {
      accessToken: string;
      refreshToken: string;
      user: { tenantId: string; email: string; roles: string[] };
    };
  };

  if (!res.ok || !body.data) {
    await clearSession();
    return null;
  }

  const next = applySession(body.data);
  await writeStoredSession(next);
  return next;
}

export async function clearSession() {
  session = null;
  hydratePromise = null;
  await clearStoredSession();
}

export async function logout() {
  const refreshToken = session?.refreshToken ?? (await readStoredSession())?.refreshToken;
  if (refreshToken) {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Best-effort revoke — still clear local session
    }
  }
  await clearSession();
}

const STORAGE_KEY = 'wereal.auth.session';
const REFRESH_KEY = 'wereal.auth.refresh';

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  tenantId: string;
  userId: string;
  email: string;
  role: string;
  roles: string[];
  expiresIn?: number;
};

export type TenantOption = {
  id: string;
  attributes: {
    name: string;
    type: string;
    isActive: boolean;
  };
};

export type AuthMe = {
  user: { id: string; email: string; tenantId: string; roles: string[] };
  tenant: TenantOption;
  permissions: string[];
};

export class MfaRequiredError extends Error {
  readonly challengeId: string;
  readonly email: string;
  readonly tenantId: string;
  readonly role: string;

  constructor(challenge: { challengeId: string; email: string; tenantId: string; role: string }) {
    super('MFA required');
    this.name = 'MfaRequiredError';
    this.challengeId = challenge.challengeId;
    this.email = challenge.email;
    this.tenantId = challenge.tenantId;
    this.role = challenge.role;
  }
}

const API_BASE = import.meta.env.VITE_API_URL ?? '/api/v1';

export function getSession(): AuthSession | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function setSession(session: AuthSession): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  if (session.refreshToken) {
    sessionStorage.setItem(REFRESH_KEY, session.refreshToken);
  }
}

export function clearSession(): void {
  sessionStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
}

export function portalHomeForRole(role: string, portal?: string | null): string {
  if (portal === 'finance') return '/finance/reconciliation';
  if (portal === 'agent') return '/agent/bookings/new';
  if (portal === 'developer') return '/developer/units';
  if (portal === 'admin') return '/admin/ops';

  switch (role) {
    case 'AGENCY_ADMIN':
      return '/agent/marketplace/apply';
    case 'AGENT':
      return '/agent/bookings/new';
    case 'DEVELOPER_ADMIN':
      return '/developer/units';
    case 'FINANCE_ADMIN':
      return '/finance/reconciliation';
    case 'OPS_ADMIN':
    case 'ADMIN':
      return '/admin/ops';
    default:
      return '/';
  }
}

export async function fetchPublicTenants(): Promise<TenantOption[]> {
  const res = await fetch(`${API_BASE}/tenants`);
  if (!res.ok) throw new Error(`Tenants failed (${res.status})`);
  const json = (await res.json()) as { data: TenantOption[] };
  return json.data;
}

export async function login(
  email: string,
  password: string,
  tenantId?: string,
): Promise<AuthSession> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, tenantId }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Login failed (${res.status})`);
  }

  const json = (await res.json()) as {
    data: {
      mfaRequired?: boolean;
      challengeId?: string;
      email?: string;
      tenantId?: string;
      role?: string;
      accessToken?: string;
      refreshToken?: string;
      expiresIn?: number;
      user?: { id: string; email: string; tenantId: string; roles: string[] };
    };
  };

  if (json.data.mfaRequired && json.data.challengeId && json.data.email && json.data.tenantId) {
    throw new MfaRequiredError({
      challengeId: json.data.challengeId,
      email: json.data.email,
      tenantId: json.data.tenantId,
      role: json.data.role ?? 'USER',
    });
  }

  if (!json.data.accessToken || !json.data.refreshToken || !json.data.user) {
    throw new Error('Login response missing tokens');
  }

  const session: AuthSession = {
    accessToken: json.data.accessToken,
    refreshToken: json.data.refreshToken,
    tenantId: json.data.user.tenantId,
    userId: json.data.user.id,
    email: json.data.user.email,
    role: json.data.user.roles[0] ?? 'USER',
    roles: json.data.user.roles,
    expiresIn: json.data.expiresIn,
  };

  setSession(session);
  return session;
}

export async function completeMfaLogin(
  challengeId: string,
  mfaOtp: string,
  email?: string,
): Promise<AuthSession> {
  const res = await fetch(`${API_BASE}/auth/mfa/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId, mfaOtp, email }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `MFA failed (${res.status})`);
  }

  const json = (await res.json()) as {
    data: {
      accessToken?: string;
      refreshToken?: string;
      expiresIn?: number;
      user?: { id: string; email: string; tenantId: string; roles: string[] };
    };
  };

  if (!json.data.accessToken || !json.data.refreshToken || !json.data.user) {
    throw new Error('MFA response missing tokens');
  }

  const session: AuthSession = {
    accessToken: json.data.accessToken,
    refreshToken: json.data.refreshToken,
    tenantId: json.data.user.tenantId,
    userId: json.data.user.id,
    email: json.data.user.email,
    role: json.data.user.roles[0] ?? 'USER',
    roles: json.data.user.roles,
    expiresIn: json.data.expiresIn,
  };

  setSession(session);
  return session;
}

export async function refreshSession(): Promise<AuthSession> {
  const refreshToken = sessionStorage.getItem(REFRESH_KEY);
  if (!refreshToken) throw new Error('No refresh token');

  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    clearSession();
    throw new Error('Session expired');
  }

  const json = (await res.json()) as {
    data: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
      user: { id: string; email: string; tenantId: string; roles: string[] };
    };
  };

  const session: AuthSession = {
    accessToken: json.data.accessToken,
    refreshToken: json.data.refreshToken,
    tenantId: json.data.user.tenantId,
    userId: json.data.user.id,
    email: json.data.user.email,
    role: json.data.user.roles[0] ?? 'USER',
    roles: json.data.user.roles,
    expiresIn: json.data.expiresIn,
  };

  setSession(session);
  return session;
}

export async function logout(): Promise<void> {
  const session = getSession();
  const refreshToken = session?.refreshToken ?? sessionStorage.getItem(REFRESH_KEY);
  if (session?.accessToken && refreshToken) {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined);
  }
  clearSession();
}

export async function fetchAuthMe(): Promise<AuthMe> {
  const session = getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      'X-Tenant-Id': session.tenantId,
    },
  });

  if (res.status === 401) {
    await refreshSession();
    return fetchAuthMe();
  }

  if (!res.ok) throw new Error(`auth/me failed (${res.status})`);
  const json = (await res.json()) as { data: AuthMe };
  return json.data;
}

export async function verifyMfaOtp(mfaOtp: string): Promise<boolean> {
  const session = getSession();
  const res = await fetch(`${API_BASE}/auth/mfa/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mfaOtp,
      email: session?.email,
    }),
  });
  if (!res.ok) return false;
  const json = (await res.json()) as { data: { verified: boolean } };
  return json.data.verified;
}

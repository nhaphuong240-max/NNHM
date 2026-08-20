import { Page } from '@playwright/test';

const API_BASE = process.env.E2E_API_URL ?? 'http://127.0.0.1:3000/api/v1';

export type SeedSession = {
  email: string;
  password: string;
  tenantId?: string;
};

export async function seedAuthSession(page: Page, creds: SeedSession) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: creds.email,
      password: creds.password,
      tenantId: creds.tenantId,
    }),
  });
  if (!res.ok) {
    throw new Error(`E2E login failed (${res.status})`);
  }
  const json = (await res.json()) as {
    accessToken?: string;
    refreshToken?: string;
    data?: {
      accessToken: string;
      refreshToken: string;
      user: { id: string; email: string; tenantId: string; roles: string[] };
    };
  };
  const accessToken = json.accessToken ?? json.data?.accessToken;
  const refreshToken = json.refreshToken ?? json.data?.refreshToken ?? '';
  const user = json.data?.user;
  if (!accessToken || !user) throw new Error('E2E login missing token/user');

  await page.goto('/');
  await page.evaluate(
    ({ accessToken, refreshToken, user }) => {
      sessionStorage.setItem(
        'wereal.auth.session',
        JSON.stringify({
          accessToken,
          refreshToken,
          tenantId: user.tenantId,
          userId: user.id,
          email: user.email,
          role: user.roles[0] ?? 'AGENT',
          roles: user.roles,
        }),
      );
    },
    { accessToken, refreshToken, user },
  );
}

export const ADMIN = {
  email: 'admin@sunrise-dev.vn',
  password: 'DevAdmin123!',
} as const;

export const AGENT = {
  email: 'agent@sunrise-dev.vn',
  password: 'Agent123!',
} as const;

export const FINANCE = {
  email: 'finance@sunrise-dev.vn',
  password: 'Finance123!',
} as const;

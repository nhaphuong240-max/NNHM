import { test, expect } from '@playwright/test';
import { generateTotp, SEED_MFA_TOTP_SECRET } from './helpers/totp';

const API_BASE = process.env.E2E_API_URL ?? 'http://127.0.0.1:3000/api/v1';
const PILOT_TENANT = 'ten_pilot_cdt_01';

test.describe('OPS-S2 E2E · MFA TOTP', () => {
  test('pilot DEVELOPER_ADMIN rejects 123456 then accepts TOTP', async () => {
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'pilot@thanglong-dev.vn',
        password: 'PilotCdt123!',
        tenantId: PILOT_TENANT,
      }),
    });
    expect(loginRes.ok).toBeTruthy();
    const loginJson = (await loginRes.json()) as {
      data: { mfaRequired?: boolean; challengeId?: string; accessToken?: string };
    };
    expect(loginJson.data.mfaRequired).toBe(true);
    expect(loginJson.data.accessToken).toBeUndefined();
    const challengeId = loginJson.data.challengeId;
    expect(challengeId).toBeTruthy();

    const rejectRes = await fetch(`${API_BASE}/auth/mfa/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId, mfaOtp: '123456' }),
    });
    expect(rejectRes.status).toBe(401);

    const totp = generateTotp(SEED_MFA_TOTP_SECRET);
    const okRes = await fetch(`${API_BASE}/auth/mfa/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId, mfaOtp: totp }),
    });
    const okJson = (await okRes.json()) as {
      data: { accessToken?: string; mode?: string; verified?: boolean };
    };
    expect(okRes.ok, JSON.stringify(okJson)).toBeTruthy();
    expect(okJson.data.verified).toBe(true);
    expect(okJson.data.mode).toBe('TOTP');
    expect(okJson.data.accessToken).toBeTruthy();
  });

  test('demo agent still logs in without MFA', async () => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'agent@sunrise-dev.vn',
        password: 'Agent123!',
        tenantId: 'ten_dev_01',
      }),
    });
    expect(res.ok).toBeTruthy();
    const json = (await res.json()) as { data: { mfaRequired?: boolean; accessToken?: string } };
    expect(json.data.mfaRequired).toBeFalsy();
    expect(json.data.accessToken).toBeTruthy();
  });
});

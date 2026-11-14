import { expect, test } from '@playwright/test';

const API_BASE = process.env.E2E_API_URL ?? 'http://127.0.0.1:3000/api/v1';
const ENTRY_TOKEN = 'v1.ten_dev_01.wig_sunrise_gallery_v1';
const CONTRACT_ID = 'ctr_esign_demo01';
const TENANT_ID = 'ten_dev_01';
const PHONE = '0901234567';

test('buyer-esign rejects sign-session when the contract sign token is missing', async () => {
  const response = await fetch(`${API_BASE}/contracts/${CONTRACT_ID}/sign-session`, {
    headers: { 'X-Tenant-Id': TENANT_ID },
  });
  expect([401, 403]).toContain(response.status);
});

test('buyer-esign owning buyer gets a token and opens the sign session', async ({ page }) => {
  const requested = await fetch(`${API_BASE}/auth/seeker/otp/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: PHONE, entryToken: ENTRY_TOKEN }),
  });
  expect(requested.ok).toBe(true);
  const requestBody = (await requested.json()) as { data?: { challengeId?: string } };
  const challengeId = requestBody.data?.challengeId;
  expect(challengeId).toBeTruthy();

  const verified = await fetch(`${API_BASE}/auth/seeker/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId, code: '123456', phone: PHONE }),
  });
  expect(verified.ok).toBe(true);
  const verifiedBody = (await verified.json()) as { data?: { accessToken?: string; userId?: string } };
  const accessToken = verifiedBody.data?.accessToken;
  expect(accessToken).toBeTruthy();

  const minted = await fetch(`${API_BASE}/portal/buyer/contracts/${CONTRACT_ID}/sign-token`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-Tenant-Id': TENANT_ID,
    },
  });
  expect(minted.ok).toBe(true);
  const mintedBody = (await minted.json()) as { data?: { token?: string } };
  const signToken = mintedBody.data?.token;
  expect(signToken).toBeTruthy();

  const session = await fetch(`${API_BASE}/contracts/${CONTRACT_ID}/sign-session`, {
    headers: {
      'X-Tenant-Id': TENANT_ID,
      'X-Contract-Sign-Token': signToken ?? '',
    },
  });
  expect(session.status).not.toBe(401);
  expect(session.ok).toBe(true);

  const sessionResponse = page.waitForResponse(
    (response) => response.url().includes(`/contracts/${CONTRACT_ID}/sign-session`),
  );
  await page.goto('/');
  await page.evaluate(
    ({ accessToken: token, userId, phone }) => {
      window.localStorage.setItem(
        'nnhn_seeker_session',
        JSON.stringify({ accessToken: token, userId, phone, verifiedAt: new Date().toISOString() }),
      );
    },
    { accessToken, userId: verifiedBody.data?.userId, phone: PHONE },
  );
  await page.goto(`/buyer/esign?contractId=${CONTRACT_ID}&tenantId=${TENANT_ID}`);
  const pageSession = await sessionResponse;
  expect(pageSession.status()).not.toBe(401);
  await expect(page.getByRole('heading', { name: 'Ký hợp đồng điện tử' })).toBeVisible();
  await expect(page.getByText('Thu Trang')).toBeVisible();
  await expect(page.getByText('contract sign token is missing, expired, or for another contract')).toHaveCount(0);
});

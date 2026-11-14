import { expect, test } from '@playwright/test';

const API_BASE = process.env.E2E_API_URL ?? 'http://127.0.0.1:3000/api/v1';
const ENTRY_TOKEN = 'v1.ten_dev_01.wig_sunrise_gallery_v1';
const PHONE = '0901234567';

test('owning buyer opens the sign session without a 401', async ({ page }) => {
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
  expect(verifiedBody.data?.accessToken).toBeTruthy();

  const sessionResponse = page.waitForResponse(
    (response) => response.url().includes('/contracts/ctr_esign_demo01/sign-session'),
  );
  await page.goto('/');
  await page.evaluate(
    ({ accessToken, userId, phone }) => {
      window.localStorage.setItem(
        'nnhn_seeker_session',
        JSON.stringify({ accessToken, userId, phone, verifiedAt: new Date().toISOString() }),
      );
    },
    { accessToken: verifiedBody.data?.accessToken, userId: verifiedBody.data?.userId, phone: PHONE },
  );
  await page.goto('/buyer/esign?contractId=ctr_esign_demo01&tenantId=ten_dev_01');
  const session = await sessionResponse;
  expect(session.status()).not.toBe(401);
  await expect(page.getByRole('heading', { name: 'Ký hợp đồng điện tử' })).toBeVisible();
  await expect(page.getByText('Thu Trang')).toBeVisible();
  await expect(page.getByText('contract sign token is missing, expired, or for another contract')).toHaveCount(0);
});

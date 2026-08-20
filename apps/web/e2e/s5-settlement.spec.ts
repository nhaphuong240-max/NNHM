import { test, expect } from '@playwright/test';
import { seedAuthSession, FINANCE } from './helpers/auth';

test.describe('OPS-S5 E2E · finance settlement + reconcile UI', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuthSession(page, FINANCE);
  });

  test('settlement page shows OPS-S5 reconcile panel', async ({ page }) => {
    await page.goto('/finance/settlement');
    await expect(page.getByRole('heading', { name: 'Settlement batch' })).toBeVisible();
    await expect(page.getByText(/OPS-S5-05/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Đối chiếu batch' })).toBeVisible();
  });

  test('buyer esign pilot contract route loads', async ({ page }) => {
    await page.goto('/buyer/esign?contractId=ctr_pilot_deposit01');
    await expect(page.getByRole('heading', { name: 'Ký hợp đồng điện tử' })).toBeVisible();
  });
});

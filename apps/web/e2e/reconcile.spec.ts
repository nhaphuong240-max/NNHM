import { test, expect } from '@playwright/test';
import { ADMIN, seedAuthSession } from './helpers/auth';

test.describe('P3-S6 E2E · finance reconcile', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuthSession(page, ADMIN);
  });

  test('reconciliation dashboard loads', async ({ page }) => {
    await page.goto('/finance/reconciliation');
    await expect(page.getByRole('heading', { name: 'Đối soát thanh toán hàng ngày' })).toBeVisible();
  });
});

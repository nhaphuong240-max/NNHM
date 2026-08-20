import { test, expect } from '@playwright/test';
import { seedAuthSession, ADMIN } from './helpers/auth';

test.describe('OPS-S6 E2E · G-OPS-4 readiness', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuthSession(page, ADMIN);
  });

  test('ops console shows G-OPS-4 readiness panel', async ({ page }) => {
    await page.goto('/admin/ops');
    await expect(page.getByRole('heading', { name: 'Ops console' })).toBeVisible();
    await expect(page.getByText(/G-OPS-4 readiness/)).toBeVisible();
  });

  test('whitelabel page shows custom domain and URL pack', async ({ page }) => {
    await page.goto('/admin/whitelabel');
    await expect(page.getByRole('heading', { name: 'Whitelabel branding' })).toBeVisible();
    await expect(page.getByText(/OPS-S6 URL pack/)).toBeVisible();
    await expect(page.getByPlaceholder('portal.thanglong-dev.vn')).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';
import { seedAuthSession } from './helpers/auth';

test.describe('OPS-S3 E2E · ops console', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuthSession(page, {
      email: 'admin@sunrise-dev.vn',
      password: 'DevAdmin123!',
      tenantId: 'ten_dev_01',
    });
  });

  test('admin ops shows four queue widgets', async ({ page }) => {
    await page.goto('/admin/ops');
    await expect(page.getByRole('heading', { name: 'Ops console' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Stuck payment' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Lock TTL' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Drift BLOCK' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Reconcile mismatch' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Mở queue' }).first()).toBeVisible();
  });
});

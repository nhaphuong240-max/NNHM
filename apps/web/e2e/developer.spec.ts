import { test, expect } from '@playwright/test';
import { seedAuthSession } from './helpers/auth';

test.describe('Developer UX production', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuthSession(page, {
      email: 'admin@sunrise-dev.vn',
      password: 'DevAdmin123!',
      tenantId: 'ten_dev_01',
    });
  });

  test('anchor dashboard loads trust + GMV KPIs', async ({ page }) => {
    await page.goto('/developer/anchor');
    await expect(page.getByRole('heading', { name: /Anchor Network Dashboard/i })).toBeVisible();
    await expect(page.getByText(/Trust score/i)).toBeVisible();
    await expect(page.getByText(/GMV deposited/i)).toBeVisible();
  });

  test('data intelligence production tabs', async ({ page }) => {
    await page.goto('/developer/intelligence');
    await expect(page.getByRole('heading', { name: /Data Intelligence/i })).toBeVisible();
    await expect(page.getByText(/Absorption heatmap/i)).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Billing' }).click();
    await expect(page.getByText(/MRR/i)).toBeVisible({ timeout: 15000 });
  });
});

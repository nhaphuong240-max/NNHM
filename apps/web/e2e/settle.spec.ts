import { test, expect } from '@playwright/test';
import { ADMIN, seedAuthSession } from './helpers/auth';

test.describe('P3-S6 E2E · finance settlement', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuthSession(page, ADMIN);
  });

  test('settlement batch page loads', async ({ page }) => {
    await page.goto('/finance/settlement');
    await expect(page.getByRole('heading', { name: 'Settlement batch' })).toBeVisible();
  });
});

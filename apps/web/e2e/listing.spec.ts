import { test, expect } from '@playwright/test';
import { AGENT, seedAuthSession } from './helpers/auth';

test.describe('P3-S6 E2E · agent listing', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuthSession(page, AGENT);
  });

  test('listing wizard loads', async ({ page }) => {
    await page.goto('/agent/listings/new');
    await expect(page.getByRole('heading', { name: 'Tạo listing mới' })).toBeVisible();
  });
});

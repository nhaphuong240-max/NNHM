import { test, expect } from '@playwright/test';
import { AGENT, seedAuthSession } from './helpers/auth';

test.describe('P3-S6 E2E · agent booking', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuthSession(page, AGENT);
  });

  test('booking create page loads', async ({ page }) => {
    await page.goto('/agent/bookings/new');
    await expect(page.getByRole('heading', { name: 'Tạo booking / Giữ chỗ' })).toBeVisible();
  });
});

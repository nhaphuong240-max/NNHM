import { test, expect } from '@playwright/test';

test.describe('P3-S6 E2E · public search', () => {
  test('search page loads listings', async ({ page }) => {
    await page.goto('/public/search');
    await expect(page.getByRole('heading', { name: 'Tìm căn hộ' })).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });
});

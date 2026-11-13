import { test, expect } from '@playwright/test';

test.describe('P3-S6 E2E · public search', () => {
  test('search page loads listings for the registered beachhead host', async ({ page }) => {
    await page.goto('/public/search');
    await expect(page.getByRole('heading', { name: 'Tìm căn hộ' })).toBeVisible();
    await expect(
      page
        .getByText(/· [1-9]\d* listing trên bảng hàng/)
        .or(page.getByText(/[1-9]\d* căn · Verified Listing/)),
    ).toBeVisible();
  });
});

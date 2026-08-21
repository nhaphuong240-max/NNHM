import { test, expect } from '@playwright/test';

test.describe('P1 · SERP marketplace', () => {
  test('search results with filters and contact CTA', async ({ page }) => {
    await page.goto('/public/search');
    await expect(page.getByRole('heading', { name: 'Tìm căn hộ' })).toBeVisible();
    await expect(page.getByText('Bộ lọc')).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Cầu Giấy' })).toBeVisible();

    const contactButtons = page.getByRole('button', { name: 'Liên hệ' });
    const count = await contactButtons.count();
    if (count > 0) {
      await contactButtons.first().click();
      await expect(page.getByRole('heading', { name: 'Liên hệ tư vấn' })).toBeVisible();
      await page.getByRole('button', { name: '✕' }).click();
    }

    await expect(page.getByRole('link', { name: 'Giữ chỗ' }).first()).toBeVisible();
  });
});

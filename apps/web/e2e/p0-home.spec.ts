import { test, expect } from '@playwright/test';

test.describe('P0 · public homepage', () => {
  test('marketplace hero and partner portal', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Tìm nhà đáng tin' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mua' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hà Nội' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Đối tác' })).toBeVisible();

    await page.getByRole('link', { name: 'Đối tác' }).click();
    await expect(page).toHaveURL(/\/app/);
    await expect(page.getByRole('heading', { name: 'Cổng vận hành' })).toBeVisible();
  });
});

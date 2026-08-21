import { test, expect } from '@playwright/test';

test.describe('P3 · SEO district, EMI, schema', () => {
  test('district landing and footer city links', async ({ page }) => {
    await page.goto('/mua/quan-2');
    await expect(page.getByRole('heading', { name: /Quận 2/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('trust-strip')).toBeVisible();
    await expect(page.getByTestId('public-footer')).toBeVisible();
    await expect(page.getByRole('link', { name: /Căn hộ Quận 7/i })).toBeVisible();
  });

  test('EMI calculator shows monthly payment', async ({ page }) => {
    await page.goto('/public/tools/emi');
    await expect(page.getByTestId('emi-calculator')).toBeVisible();
    await expect(page.getByText(/Trả hàng tháng/i)).toBeVisible();
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
  });

  test('unit detail injects Product JSON-LD', async ({ page }) => {
    await page.goto('/public/units/mkp_un_01');
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1, { timeout: 15000 });
    const json = await page.locator('script[type="application/ld+json"]').textContent();
    expect(json).toContain('"@type":"Product"');
  });

  test('homepage has tools and district chips', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Mua theo quận' })).toBeVisible();
    await expect(page.getByTestId('trust-strip')).toBeVisible();
    await expect(page.getByRole('link', { name: /Quận 2, TP.HCM/i })).toBeVisible();
  });
});

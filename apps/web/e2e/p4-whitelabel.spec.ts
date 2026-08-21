import { test, expect } from '@playwright/test';

test.describe('P4 · white-label & ops privacy', () => {
  test('public topbar loads tenant brand', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('public-topbar')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('public-topbar')).toContainText(/Ngôi Nhà Hôm Nay/i);
  });

  test('post property CTA links to developer login', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('post-property-cta')).toBeVisible();
    await expect(page.getByRole('link', { name: /Đăng nhập CĐT/i })).toHaveAttribute(
      'href',
      '/auth/login?portal=developer',
    );
  });

  test('ops portal is noindex and not linked from public footer as admin', async ({ page }) => {
    await page.goto('/app');
    await expect(page.getByRole('heading', { name: /Cổng vận hành/i })).toBeVisible();
    const robots = page.locator('meta[name="robots"]');
    await expect(robots).toHaveAttribute('content', /noindex/i);

    await page.goto('/');
    await expect(page.getByRole('link', { name: /Finance/i })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Admin/i })).toHaveCount(0);
  });

  test('public brand API is reachable', async ({ request }) => {
    const res = await request.get('/api/v1/tenants/branding/public', {
      headers: { 'X-Tenant-Id': 'ten_dev_01' },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.data.displayName).toMatch(/Ngôi Nhà Hôm Nay/i);
  });
});

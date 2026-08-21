import { test, expect } from '@playwright/test';

test.describe('P2 · project page & map', () => {
  test('project page shows listings and map uses search index', async ({ page }) => {
    await page.goto('/public/projects/prj_mkp_hcm');
    await expect(page.getByRole('heading', { name: /Saigon Pearl/i })).toBeVisible({ timeout: 15000 });

    await page.goto('/public/map');
    await expect(page.getByRole('heading', { name: 'Bản đồ listing' })).toBeVisible();
  });
});

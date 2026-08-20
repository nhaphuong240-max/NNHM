import { test, expect } from '@playwright/test';
import { seedAuthSession, AGENT } from './helpers/auth';

test.describe('OPS-S4 E2E · agent inbox P0', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuthSession(page, AGENT);
  });

  test('inbox page shows omnichannel banner and threads', async ({ page }) => {
    await page.goto('/agent/inbox');
    await expect(page.getByRole('heading', { name: 'Inbox đa kênh' })).toBeVisible();
    await expect(page.getByText(/OPS-S4-03/)).toBeVisible();
    await expect(page.getByText(/Threads/)).toBeVisible({ timeout: 15000 });
  });

  test('agent home links inbox as morning entry', async ({ page }) => {
    await page.goto('/agent');
    await expect(page.getByRole('link', { name: 'Inbox đa kênh' })).toBeVisible();
    await expect(page.getByText(/Inbox \(P0\)/)).toBeVisible();
  });
});

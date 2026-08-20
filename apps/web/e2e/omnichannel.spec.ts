import { test, expect } from '@playwright/test';
import { ADMIN, seedAuthSession } from './helpers/auth';

test.describe('P3-S6 E2E · omnichannel SLA dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuthSession(page, ADMIN);
  });

  test('omnichannel hub shows OP-WIN-07 panel', async ({ page }) => {
    await page.goto('/admin/integrations/leads');
    await expect(page.getByRole('heading', { name: 'Unified Omnichannel' })).toBeVisible();
    await expect(page.getByText('OP-WIN-07')).toBeVisible();
  });
});

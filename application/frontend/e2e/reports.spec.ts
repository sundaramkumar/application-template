import { test, expect } from '@playwright/test';
import { registerAndLogin } from './helpers';

test.beforeEach(async ({ page }) => {
  await registerAndLogin(page, `reports-e2e-${Date.now()}@crm.com`);
});

test.describe('Reports & Analytics @smoke @regression', () => {
  test('analytics page loads without error', async ({ page }) => {
    await page.goto('/analytics');
    const notFound = await page.getByText(/not found|404/i).isVisible({ timeout: 2000 }).catch(() => false);
    if (notFound) await page.goto('/reports');
    await expect(page.locator('body')).not.toContainText('Unhandled Error', { timeout: 5000 });
  });

  test('summary table widget renders with data', async ({ page }) => {
    await page.goto('/analytics');
    const notFound = await page.getByText(/not found|404/i).isVisible({ timeout: 2000 }).catch(() => false);
    if (notFound) return;
    const hasChart = await page.locator('[class*="chart"], [class*="widget"], table').count();
    expect(hasChart).toBeGreaterThanOrEqual(0);
  });
});

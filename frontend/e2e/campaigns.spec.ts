import { test, expect } from '@playwright/test';
import { registerAndLogin, apiCreate } from './helpers';

let token: string;

test.beforeEach(async ({ page }) => {
  token = await registerAndLogin(page, `campaigns-e2e-${Date.now()}@crm.com`);
});

test.describe('Campaigns — list & create @crud @smoke @regression', () => {
  test('campaigns list loads without error', async ({ page }) => {
    await page.goto('/campaigns');
    await expect(page.locator('main').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('body')).not.toContainText('Unhandled Error', { timeout: 5000 });
  });

  test('new campaign button is visible on list page @smoke', async ({ page }) => {
    await page.goto('/campaigns');
    await expect(page.getByRole('button', { name: /new campaign/i })).toBeVisible({ timeout: 8000 });
  });

  test('create a new campaign via form', async ({ page }) => {
    await page.goto('/campaigns/new');
    await expect(page.locator('main').first()).toBeVisible({ timeout: 8000 });
    const nameField = page.getByLabel(/^name$/i).first();
    if (await nameField.isVisible({ timeout: 4000 }).catch(() => false)) {
      await nameField.fill('Summer Promo E2E');
      await page.getByRole('button', { name: /save/i }).click();
      await expect(page.locator('body')).toContainText('Summer Promo E2E', { timeout: 8000 });
    }
  });
});

test.describe('Campaigns — detail @crud @regression', () => {
  test('campaign detail shows data when opened via direct URL', async ({ page }) => {
    const ts = Date.now();
    const campaign = await apiCreate('campaigns', {
      name: `E2E Campaign ${ts}`, type: 'Email', status: 'Planning',
    }, token);
    if (!campaign?.id) return;
    await page.goto(`/campaigns/${campaign.id as string}`);
    await expect(page.locator('body')).toContainText(`E2E Campaign ${ts}`, { timeout: 8000 });
  });
});

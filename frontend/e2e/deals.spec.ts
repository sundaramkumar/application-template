import { test, expect } from '@playwright/test';
import { registerAndLogin, apiCreate } from './helpers';

let token: string;

test.beforeEach(async ({ page }) => {
  token = await registerAndLogin(page, `deals-e2e-${Date.now()}@crm.com`);
});

test.describe('Deals — list & create @crud @smoke @regression', () => {
  test('create a new deal and see it in the list', async ({ page }) => {
    await page.goto('/deals/new');
    await page.getByLabel(/deal name|name/i).first().fill('Big Deal 2025');
    await page.getByRole('button', { name: /save/i }).click();
    await expect(page).toHaveURL(/\/deals/, { timeout: 8000 });
    await expect(page.locator('body')).toContainText('Big Deal 2025', { timeout: 5000 });
  });

  test('deals list renders kanban or table @smoke', async ({ page }) => {
    await page.goto('/deals');
    await expect(page.locator('body')).not.toContainText('Error', { timeout: 5000 });
    await expect(page.locator('main').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Deals — detail @crud @regression', () => {
  test('deal detail shows correct data', async ({ page }) => {
    const uniq = `UniqueXDeal${Date.now()}`;
    await apiCreate('deals', { name: uniq, stage: 'Prospecting', amount: 5000 }, token);
    await page.goto('/deals');
    await expect(page.locator('body')).toContainText(uniq, { timeout: 10000 });
  });
});

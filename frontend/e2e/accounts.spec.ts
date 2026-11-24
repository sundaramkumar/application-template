import { test, expect } from '@playwright/test';
import { registerAndLogin, apiCreate } from './helpers';

let token: string;

test.beforeEach(async ({ page }) => {
  token = await registerAndLogin(page, `accounts-e2e-${Date.now()}@crm.com`);
});

test.describe('Accounts — list & create @crud @smoke @regression', () => {
  test('create a new account and see it in the list', async ({ page }) => {
    await page.goto('/accounts/new');
    await page.getByLabel(/name/i).first().fill('Acme Industries');
    await page.getByRole('button', { name: /save/i }).click();
    await expect(page).toHaveURL(/\/accounts/, { timeout: 8000 });
    await expect(page.locator('body')).toContainText('Acme Industries', { timeout: 5000 });
  });

  test('account list loads without error @smoke', async ({ page }) => {
    await page.goto('/accounts');
    await expect(page.locator('body')).not.toContainText('Error', { timeout: 5000 });
    await expect(page.locator('main').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Accounts — detail @crud @regression', () => {
  test('account detail page shows correct data', async ({ page }) => {
    const account = await apiCreate('accounts', { name: 'Detail Account' }, token);
    await page.goto(`/accounts/${account.id as string}`);
    await expect(page.locator('body')).toContainText('Detail Account', { timeout: 8000 });
  });
});

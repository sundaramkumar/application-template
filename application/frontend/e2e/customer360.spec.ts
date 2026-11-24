import { test, expect } from '@playwright/test';
import { registerAndLogin, apiCreate } from './helpers';

let token: string;

test.beforeEach(async ({ page }) => {
  token = await registerAndLogin(page, `c360-e2e-${Date.now()}@crm.com`);
});

test.describe('Customer 360 @smoke @regression', () => {
  test('contact detail page shows linked account', async ({ page }) => {
    const account = await apiCreate('accounts', { name: '360 Account' }, token);
    const contact = await apiCreate('contacts', {
      firstName: 'Three', lastName: 'Sixty',
      email: `360-${Date.now()}@test.com`, accountId: account.id as string,
    }, token);
    await page.goto(`/contacts/${contact.id as string}`);
    await expect(page.locator('body')).toContainText('Three', { timeout: 8000 });
  });

  test('account detail shows linked sections', async ({ page }) => {
    const account = await apiCreate('accounts', { name: 'A360 Corp' }, token);
    await page.goto(`/accounts/${account.id as string}`);
    await expect(page.locator('body')).toContainText('A360 Corp', { timeout: 8000 });
  });
});

import { test, expect } from '@playwright/test';
import { registerAndLogin, apiCreate } from './helpers';

let token: string;

test.beforeEach(async ({ page }) => {
  token = await registerAndLogin(page, `contacts-e2e-${Date.now()}@crm.com`);
});

test.describe('Contacts — list & create @crud @smoke @regression', () => {
  test('create a new contact and see it in the list', async ({ page }) => {
    await page.goto('/contacts/new');
    await page.getByLabel(/first name/i).fill('Jane');
    await page.getByLabel(/last name/i).fill('Doe');
    await page.locator('input[type="email"]').fill(`jane-${Date.now()}@doe.com`);
    await page.getByRole('button', { name: /save/i }).click();
    await expect(page).toHaveURL(/\/contacts/, { timeout: 8000 });
    await expect(page.locator('body')).toContainText('Jane', { timeout: 5000 });
  });

  test('contact list loads without error @smoke', async ({ page }) => {
    await page.goto('/contacts');
    await expect(page.locator('body')).not.toContainText('Error', { timeout: 5000 });
  });
});

test.describe('Contacts — detail @crud @regression', () => {
  test('contact detail page shows correct data', async ({ page }) => {
    const contact = await apiCreate('contacts', {
      firstName: 'Detail', lastName: 'Test', email: `detail-${Date.now()}@test.com`,
    }, token);
    await page.goto(`/contacts/${contact.id as string}`);
    await expect(page.locator('body')).toContainText('Detail', { timeout: 8000 });
  });

  test('account lookup label is present on contact form @smoke', async ({ page }) => {
    await page.goto('/contacts/new');
    await expect(page.locator('label[for="field-accountId"]')).toBeVisible({ timeout: 5000 });
  });
});

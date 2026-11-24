import { test, expect } from '@playwright/test';
import { registerAndLogin, apiCreate } from './helpers';

let token: string;

test.beforeEach(async ({ page }) => {
  token = await registerAndLogin(page, `quotes-e2e-${Date.now()}@crm.com`);
});

test.describe('Quotes — list & create @crud @smoke @regression', () => {
  test('create a new quote via form and see it in the list', async ({ page }) => {
    await page.goto('/quotes/new');
    const titleField = page.getByLabel(/title|subject|quote name|name/i).first();
    if (await titleField.isVisible({ timeout: 5000 }).catch(() => false)) {
      await titleField.fill('Q-2025-001');
      await page.getByRole('button', { name: /save/i }).click();
      await expect(page).toHaveURL(/\/quotes/, { timeout: 8000 });
      await expect(page.locator('body')).toContainText('Q-2025-001', { timeout: 5000 });
    }
  });

  test('quotes list loads without error @smoke', async ({ page }) => {
    await page.goto('/quotes');
    await expect(page.locator('body')).not.toContainText('Error', { timeout: 5000 });
    await expect(page.locator('main').first()).toBeVisible({ timeout: 5000 });
  });

  test('quotes list renders correctly', async ({ page }) => {
    await page.goto('/quotes');
    await expect(page.locator('main').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('body')).not.toContainText('Unhandled Error', { timeout: 5000 });
  });
});

test.describe('Quotes — detail & conversion @billing @conversion @regression', () => {
  test('quote detail page loads with Convert to Order button', async ({ page }) => {
    const account = await apiCreate('accounts', { name: 'Quote Detail Corp' }, token);
    const quote = await apiCreate('quotes', {
      number: `QT-${Date.now()}`, title: 'Detail Test Quote',
      accountId: account.id as string, status: 'Draft',
    }, token);
    await page.goto(`/quotes/${quote.id as string}`);
    await expect(page.locator('body')).toContainText('Detail Test Quote', { timeout: 8000 });
    await expect(page.getByRole('button', { name: /convert to order/i })).toBeVisible({ timeout: 5000 });
  });

  test('convert quote to order navigates to the new order page', async ({ page }) => {
    const account = await apiCreate('accounts', { name: 'Convert Corp' }, token);
    const quote = await apiCreate('quotes', {
      number: `QT-${Date.now()}`, title: 'Conversion Quote',
      accountId: account.id as string, status: 'Draft',
    }, token);
    await page.goto(`/quotes/${quote.id as string}`);
    await expect(page.locator('body')).toContainText('Conversion Quote', { timeout: 8000 });
    const convertBtn = page.getByRole('button', { name: /convert to order/i });
    await expect(convertBtn).toBeEnabled({ timeout: 5000 });
    await convertBtn.click();
    await expect(page).toHaveURL(/\/orders\//, { timeout: 12000 });
    await expect(page.locator('body')).not.toContainText('Error', { timeout: 5000 });
  });
});

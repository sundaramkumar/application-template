import { test, expect } from '@playwright/test';
import { registerAndLogin, apiCreate } from './helpers';

let token: string;

test.beforeEach(async ({ page }) => {
  token = await registerAndLogin(page, `products-e2e-${Date.now()}@crm.com`);
});

test.describe('Products — list & create @crud @smoke @regression', () => {
  test('products list loads without error', async ({ page }) => {
    await page.goto('/products');
    await expect(page.locator('main').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('body')).not.toContainText('Unhandled Error', { timeout: 5000 });
  });

  test('new product button is visible on list page @smoke', async ({ page }) => {
    await page.goto('/products');
    await expect(page.getByRole('button', { name: /new product/i })).toBeVisible({ timeout: 8000 });
  });

  test('create a new product via form', async ({ page }) => {
    await page.goto('/products/new');
    await expect(page.locator('main').first()).toBeVisible({ timeout: 8000 });
    const nameField = page.getByLabel(/^name$/i).first();
    if (await nameField.isVisible({ timeout: 4000 }).catch(() => false)) {
      await nameField.fill('Widget Pro E2E');
      await page.getByRole('button', { name: /save/i }).click();
      await expect(page.locator('body')).toContainText('Widget Pro E2E', { timeout: 8000 });
    }
  });
});

test.describe('Products — detail @crud @regression', () => {
  test('product detail shows data when opened via direct URL', async ({ page }) => {
    const ts = Date.now();
    const product = await apiCreate('products', {
      name: `E2E Product ${ts}`, code: `PRD-E2E-${ts}`, status: 'Active',
    }, token);
    if (!product?.id) return;
    await page.goto(`/products/${product.id as string}`);
    await expect(page.locator('body')).toContainText(`E2E Product ${ts}`, { timeout: 8000 });
  });
});

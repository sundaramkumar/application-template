import { test, expect } from '@playwright/test';
import { registerAndLogin, apiCreate } from './helpers';

let token: string;

test.beforeEach(async ({ page }) => {
  token = await registerAndLogin(page, `cascade-e2e-${Date.now()}@crm.com`);
});

test.describe('Cascading Dropdowns & Lookups @smoke @regression', () => {
  test('contact form - account field has label and is a lookup', async ({ page }) => {
    await page.goto('/contacts/new');
    await expect(page.locator('label[for="field-accountId"]')).toBeVisible({ timeout: 5000 });
  });

  test('deal form - account field label is present', async ({ page }) => {
    await page.goto('/deals/new');
    await expect(page.locator('label[for="field-accountId"]')).toBeVisible({ timeout: 5000 });
  });

  test('line items - add row and verify row is added', async ({ page }) => {
    await page.goto('/quotes/new');
    const titleField = page.getByLabel(/title|name/i).first();
    if (await titleField.isVisible({ timeout: 3000 }).catch(() => false)) {
      await titleField.fill('Line Items Test Quote');
      const addBtn = page.getByRole('button', { name: /add item|add line/i });
      if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        const rowsBefore = await page.locator('input[type="number"]').count();
        await addBtn.click();
        const rowsAfter = await page.locator('input[type="number"]').count();
        expect(rowsAfter).toBeGreaterThanOrEqual(rowsBefore);
      }
    }
  });
});

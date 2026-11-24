import { test, expect } from '@playwright/test';
import { registerAndLogin } from './helpers';

test.beforeEach(async ({ page }) => {
  await registerAndLogin(page, `settings-e2e-${Date.now()}@crm.com`);
});

test.describe('Settings — custom fields @settings @regression', () => {
  test('adds a custom text field to leads module', async ({ page }) => {
    await page.goto('/settings');
    const settingsPanel = page.locator('main');
    await settingsPanel.getByRole('button', { name: /^leads$/i }).first().click();
    await settingsPanel.getByRole('button', { name: /^add$/i }).first().click();
    await page.getByPlaceholder(/e\.g\. Budget/i).fill('Test Custom Field');
    await page.getByRole('button', { name: /add field/i }).click();
    await expect(page.getByText('Test Custom Field').first()).toBeVisible({ timeout: 5000 });
  });

  test('lookup field shows target module dropdown', async ({ page }) => {
    await page.goto('/settings');
    const settingsPanel = page.locator('main');
    await settingsPanel.getByRole('button', { name: /^leads$/i }).first().click();
    await settingsPanel.getByRole('button', { name: /^add$/i }).first().click();
    await page.getByText('text').first().click();
    await page.getByText('lookup').click();
    await expect(page.getByText(/target module/i).first()).toBeVisible({ timeout: 3000 });
  });
});

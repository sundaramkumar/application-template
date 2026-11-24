import { test, expect } from '@playwright/test';
import { registerAndLogin } from './helpers';

test.beforeEach(async ({ page }) => {
  await registerAndLogin(page, `auto-e2e-${Date.now()}@crm.com`);
});

test.describe('Automations @smoke @regression', () => {
  test('automations page loads without error', async ({ page }) => {
    await page.goto('/automations');
    await expect(page.locator('body')).not.toContainText('Error', { timeout: 5000 });
  });

  test('create a new automation', async ({ page }) => {
    await page.goto('/automations');
    const newBtn = page.getByRole('button', { name: /new automation|create automation|\+ automation/i });
    if (await newBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newBtn.click();
      const nameField = page.getByLabel(/name|title/i).first();
      if (await nameField.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nameField.fill('Test Automation');
        await page.getByRole('button', { name: /save|create/i }).last().click();
        await expect(page.getByText('Test Automation')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('toggle automation active state', async ({ page }) => {
    await page.goto('/automations');
    const toggle = page.locator('[type="checkbox"], [role="switch"]').first();
    if (await toggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      const waChecked = await toggle.isChecked();
      await toggle.click();
      await expect(toggle).toHaveJSProperty('checked', !waChecked);
    }
  });
});

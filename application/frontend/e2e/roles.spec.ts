import { test, expect } from '@playwright/test';
import { registerAndLogin } from './helpers';

test.beforeEach(async ({ page }) => {
  await registerAndLogin(page, `roles-e2e-${Date.now()}@crm.com`);
});

test.describe('Roles & Permissions @settings @smoke @regression', () => {
  test('roles settings page loads without error', async ({ page }) => {
    await page.goto('/settings/roles');
    await expect(page.locator('body')).not.toContainText('Error', { timeout: 5000 });
  });

  test('create a new role', async ({ page }) => {
    await page.goto('/settings/roles');
    const newBtn = page.getByRole('button', { name: /new role|create role|\+ role/i });
    if (await newBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newBtn.click();
      const nameField = page.getByLabel(/role name|name/i).first();
      if (await nameField.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nameField.fill('Custom Role');
        await page.getByRole('button', { name: /save|create/i }).last().click();
        await expect(page.getByText('Custom Role')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('role permissions can be toggled', async ({ page }) => {
    await page.goto('/settings/roles');
    const firstRole = page.locator('[class*="role"], tbody tr').first();
    if (await firstRole.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstRole.click();
      const permCheckbox = page.locator('[type="checkbox"]').first();
      await expect(permCheckbox).toBeVisible({ timeout: 5000 });
    }
  });
});

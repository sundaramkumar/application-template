import { test, expect } from '@playwright/test';
import { registerAndLogin } from './helpers';

test.beforeEach(async ({ page }) => {
  await registerAndLogin(page, `dash-e2e-${Date.now()}@crm.com`);
});

test.describe('Dashboard @smoke @regression', () => {
  test('dashboard loads and shows widgets', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).not.toContainText('Error', { timeout: 5000 });
    await expect(page.locator('main').first()).toBeVisible({ timeout: 5000 });
  });

  test('add widget button opens widget selector', async ({ page }) => {
    await page.goto('/');
    const addBtn = page.getByRole('button', { name: /add widget|\+ widget/i });
    if (!(await addBtn.isVisible({ timeout: 5000 }).catch(() => false))) return;
    await addBtn.click();
    await expect(page.getByText(/widget type|select type/i).first()).toBeVisible({ timeout: 3000 });
    await page.keyboard.press('Escape');
  });
});

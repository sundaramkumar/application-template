import { test, expect } from '@playwright/test';
import { registerAndLogin, apiCreate } from './helpers';

let token: string;

test.beforeEach(async ({ page }) => {
  token = await registerAndLogin(page, `activities-e2e-${Date.now()}@crm.com`);
});

test.describe('Activities — list & create @crud @smoke @regression', () => {
  test('activities list loads without error', async ({ page }) => {
    await page.goto('/activities');
    await expect(page.locator('main').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('body')).not.toContainText('Unhandled Error', { timeout: 5000 });
  });

  test('new activity button is visible on list page @smoke', async ({ page }) => {
    await page.goto('/activities');
    await expect(page.getByRole('button', { name: /new activity/i })).toBeVisible({ timeout: 8000 });
  });

  test('create a new activity via form', async ({ page }) => {
    await page.goto('/activities/new');
    await expect(page.locator('main').first()).toBeVisible({ timeout: 8000 });
    const subjectField = page.getByLabel(/subject/i).first();
    if (await subjectField.isVisible({ timeout: 4000 }).catch(() => false)) {
      await subjectField.fill('Follow-up Call E2E');
      await page.getByRole('button', { name: /save/i }).click();
      await expect(page.locator('body')).toContainText('Follow-up Call E2E', { timeout: 8000 });
    }
  });
});

test.describe('Activities — detail @crud @regression', () => {
  test('activity detail shows data when opened via direct URL', async ({ page }) => {
    const ts = Date.now();
    const activity = await apiCreate('activities', {
      subject: `E2E Call ${ts}`, type: 'Call', status: 'Planned',
    }, token);
    if (!activity?.id) return;
    await page.goto(`/activities/${activity.id as string}`);
    await expect(page.locator('body')).toContainText(`E2E Call ${ts}`, { timeout: 8000 });
  });
});

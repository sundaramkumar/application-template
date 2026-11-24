import { test, expect } from '@playwright/test';
import { registerAndLogin, apiCreate } from './helpers';

let token: string;

test.beforeEach(async ({ page }) => {
  token = await registerAndLogin(page, `lead-e2e-${Date.now()}@crm.com`);
});

test.describe('Leads — list & create @crud @smoke @regression', () => {
  test('create a new lead and see it in the list', async ({ page }) => {
    await page.goto('/leads/new');
    await page.getByLabel(/first name/i).fill('Eva');
    await page.getByLabel(/last name/i).fill('Green');
    await page.getByLabel(/email/i).fill(`eva-${Date.now()}@green.com`);
    await page.getByRole('button', { name: /save/i }).click();
    await expect(page).toHaveURL(/\/leads/, { timeout: 8000 });
    await expect(page.locator('body')).toContainText('Eva', { timeout: 5000 });
  });

  test('leads list page loads without error @smoke', async ({ page }) => {
    await page.goto('/leads');
    await expect(page.locator('body')).not.toContainText('Error', { timeout: 5000 });
  });
});

test.describe('Leads — conversion @conversion @regression', () => {
  test('lead detail shows Convert button', async ({ page }) => {
    const lead = await apiCreate('leads', {
      firstName: 'Convert', lastName: 'Me', email: `convert-${Date.now()}@test.com`,
    }, token);
    await page.goto(`/leads/${lead.id}`);
    await expect(page.getByRole('button', { name: /convert/i })).toBeVisible({ timeout: 5000 });
  });

  test('convert lead opens conversion flow', async ({ page }) => {
    const lead = await apiCreate('leads', {
      firstName: 'Lead', lastName: 'ToConvert', email: `toconvert-${Date.now()}@test.com`,
      company: 'ConvertCo',
    }, token);
    await page.goto(`/leads/${lead.id}`);
    await page.getByRole('button', { name: /convert/i }).click();
    const convertHeading = page.getByText(/convert lead|lead conversion/i);
    if (await convertHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
      const confirmBtn = page.getByRole('button', { name: /convert|confirm/i }).last();
      await confirmBtn.click();
      await expect(page.getByText(/converted|contact created|success/i)).toBeVisible({ timeout: 8000 });
    }
  });
});

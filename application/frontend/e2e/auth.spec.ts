import { test, expect } from '@playwright/test';

const API = 'http://localhost:3000';
const email = `auth-e2e-${Date.now()}@crm.com`;
const password = 'Test1234!';

test.beforeAll(async () => {
  await fetch(`${API}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Auth Tester', email, password }),
  }).catch(() => {});
});

test.describe('Authentication @auth @smoke @regression', () => {
  test('login with valid credentials shows dashboard', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.locator('form')).not.toBeVisible({ timeout: 8000 });
  });

  test('wrong password shows error message', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill('wrongpass');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/invalid|incorrect|wrong|error/i)).toBeVisible({ timeout: 5000 });
  });

  test('unauthenticated visit shows login form', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible({ timeout: 5000 });
  });
});

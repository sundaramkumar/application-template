import type { Page } from '@playwright/test';

const API = 'http://localhost:3000';

export async function registerAndLogin(
  page: Page,
  email = `e2e-${Date.now()}@crm.com`,
  password = 'Test1234!',
): Promise<string> {
  // Register
  await fetch(`${API}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'E2E User', email, password }),
  });

  // Promote to admin so all record operations are allowed
  const promoteRes = await fetch(`${API}/api/test/promote-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const promoteData = await promoteRes.json() as { success: boolean; data?: { token: string } };
  const apiToken = promoteData.data?.token ?? '';

  // Login via UI — app shows Login inline at / when unauthenticated
  await page.goto('/');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  // After login, URL stays at / showing dashboard
  await page.waitForFunction(() => !document.querySelector('form'), { timeout: 10000 });

  return apiToken;
}

/** Create a record directly via API without UI interaction. */
export async function apiCreate(
  module: string,
  data: Record<string, unknown>,
  token: string,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${API}/api/${module}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  const json = await res.json() as { data: Record<string, unknown> };
  return json.data;
}

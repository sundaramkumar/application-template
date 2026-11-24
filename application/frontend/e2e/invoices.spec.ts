import { test, expect } from '@playwright/test';
import { registerAndLogin, apiCreate } from './helpers';

let token: string;

test.beforeEach(async ({ page }) => {
  token = await registerAndLogin(page, `invoices-e2e-${Date.now()}@crm.com`);
});

test.describe('Invoices — list @smoke @regression', () => {
  test('invoices list loads without error', async ({ page }) => {
    await page.goto('/invoices');
    await expect(page.locator('body')).not.toContainText('Error', { timeout: 5000 });
    await expect(page.locator('main').first()).toBeVisible({ timeout: 5000 });
  });

  test('invoices page renders correctly', async ({ page }) => {
    await page.goto('/invoices');
    await expect(page.locator('main').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('body')).not.toContainText('Unhandled Error', { timeout: 5000 });
  });
});

test.describe('Invoices — detail @billing @regression', () => {
  test('invoice detail page shows invoice data', async ({ page }) => {
    const account = await apiCreate('accounts', { name: 'Invoice Corp' }, token);
    const order = await apiCreate('orders', {
      number: `ORD-${Date.now()}`, accountId: account.id as string,
      status: 'Pending', paymentStatus: 'Unpaid', orderDate: '2026-01-01',
    }, token);
    const res = await fetch(`http://localhost:3000/api/orders/${order.id as string}/create-invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    });
    const json = await res.json() as { data: { invoice: { id: string } } };
    const invoiceId = json.data.invoice.id;
    await page.goto(`/invoices/${invoiceId}`);
    await expect(page.locator('body')).toContainText('INV-', { timeout: 8000 });
    await expect(page.locator('body')).not.toContainText('Error', { timeout: 5000 });
  });
});

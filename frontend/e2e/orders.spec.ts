import { test, expect } from '@playwright/test';
import { registerAndLogin, apiCreate } from './helpers';

let token: string;

test.beforeEach(async ({ page }) => {
  token = await registerAndLogin(page, `orders-e2e-${Date.now()}@crm.com`);
});

test.describe('Orders — list @smoke @regression', () => {
  test('orders list loads without error', async ({ page }) => {
    await page.goto('/orders');
    await expect(page.locator('body')).not.toContainText('Error', { timeout: 5000 });
    await expect(page.locator('main').first()).toBeVisible({ timeout: 5000 });
  });

  test('orders page renders correctly', async ({ page }) => {
    await page.goto('/orders');
    await expect(page.locator('main').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('body')).not.toContainText('Unhandled Error', { timeout: 5000 });
  });
});

test.describe('Orders — detail & invoice creation @billing @regression', () => {
  test('order detail page loads with Create Invoice button', async ({ page }) => {
    const account = await apiCreate('accounts', { name: 'Order Detail Corp' }, token);
    const order = await apiCreate('orders', {
      number: `ORD-${Date.now()}`, accountId: account.id as string,
      status: 'Pending', paymentStatus: 'Unpaid', orderDate: '2026-01-01',
    }, token);
    await page.goto(`/orders/${order.id as string}`);
    await expect(page.locator('body')).toContainText('ORD-', { timeout: 8000 });
    await expect(page.getByRole('button', { name: /create invoice/i })).toBeVisible({ timeout: 5000 });
  });

  test('create invoice from order navigates to invoice page', async ({ page }) => {
    const account = await apiCreate('accounts', { name: 'Invoice Trigger Corp' }, token);
    const order = await apiCreate('orders', {
      number: `ORD-${Date.now()}`, accountId: account.id as string,
      status: 'Pending', paymentStatus: 'Unpaid', orderDate: '2026-01-01',
    }, token);
    await page.goto(`/orders/${order.id as string}`);
    await expect(page.getByRole('button', { name: /create invoice/i })).toBeVisible({ timeout: 8000 });
    await page.getByRole('button', { name: /create invoice/i }).click();
    await expect(page).toHaveURL(/\/invoices\//, { timeout: 10000 });
    await expect(page.locator('body')).not.toContainText('Error', { timeout: 5000 });
  });
});

import { test, expect } from '@playwright/test';

const dashboardPayload = {
  stats: {
    totalActiveVendors: 1,
    posPendingMyApproval: 1,
    invoicesPendingReview: 1,
    contractsExpiringThisMonth: 0,
  },
  charts: {
    poVolumeByMonth: [],
    poSpendByMonth: [],
    invoiceStatusBreakdown: [],
  },
  topVendorsByPOValue: [],
  oldestPendingPO: null,
  recentActivity: [],
};

test('user can login and reach dashboard', async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.endsWith('/auth/login') && method === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: 'test-token' }) });
      return;
    }

    if (url.endsWith('/auth/me') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'u1',
            name: 'Test User',
            email: 'test@example.com',
            role: 'ADMIN',
            companyId: null,
          },
        }),
      });
      return;
    }

    if (url.endsWith('/dashboard/stats') && method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(dashboardPayload) });
      return;
    }

    if (url.endsWith('/notifications') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ notifications: [], unreadCount: 0 }),
      });
      return;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await page.goto('/login');
  await page.getByLabel('Email address').fill('admin@example.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('Operational snapshot for your vendor platform.')).toBeVisible();
});

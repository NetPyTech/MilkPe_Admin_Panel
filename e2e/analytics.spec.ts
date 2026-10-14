import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test('sign-in lands on the Overview, and the Growth tabs all load without an error', async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
  await expect(page.getByText('New users, yesterday')).toBeVisible();
  await expect(page.getByText(/Today so far:/).first()).toBeVisible();

  await page.getByRole('link', { name: 'Growth' }).click();
  await expect(page.getByText('New users per day', { exact: true })).toBeVisible();
  for (const [tab, marker] of [
    ['Funnel', 'Email sign-ups: how far people got'], ['Active users', 'Active today'], ['Retention', 'Week of'],
    ['Collections', 'Group by'], ['Usage', 'Notifications read, last 30 days'], ['App versions', 'Users with a known version'],
    ['Referrals', 'Codes redeemed'], ['Geography', 'Users by state'],
  ] as const) {
    await page.getByRole('tab', { name: tab }).click();
    await expect(page.getByText(marker, { exact: true }).first()).toBeVisible();
    await expect(page.locator('p[role="alert"], div[role="alert"]').filter({ hasText: /failed|unexpected|could not/i })).toHaveCount(0);
  }
});

test('the trend range can be switched and a chart can be read as a table', async ({ page }) => {
  await signIn(page);
  await page.getByRole('link', { name: 'Growth' }).click();
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Period').selectOption('7');
  await page.waitForURL(/days=7/);
  await page.getByRole('button', { name: 'Show as table' }).first().click();
  await expect(page.getByRole('table').first()).toBeVisible();
  await expect(page.getByRole('table').first().locator('tbody tr')).toHaveCount(7);
});

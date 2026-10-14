import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test('System health lists every scheduled job and the calculation-service check', async ({ page }) => {
  await signIn(page);
  await page.getByRole('link', { name: 'Health' }).click();
  await expect(page.getByRole('heading', { name: 'System health' })).toBeVisible();
  const jobs = page.getByRole('region', { name: 'Scheduled jobs' });
  for (const label of ['Send scheduled announcements', 'Build the daily numbers', 'Remove old activity rows']) {
    await expect(jobs.getByText(label)).toBeVisible();
  }
  await expect(page.getByRole('region', { name: 'Calculation service' })).toBeVisible();
  await expect(page.getByText(/Refreshes every minute/)).toBeVisible();
});

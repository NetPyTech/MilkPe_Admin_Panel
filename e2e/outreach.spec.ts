import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test('build and save a group, then write, test, publish and retract an announcement to one person', async ({ page }) => {
  test.setTimeout(120_000);
  const stamp = Date.now();
  const groupName = `E2E group ${stamp}`;
  await signIn(page);
  await page.getByRole('link', { name: 'Outreach' }).click();

  // A group of people, counted live.
  await page.getByRole('tab', { name: 'Groups' }).click();
  await page.getByRole('button', { name: 'New group' }).click();
  await page.getByLabel('Name', { exact: true }).fill(groupName);
  await page.getByLabel('Add a filter').selectOption('language');
  await expect(page.getByText(/match now/)).toBeVisible();
  await page.getByRole('button', { name: 'Create group' }).click();
  await expect(page.getByRole('cell', { name: groupName })).toBeVisible();

  // An announcement to one listed person.
  await page.getByRole('tab', { name: 'Announcements' }).click();
  await page.getByRole('link', { name: 'New announcement' }).click();
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Send to').selectOption('users');
  await page.getByLabel('Phone numbers').fill('9999900078');
  await page.getByLabel('Title (English)').fill(`E2E ${stamp}`);
  await page.getByLabel('Message (English)').fill('Sent by the end-to-end test.');
  await expect(page.getByRole('group', { name: 'Preview' })).toContainText(`E2E ${stamp}`);
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page).toHaveURL(/\/outreach\/announcements\/[0-9a-f-]{36}/);

  await page.getByRole('button', { name: 'Send a test to me' }).click();
  await expect(page.getByText('A test was sent to you.')).toBeVisible();

  await page.getByRole('button', { name: 'Publish…' }).click();
  await expect(page.getByText(/1 person/)).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Send now' }).click();
  await expect(page.getByText('Published.', { exact: true })).toBeVisible(); // wait for the answer: a reload now would abort the request
  await expect.poll(async () => { await page.reload(); await page.waitForLoadState('networkidle'); return page.getByText('Reached', { exact: true }).count(); }, { timeout: 30_000 }).toBeGreaterThan(0);

  await page.getByRole('button', { name: 'Retract' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Retract' }).click();
  await expect(page.getByText('Retracted.', { exact: true })).toBeVisible(); // wait for the answer: a reload now would abort the request
  await expect(page.getByText(/This was retracted/)).toBeVisible();

  // Tidy up the group.
  await page.goto('/outreach?tab=groups');
  const row = page.getByRole('row').filter({ hasText: groupName });
  await row.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete group' }).click();
  await expect(page.getByRole('cell', { name: groupName })).toHaveCount(0);
});

import { expect, test } from '@playwright/test';
import { openUser, signIn } from './helpers';

test('sign in, find a dairy owner, deactivate and reactivate with a reason, and see it in the audit', async ({ page }) => {
  await page.goto('/overview');
  await expect(page).toHaveURL(/\/login/);
  await signIn(page);
  await openUser(page, 'E2E Dairy Owner');

  await page.getByRole('button', { name: 'Deactivate' }).click();
  const confirm = page.getByRole('dialog').getByRole('button', { name: 'Deactivate' });
  await expect(confirm).toBeDisabled();
  await page.getByLabel('Reason').fill('e2e check');
  await confirm.click();
  await expect(page.getByRole('button', { name: 'Reactivate' })).toBeVisible();

  await page.getByRole('button', { name: 'Reactivate' }).click();
  await page.getByLabel('Reason').fill('e2e restore');
  await page.getByRole('dialog').getByRole('button', { name: 'Reactivate' }).click();
  await expect(page.getByRole('button', { name: 'Deactivate' })).toBeVisible();

  await page.getByRole('link', { name: 'Audit' }).click();
  await expect(page.getByText('user.deactivate').first()).toBeVisible();
  await expect(page.getByText('e2e check').first()).toBeVisible();
});

test('a wrong password shows the server message and does not sign in', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Email', { exact: true }).fill('e2e-admin@example.com');
  await page.getByLabel('Password', { exact: true }).fill('wrong');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Incorrect email or password.')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

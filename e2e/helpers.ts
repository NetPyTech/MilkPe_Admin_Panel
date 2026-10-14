import { expect, type Page } from '@playwright/test';

export async function signIn(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle'); // the form must be hydrated before it is used
  await page.getByLabel('Email', { exact: true }).fill('e2e-admin@example.com');
  await page.getByLabel('Password', { exact: true }).fill('e2e-Password-1');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/overview/);
}

export async function openUser(page: Page, name: string) {
  await page.getByRole('link', { name: 'Users' }).click();
  await expect(page).toHaveURL(/\/users/);
  await page.getByPlaceholder(/name, email, phone/i).fill(name);
  await page.waitForURL(/search=/); // the search is applied after a short pause; clicking before that hits the old list
  await page.getByRole('link', { name: new RegExp(name) }).click();
  await expect(page).toHaveURL(/\/users\/[0-9a-f-]{36}/);
  await expect(page.getByRole('heading', { name })).toBeVisible();
}

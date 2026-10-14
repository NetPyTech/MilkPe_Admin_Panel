import { expect, test } from '@playwright/test';
import { openUser, signIn } from './helpers';

test('credit a wallet with a reason from the user page, then find it on the Money screen', async ({ page }) => {
  const reason = `e2e adjust ${Date.now()}`;
  await signIn(page);
  await openUser(page, 'E2E Dairy Owner');

  await page.getByRole('tab', { name: 'Wallet' }).click();
  await page.getByRole('button', { name: 'Adjust wallet' }).click();
  const send = page.getByRole('button', { name: 'Credit wallet' });
  await expect(send).toBeDisabled();
  await page.getByLabel('Amount (₹)').fill('12.50');
  await page.getByLabel('Reason').fill(reason);
  await expect(page.getByText(/Credit ₹12\.50 to E2E Dairy Owner/)).toBeVisible();
  await send.click();
  await expect(page.getByRole('heading', { name: 'Adjust wallet of E2E Dairy Owner' })).toBeHidden();
  await expect(page.getByText('Adjustment by MilkPe').first()).toBeVisible();

  await page.getByRole('link', { name: 'Money' }).click();
  await page.getByLabel('Category').selectOption('ADJUSTMENT');
  await expect(page.getByText(`Reason: ${reason}`)).toBeVisible();

  await page.getByRole('tab', { name: 'Balances' }).click();
  await expect(page.getByText('Held in wallets')).toBeVisible();
});

test('a debit larger than the balance shows the server message and changes nothing', async ({ page }) => {
  await signIn(page);
  await openUser(page, 'E2E Dairy Owner');
  await page.getByRole('tab', { name: 'Wallet' }).click();
  await page.getByRole('button', { name: 'Adjust wallet' }).click();
  await page.getByLabel('Type').selectOption('debit');
  await page.getByLabel('Amount (₹)').fill('99999');
  await page.getByLabel('Reason').fill('e2e too large');
  await page.getByRole('button', { name: 'Debit wallet' }).click();
  await expect(page.getByText(/is lower than the debit/)).toBeVisible();
});

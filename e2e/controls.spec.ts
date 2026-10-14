import { expect, test } from '@playwright/test';
import { openUser, signIn } from './helpers';

const API = 'http://localhost:8000/api';

test('change a business setting with a reason, read it in the history, and go back to the default', async ({ page }) => {
  const reason = `e2e fee ${Date.now()}`;
  await signIn(page);
  await page.getByRole('link', { name: 'Controls' }).click();
  const card = page.getByRole('region', { name: 'Collection fee' });
  await expect(card).toBeVisible();
  await expect(card.getByRole('button', { name: /^Save/ })).toBeDisabled();

  // The server's own range check, shown beside the field.
  await card.getByLabel('Rupees per kg of milk').fill('99');
  await card.getByRole('button', { name: /^Save/ }).click();
  await page.getByRole('dialog').getByLabel('Reason').fill('e2e too high');
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Use an amount from 0 to 10');
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
  await expect(card.getByLabel('Rupees per kg of milk')).toHaveAttribute('aria-invalid', 'true');

  await card.getByLabel('Rupees per kg of milk').fill('0.013');
  await card.getByRole('button', { name: /^Save/ }).click();
  await page.getByRole('dialog').getByLabel('Reason').fill(reason);
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Collection fee saved.')).toBeVisible();
  await expect(card.getByText('Changed')).toBeVisible();

  await card.getByRole('button', { name: 'History' }).click();
  await expect(page.getByRole('dialog').getByText(reason)).toBeVisible();
  await page.keyboard.press('Escape');

  await card.getByRole('button', { name: 'Back to default' }).click();
  await page.getByRole('dialog').getByLabel('Reason').fill('e2e back to normal');
  await page.getByRole('dialog').getByRole('button', { name: 'Back to default' }).click();
  await expect(page.getByText('Collection fee is back to its default.')).toBeVisible();
  await expect(card.getByText('Default')).toBeVisible();
  await expect(card.getByLabel('Rupees per kg of milk')).toHaveValue('0.012');
});

test('extend a dairy owner’s trial from their page', async ({ page }) => {
  await signIn(page);
  await openUser(page, 'E2E Dairy Owner');
  await page.getByRole('tab', { name: 'Dairy and supplier' }).click();
  await expect(page.getByText('Free trial ends')).toBeVisible();
  await page.getByRole('button', { name: 'Extend trial' }).click();
  const send = page.getByRole('dialog').getByRole('button', { name: 'Extend trial' });
  await expect(send).toBeDisabled();
  await page.getByLabel('Days to add').fill('1');
  await page.getByLabel('Reason').fill('e2e goodwill');
  await send.click();
  await expect(page.getByText(/E2E Dairy Owner's trial now ends on/)).toBeVisible();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByText('Trial extended by')).toBeVisible();
});

test('a deletion request is approved, then rejected with a note', async ({ page, request }) => {
  const phone = `9${String(Date.now()).slice(-9)}`;
  const login = await request.post(`${API}/login/`, { data: { identifier: phone } });
  const { token } = await login.json();
  const asked = await request.post(`${API}/user/deletion-request/`, { headers: { Authorization: `Bearer ${token}` }, data: { reason: 'e2e closing my dairy' } });
  expect(asked.status()).toBe(201);

  await signIn(page);
  await page.getByRole('link', { name: 'Controls' }).click();
  await page.getByRole('tab', { name: 'Account deletion' }).click();
  const row = page.getByRole('row').filter({ hasText: `+91${phone}` });
  await expect(row).toContainText('e2e closing my dairy');
  await row.getByRole('button', { name: 'Approve' }).click();
  await page.getByRole('dialog').getByLabel('Reason').fill('Verified by phone');
  await page.getByRole('dialog').getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByText('Request approved.')).toBeVisible();
  await expect(row).toBeHidden(); // the list shows requests waiting for a decision

  await page.getByLabel('Show').selectOption('approved');
  const approved = page.getByRole('row').filter({ hasText: `+91${phone}` });
  await expect(approved.getByRole('button', { name: 'Close account' })).toBeVisible();
  await approved.getByRole('button', { name: 'Reject' }).click();
  await page.getByRole('dialog').getByLabel('Reason').fill('Still owes a bill');
  await page.getByRole('dialog').getByRole('button', { name: 'Reject' }).click();
  await expect(page.getByText('Request rejected.')).toBeVisible();

  await page.getByLabel('Show').selectOption('rejected');
  await expect(page.getByRole('row').filter({ hasText: `+91${phone}` })).toContainText('Still owes a bill');
});

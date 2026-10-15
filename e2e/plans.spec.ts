import { expect, test } from '@playwright/test';
import { openUser, signIn } from './helpers';

test('the owner creates a plan, changes it, gives it to a dairy and manages the subscription', async ({ page }) => {
  const name = `E2E Plan ${Date.now()}`;
  await signIn(page);

  // create
  await page.getByRole('link', { name: 'Plans' }).click();
  await expect(page).toHaveURL(/\/plans/);
  await page.getByRole('link', { name: 'New plan' }).click();
  const create = page.getByRole('button', { name: 'Create plan' });
  await expect(create).toBeDisabled();
  await page.getByLabel('Name (English)').fill(name);
  await page.getByLabel('Badge (English)').fill('Best value');
  await page.getByLabel('Price (₹)').fill('399');
  await page.getByLabel('Limit milk weight').check();
  await page.getByLabel('Milk weight limit (kg)').fill('2000');
  await page.getByLabel('Limit suppliers').check();
  await page.getByLabel('Suppliers limit (suppliers)').fill('50');
  await expect(page.getByRole('group', { name: 'Preview' })).toContainText('2,000 kg every 30 days');
  await page.getByLabel('Reason for this change').fill('e2e launch plan');
  await create.click();
  await expect(page).toHaveURL(/\/plans$/);
  const row = page.getByRole('row', { name: new RegExp(name) });
  await expect(row).toContainText('₹399.00');
  await expect(row).toContainText('2,000 kg every 30 days · 50 suppliers');
  await expect(row).toContainText('On sale');

  // change the price
  await row.getByRole('link', { name: 'Edit' }).click();
  await expect(page.getByRole('heading', { name: `Edit plan: ${name}` })).toBeVisible();
  await page.getByLabel('Price (₹)').fill('449');
  await page.getByLabel('Reason for this change').fill('e2e price rise');
  await page.getByRole('button', { name: 'Save plan' }).click();
  await expect(page.getByRole('row', { name: new RegExp(name) })).toContainText('₹449.00');

  // give it to a dairy from the user page
  await openUser(page, 'E2E Dairy Owner');
  await page.getByRole('tab', { name: 'Dairy and supplier' }).click();
  await page.getByRole('button', { name: 'Give a plan' }).click();
  const give = page.getByRole('button', { name: 'Give plan' });
  await expect(give).toBeDisabled();
  await page.getByLabel('Plan', { exact: true }).selectOption({ label: name });
  await page.getByLabel('Days (optional)').fill('20');
  await page.getByLabel('Reason').fill('e2e goodwill gift');
  await give.click();
  await expect(page.getByRole('heading', { name: /Give a plan to/ })).toBeHidden();
  // a dairy still in its free trial gets the plan after it ("Next: …"); one past the trial has it running at once
  await expect(page.getByRole('region', { name: 'Subscription plan' }).getByText(new RegExp(name))).toBeVisible();

  // find it among the subscriptions, extend it, then cancel it
  await page.getByRole('link', { name: 'Plans' }).click();
  await page.getByRole('tab', { name: 'Subscriptions' }).click();
  await expect(page.getByText('Running now')).toBeVisible();
  await page.getByPlaceholder(/name, phone, plan/i).fill(name);
  await page.waitForURL(/search=/);
  const sub = page.getByRole('row', { name: new RegExp(name) });
  await expect(sub).toContainText(/Running|Starts later/);
  await expect(sub).toContainText('Gift');
  await sub.getByRole('button', { name: 'Usage' }).click();
  await expect(page.getByRole('heading', { name: `${name}: what it covered` })).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).first().click();
  await sub.getByRole('button', { name: 'Extend' }).click();
  await page.getByLabel('Days to add').fill('5');
  await page.getByLabel('Reason').fill('e2e make up for downtime');
  await page.getByRole('button', { name: 'Extend plan' }).click();
  await expect(page.getByRole('heading', { name: /Extend .* for/ })).toBeHidden();
  await sub.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByText(/This was a gift, so no money was taken/)).toBeVisible();
  await page.getByLabel('Reason').fill('e2e cancel');
  await page.getByRole('button', { name: 'Cancel subscription' }).click();
  await expect(page.getByRole('row', { name: new RegExp(name) })).toContainText('Cancelled');

  // take the plan off sale
  await page.getByRole('tab', { name: 'Plans' }).click();
  const planRow = page.getByRole('row', { name: new RegExp(name) });
  await planRow.getByRole('button', { name: 'Take off sale' }).click();
  await page.getByLabel('Reason').fill('e2e retire');
  await page.getByRole('button', { name: 'Take off sale' }).last().click();
  await expect(page.getByRole('row', { name: new RegExp(name) })).toContainText('Off sale');
});

test('a plan cannot be saved until something is changed, and an unused plan can be deleted', async ({ page }) => {
  const name = `E2E same ${Date.now()}`;
  await signIn(page);
  await page.goto('/plans/new');
  await page.getByLabel('Name (English)').fill(name);
  await page.getByLabel('Price (₹)').fill('99');
  await page.getByLabel('Reason for this change').fill('e2e create');
  await page.getByRole('button', { name: 'Create plan' }).click();
  await expect(page).toHaveURL(/\/plans$/);
  await page.getByRole('row', { name: new RegExp(name) }).getByRole('link', { name: 'Edit' }).click();
  await page.getByLabel('Reason for this change').fill('e2e save without changing anything');
  await expect(page.getByRole('button', { name: 'Save plan' })).toBeDisabled();
  await expect(page.getByText(/Change something to save/)).toBeVisible();
  await page.getByLabel('Badge (English)').fill('New');
  await expect(page.getByRole('button', { name: 'Save plan' })).toBeEnabled();
  await page.getByLabel('Badge (English)').fill('');
  await expect(page.getByRole('button', { name: 'Save plan' })).toBeDisabled();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.getByRole('row', { name: new RegExp(name) }).getByRole('button', { name: 'Delete' }).click();
  await page.getByLabel('Reason').fill('e2e cleanup');
  await page.getByRole('button', { name: 'Delete plan' }).click();
  await expect(page.getByRole('row', { name: new RegExp(name) })).toHaveCount(0);
});

test('the Users filter finds dairies by plan, and Money shows plan sales columns', async ({ page }) => {
  await signIn(page);
  await page.getByRole('link', { name: 'Users' }).click();
  await page.getByLabel('Subscription plan').selectOption('none');
  await page.waitForURL(/plan=none/);
  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
  await page.getByRole('link', { name: 'Money' }).click();
  await page.getByRole('tab', { name: 'Revenue' }).click();
  await expect(page.getByRole('columnheader', { name: 'Plan sales' })).toBeVisible();
});

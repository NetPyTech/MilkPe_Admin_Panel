import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import list from '../fixtures/plans-list.json';
import detail from '../fixtures/subscriptions-detail.json';
import subscriptions from '../fixtures/subscriptions-list.json';
import overview from '../fixtures/subscriptions-overview.json';

const nav = vi.hoisted(() => ({ router: { replace: vi.fn(), push: vi.fn() }, query: '' }));
vi.mock('next/navigation', () => ({ useRouter: () => nav.router, useSearchParams: () => new URLSearchParams(nav.query) }));

import PlansPage from '@/app/(admin)/plans/page';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const calls: { url: string; method: string; body: Record<string, unknown> }[] = [];

function stub(extra: (url: string, init: RequestInit) => Response | undefined = () => undefined) {
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
    calls.push({ url, method: init.method ?? 'GET', body: init.body ? JSON.parse(String(init.body)) : {} });
    return extra(url, init)
      ?? (url.includes('/subscription-plans/') && (init.method === 'PATCH') ? json(200, list.results[0])
        : url.endsWith('/subscription-plans/') ? json(200, list)
        : url.includes('/subscriptions/overview/') ? json(200, overview)
        : url.includes('/subscriptions/') && url.includes('?') || url.endsWith('/subscriptions/') ? json(200, subscriptions)
        : url.includes('/subscriptions/') ? json(200, detail)
        : json(404, { error: 'unexpected call in test' }));
  }));
}
const mount = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><PlansPage /></QueryClientProvider>);

beforeEach(() => { calls.length = 0; nav.query = ''; nav.router.replace.mockClear(); });
afterEach(() => vi.unstubAllGlobals());

describe('the Plans tab', () => {
  it('lists the plans and has a New plan link', async () => {
    stub();
    mount();
    expect(await screen.findByText(list.results[0].name)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'New plan' })).toHaveAttribute('href', '/plans/new');
  });
  it('takes a plan off sale only with a reason, and says what will happen', async () => {
    stub();
    mount();
    const onSale = list.results.find((plan) => plan.is_active)!;
    const row = (await screen.findByText(onSale.name)).closest('tr')!;
    await userEvent.click(within(row).getByRole('button', { name: 'Take off sale' }));
    expect(screen.getByText(/Dairies can no longer buy it/)).toBeInTheDocument();
    const confirm = screen.getByRole('button', { name: 'Take off sale', hidden: false, description: undefined });
    expect(confirm).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Reason'), 'Retiring this plan');
    await userEvent.click(confirm);
    await waitFor(() => expect(calls.some((call) => call.method === 'PATCH')).toBe(true));
    const patch = calls.find((call) => call.method === 'PATCH')!;
    expect(patch.url).toBe(`/api/proxy/superadmin/subscription-plans/${onSale.id}/`);
    expect(patch.body).toEqual({ is_active: false, reason: 'Retiring this plan' });
  });
  it('deletes a plan nobody ever held, with a reason', async () => {
    stub((url, init) => (init.method === 'DELETE' ? new Response(null, { status: 204 }) : undefined));
    mount();
    const unsold = list.results.find((plan) => (plan.subscribers?.on_record ?? 0) === 0)!;
    const row = (await screen.findByText(unsold.name)).closest('tr')!;
    await userEvent.click(within(row).getByRole('button', { name: 'Delete' }));
    await userEvent.type(screen.getByLabelText('Reason'), 'Never launched');
    await userEvent.click(screen.getByRole('button', { name: 'Delete plan' }));
    await waitFor(() => expect(calls.some((call) => call.method === 'DELETE')).toBe(true));
    expect(calls.find((call) => call.method === 'DELETE')!).toMatchObject({ url: `/api/proxy/superadmin/subscription-plans/${unsold.id}/`, body: { reason: 'Never launched' } });
  });
  it('does not carry a reason typed in one dialog over to the next one', async () => {
    stub();
    mount();
    const [first, second] = list.results.filter((plan) => plan.is_active);
    await userEvent.click(within((await screen.findByText(first.name)).closest('tr')!).getByRole('button', { name: 'Take off sale' }));
    await userEvent.type(screen.getByLabelText('Reason'), 'meant for another plan');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await userEvent.click(within(screen.getByText(second.name).closest('tr')!).getByRole('button', { name: 'Take off sale' }));
    expect(screen.getByLabelText('Reason')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Take off sale', description: undefined })).toBeDisabled();
  });
  it('shows the server message when a change is refused', async () => {
    stub((url, init) => (init.method === 'PATCH' ? json(409, { error: 'Nothing was changed.' }) : undefined));
    mount();
    const onSale = list.results.find((plan) => plan.is_active)!;
    const row = (await screen.findByText(onSale.name)).closest('tr')!;
    await userEvent.click(within(row).getByRole('button', { name: 'Take off sale' }));
    await userEvent.type(screen.getByLabelText('Reason'), 'Retiring this plan');
    await userEvent.click(screen.getByRole('button', { name: 'Take off sale', description: undefined }));
    expect(await screen.findByText('Nothing was changed.')).toBeInTheDocument();
  });
});

describe('the tab in the address', () => {
  it('opens the Plans tab for a value it does not know', async () => {
    nav.query = 'tab=subscription';   // a typo, or an old link
    stub();
    mount();
    expect(await screen.findByText(list.results[0].name)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Plans', selected: true })).toBeInTheDocument();
  });
});

describe('the Subscriptions tab', () => {
  beforeEach(() => { nav.query = 'tab=subscriptions'; });

  it('shows the numbers, the filters and the subscriptions', async () => {
    stub();
    mount();
    await userEvent.click(await screen.findByRole('tab', { name: 'Subscriptions' }));
    expect(await screen.findByText('Running now')).toBeInTheDocument();
    const table = (await screen.findByRole('table')).closest('div')!;
    expect(within(table).getByText('Running')).toBeInTheDocument();   // the status badge (the filter list also has the word)
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
    expect(screen.getByLabelText('Stuck payments only')).toBeInTheDocument();
  });
  it('cancels a gift only with a reason and says that no money was taken', async () => {
    stub();
    mount();
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(screen.getByText(/This was a gift, so no money was taken/)).toBeInTheDocument();
    expect(screen.queryByText(/Nothing is refunded here/)).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Reason'), 'Dairy closed down');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel subscription' }));
    await waitFor(() => expect(calls.some((call) => call.method === 'POST')).toBe(true));
    expect(calls.find((call) => call.method === 'POST')!).toMatchObject({ url: `/api/proxy/superadmin/subscriptions/${subscriptions.results[0].id}/cancel/`, body: { reason: 'Dairy closed down' } });
  });
  it('tells the owner nothing is refunded when a bought plan is cancelled', async () => {
    const bought = { ...subscriptions, results: [{ ...subscriptions.results[0], source: 'purchase', price: '399.00', paid_at: '2026-10-01T00:00:00Z', granted_by: null }] };
    stub((url) => (/\/subscriptions\/(\?|$)/.test(url) ? json(200, bought) : undefined));
    mount();
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(screen.getByText(/Nothing is refunded here: return the money through Razorpay yourself/)).toBeInTheDocument();
  });
  it('sends the stuck-payments box, the ending list and Clear to the address', async () => {
    stub();
    mount();
    await userEvent.click(await screen.findByLabelText('Stuck payments only'));
    expect(nav.router.replace).toHaveBeenLastCalledWith(expect.stringContaining('stuck=true'));
    await userEvent.selectOptions(screen.getByLabelText('Running plans ending within'), '7');
    expect(nav.router.replace).toHaveBeenLastCalledWith(expect.stringContaining('ending_within=7'));
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(nav.router.replace).toHaveBeenLastCalledWith('/plans?tab=subscriptions');
  });
  it('pages with the cursor the server gave', async () => {
    const paged = { ...subscriptions, next: 'http://x/api/superadmin/subscriptions/?cursor=abc123', previous: null };
    stub((url) => (/\/subscriptions\/(\?|$)/.test(url) ? json(200, paged) : undefined));
    mount();
    await userEvent.click(await screen.findByRole('button', { name: 'Next' }));
    expect(nav.router.replace).toHaveBeenLastCalledWith(expect.stringContaining('cursor=abc123'));
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
  });
  it('sends a filter to the address', async () => {
    stub();
    mount();
    await userEvent.selectOptions(await screen.findByLabelText('Status'), 'pending');
    expect(nav.router.replace).toHaveBeenCalledWith(expect.stringContaining('state=pending'));
  });
});

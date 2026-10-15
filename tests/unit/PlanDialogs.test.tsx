import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import grant from '../fixtures/plans-grant.json';
import list from '../fixtures/plans-list.json';
import extended from '../fixtures/subscriptions-extend.json';
import detail from '../fixtures/subscriptions-detail.json';
import subscriptions from '../fixtures/subscriptions-list.json';
import { ExtendPlanDialog } from '@/features/plans/ExtendPlanDialog';
import { GrantPlanDialog } from '@/features/plans/GrantPlanDialog';
import type { SubscriptionRow } from '@/features/plans/schemas';
import { UsageDialog } from '@/features/plans/UsageDialog';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const wrap = (node: React.ReactNode) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{node}</QueryClientProvider>);
const calls: { url: string; method: string; body: Record<string, unknown> }[] = [];
const row = subscriptions.results[0] as SubscriptionRow;

beforeEach(() => { calls.length = 0; });
afterEach(() => vi.unstubAllGlobals());
const stub = (answer: (url: string, init: RequestInit) => Response) =>
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
    calls.push({ url, method: init.method ?? 'GET', body: init.body ? JSON.parse(String(init.body)) : {} });
    return answer(url, init);
  }));

describe('GrantPlanDialog', () => {
  it('needs a plan and a reason, shows what the plan is, and gives it with the optional days', async () => {
    stub((url, init) => (init.method === 'POST' ? json(201, grant) : json(200, list)));
    const onClose = vi.fn();
    wrap(<GrantPlanDialog userId="u1" who="Ramesh" onClose={onClose} />);
    const give = screen.getByRole('button', { name: 'Give plan' });
    expect(give).toBeDisabled();
    const plan = list.results.find((p) => p.weight_cap_kg !== null)!;
    await screen.findByRole('option', { name: plan.name });   // the plans have arrived
    await userEvent.selectOptions(screen.getByLabelText('Plan'), plan.id);
    expect(screen.getByText(/30 days · 2,000 kg every 30 days/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Days (optional)'), '15');
    expect(give).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Reason'), 'Goodwill after an outage');
    await userEvent.click(give);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const post = calls.find((call) => call.method === 'POST')!;
    expect(post.url).toBe('/api/proxy/superadmin/users/u1/subscription-grant/');
    expect(post.body).toEqual({ plan_id: plan.id, days: 15, reason: 'Goodwill after an outage' });
  });
  it('says so, and offers to try again, when the plans cannot be loaded', async () => {
    stub(() => json(502, { error: 'Bad gateway' }));
    wrap(<GrantPlanDialog userId="u1" who="Ramesh" onClose={vi.fn()} />);
    expect(await screen.findByText(/The plans could not be loaded/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
  it('rejects days outside 1 to 3650 even with a plan and a reason', async () => {
    stub((url, init) => (init.method === 'POST' ? json(201, grant) : json(200, list)));
    wrap(<GrantPlanDialog userId="u1" who="Ramesh" onClose={vi.fn()} />);
    await screen.findByRole('option', { name: list.results[0].name });
    await userEvent.selectOptions(screen.getByLabelText('Plan'), list.results[0].id);
    await userEvent.type(screen.getByLabelText('Reason'), 'Goodwill gift');
    const give = screen.getByRole('button', { name: 'Give plan' });
    for (const bad of ['0', '3651', 'x', '1.5']) {
      await userEvent.clear(screen.getByLabelText('Days (optional)'));
      await userEvent.type(screen.getByLabelText('Days (optional)'), bad);
      expect(give, bad).toBeDisabled();
    }
    await userEvent.clear(screen.getByLabelText('Days (optional)'));
    expect(give).toBeEnabled();   // empty means the plan's own length
  });
  it('offers plans that are off sale too, marked as such, and leaves days out when empty', async () => {
    stub((url, init) => (init.method === 'POST' ? json(201, grant) : json(200, list)));
    wrap(<GrantPlanDialog userId="u1" who="Ramesh" onClose={vi.fn()} />);
    const hidden = list.results.find((p) => !p.is_active)!;
    await screen.findByRole('option', { name: `${hidden.name} (off sale)` });
    await userEvent.selectOptions(screen.getByLabelText('Plan'), hidden.id);
    await userEvent.type(screen.getByLabelText('Reason'), 'A private plan');
    await userEvent.click(screen.getByRole('button', { name: 'Give plan' }));
    await waitFor(() => expect(calls.some((call) => call.method === 'POST')).toBe(true));
    expect(calls.find((call) => call.method === 'POST')!.body).toEqual({ plan_id: hidden.id, reason: 'A private plan' });
  });
  it('shows the server message when it is refused', async () => {
    stub((url, init) => (init.method === 'POST' ? json(409, { error: 'This user has no dairy, so there is nothing to give a plan to.' }) : json(200, list)));
    wrap(<GrantPlanDialog userId="u1" who="Ramesh" onClose={vi.fn()} />);
    await screen.findByRole('option', { name: list.results[0].name });
    await userEvent.selectOptions(screen.getByLabelText('Plan'), list.results[0].id);
    await userEvent.type(screen.getByLabelText('Reason'), 'Goodwill gift');
    await userEvent.click(screen.getByRole('button', { name: 'Give plan' }));
    expect(await screen.findByText(/nothing to give a plan to/)).toBeInTheDocument();
  });
});

describe('ExtendPlanDialog', () => {
  it('accepts 1 to 3650 days with a reason and sends them', async () => {
    stub(() => json(200, extended));
    const onClose = vi.fn();
    wrap(<ExtendPlanDialog row={row} onClose={onClose} />);
    const send = screen.getByRole('button', { name: 'Extend plan' });
    await userEvent.type(screen.getByLabelText('Reason'), 'Make up for downtime');   // a good reason, so only the days can disable it
    for (const bad of ['0', '3651', 'x', '1.5']) {
      await userEvent.clear(screen.getByLabelText('Days to add'));
      await userEvent.type(screen.getByLabelText('Days to add'), bad);
      expect(send, bad).toBeDisabled();
    }
    await userEvent.clear(screen.getByLabelText('Days to add'));
    expect(send, 'empty').toBeDisabled();
    for (const good of ['1', '3650']) {
      await userEvent.clear(screen.getByLabelText('Days to add'));
      await userEvent.type(screen.getByLabelText('Days to add'), good);
      expect(send, good).toBeEnabled();
    }
    await userEvent.clear(screen.getByLabelText('Days to add'));
    await userEvent.type(screen.getByLabelText('Days to add'), '7');
    await userEvent.click(send);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(calls[0]).toMatchObject({ url: `/api/proxy/superadmin/subscriptions/${row.id}/extend/`, method: 'POST', body: { days: 7, reason: 'Make up for downtime' } });
  });
  it('shows the server message when it is refused', async () => {
    stub(() => json(409, { error: 'Only a subscription that is running or waiting to start can be extended.' }));
    wrap(<ExtendPlanDialog row={row} onClose={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Days to add'), '7');
    await userEvent.type(screen.getByLabelText('Reason'), 'Too late for it');
    await userEvent.click(screen.getByRole('button', { name: 'Extend plan' }));
    expect(await screen.findByText(/can be extended/)).toBeInTheDocument();
  });
});

describe('UsageDialog', () => {
  it('lists what each limit period recorded', async () => {
    stub(() => json(200, detail));
    wrap(<UsageDialog row={row} onClose={vi.fn()} />);
    expect(await screen.findByText('100 kg')).toBeInTheDocument();
    expect(screen.getByText('Collections')).toBeInTheDocument();
  });
  it('says so when nothing was recorded', async () => {
    stub(() => json(200, { ...detail, usage: [] }));
    wrap(<UsageDialog row={row} onClose={vi.fn()} />);
    expect(await screen.findByText('Nothing has been recorded yet.')).toBeInTheDocument();
  });
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import created from '../fixtures/plans-create.json';
import list from '../fixtures/plans-list.json';

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

import { PlanEditor } from '@/features/plans/PlanEditor';
import type { Plan } from '@/features/plans/schemas';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const mount = (plan: Plan | null) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><PlanEditor plan={plan} /></QueryClientProvider>);
const calls: { url: string; method: string; body: Record<string, unknown> }[] = [];

beforeEach(() => {
  calls.length = 0;
  router.replace.mockClear();
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
    calls.push({ url, method: init.method ?? 'GET', body: init.body ? JSON.parse(String(init.body)) : {} });
    return json(init.method === 'POST' ? 201 : 200, created);
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe('a new plan', () => {
  it('cannot be saved until it has a name, a price and a reason, and says what is missing', async () => {
    mount(null);
    const save = screen.getByRole('button', { name: 'Create plan' });
    expect(save).toBeDisabled();
    expect(screen.getByText('Give the plan a name.')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Name (English)'), 'Starter');
    await userEvent.type(screen.getByLabelText('Price (₹)'), '399');
    expect(save).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Reason for this change'), 'Launch plan');
    expect(save).toBeEnabled();
  });

  it('is the full plan until a limit is switched on, and shows how the card will look', async () => {
    mount(null);
    await userEvent.type(screen.getByLabelText('Name (English)'), 'Pro');
    await userEvent.type(screen.getByLabelText('Price (₹)'), '999');
    const preview = screen.getByRole('group', { name: 'Preview' });
    expect(preview).toHaveTextContent('Pro');
    expect(preview).toHaveTextContent('₹999.00');
    expect(preview).toHaveTextContent('No limits: unlimited milk, suppliers and reports. No wallet fee.');
    const weight = screen.getByLabelText('Milk weight limit (kg)');
    expect(weight).toBeDisabled();
    await userEvent.click(screen.getByLabelText('Limit milk weight'));
    expect(weight).toBeEnabled();
    await userEvent.type(weight, '2000');
    expect(preview).toHaveTextContent('2,000 kg every 30 days');
  });

  it('sends the plan with null for the limits that are off, then goes back to the list', async () => {
    mount(null);
    await userEvent.type(screen.getByLabelText('Name (English)'), 'Starter');
    await userEvent.type(screen.getByLabelText('Badge (English)'), 'Best value');
    await userEvent.type(screen.getByLabelText('Price (₹)'), '399');
    await userEvent.click(screen.getByLabelText('Limit milk weight'));
    await userEvent.type(screen.getByLabelText('Milk weight limit (kg)'), '2000');
    await userEvent.click(screen.getByLabelText('Limit suppliers'));
    await userEvent.type(screen.getByLabelText('Suppliers limit (suppliers)'), '50');
    await userEvent.selectOptions(screen.getByLabelText('Limits start again'), 'week');
    await userEvent.type(screen.getByLabelText('Reason for this change'), 'Launch plan');
    await userEvent.click(screen.getByRole('button', { name: 'Create plan' }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/plans'));
    const post = calls.find((call) => call.method === 'POST')!;
    expect(post.url).toBe('/api/proxy/superadmin/subscription-plans/');
    expect(post.body).toMatchObject({ name: 'Starter', badge: 'Best value', price: '399', duration_days: 30, cap_period: 'week', weight_cap_kg: '2000',
      collections_cap: null, suppliers_cap: 50, reports_cap: null, is_active: true, reason: 'Launch plan', translations: {} });
  });

  it('writes a translation per language and sends only the languages that have text', async () => {
    mount(null);
    await userEvent.type(screen.getByLabelText('Name (English)'), 'Starter');
    await userEvent.type(screen.getByLabelText('Price (₹)'), '399');
    await userEvent.type(screen.getByLabelText('Reason for this change'), 'Launch plan');
    await userEvent.click(screen.getByRole('button', { name: 'Hindi' }));
    expect(screen.getByText(/Leave Hindi empty to show the English text/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Name (Hindi)'), 'स्टार्टर');
    await userEvent.click(screen.getByRole('button', { name: /Hindi/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Create plan' }));
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    expect(calls.find((call) => call.method === 'POST')!.body.translations).toEqual({ hi: { name: 'स्टार्टर' } });
  });

  it('previews a language field by field, falling back to English for what is empty', async () => {
    mount(null);
    await userEvent.type(screen.getByLabelText('Name (English)'), 'Starter');
    await userEvent.type(screen.getByLabelText('Description (English)'), 'For small dairies');
    await userEvent.click(screen.getByRole('button', { name: 'Hindi' }));
    await userEvent.type(screen.getByLabelText('Name (Hindi)'), 'स्टार्टर');
    const preview = screen.getByRole('group', { name: 'Preview' });
    expect(preview).toHaveTextContent('स्टार्टर');
    expect(preview).toHaveTextContent('For small dairies');   // no Hindi description: the English one, as in the app
  });

  it('shows the server message when it refuses, and stays on the page', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(400, { error: 'Validation Error', detail: { price: ['Ensure this value is greater than or equal to 1.'] } })));
    mount(null);
    await userEvent.type(screen.getByLabelText('Name (English)'), 'Starter');
    await userEvent.type(screen.getByLabelText('Price (₹)'), '399');
    await userEvent.type(screen.getByLabelText('Reason for this change'), 'Launch plan');
    await userEvent.click(screen.getByRole('button', { name: 'Create plan' }));
    expect(await screen.findByText(/price: Ensure this value is greater than or equal to 1/)).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe('an existing plan', () => {
  const held = list.results.find((plan) => (plan.subscribers?.sold ?? 0) > 0 && plan.weight_cap_kg !== null) as Plan;

  it('starts from the saved values, says dairies keep their terms, and saves with PATCH', async () => {
    mount(held);
    expect(screen.getByLabelText('Name (English)')).toHaveValue(held.name);
    expect(screen.getByLabelText('Milk weight limit (kg)')).toHaveValue('2000');
    expect(screen.getByText(/keeps the price, length and limits it paid for/)).toBeInTheDocument();
    const save = screen.getByRole('button', { name: 'Save plan' });
    expect(save).toBeDisabled();
    await userEvent.clear(screen.getByLabelText('Price (₹)'));
    await userEvent.type(screen.getByLabelText('Price (₹)'), '449');
    await userEvent.click(screen.getByLabelText('Limit number of collections'));   // switch a limit off again
    await userEvent.type(screen.getByLabelText('Reason for this change'), 'Price rise');
    await userEvent.click(save);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/plans'));
    const patch = calls.find((call) => call.method === 'PATCH')!;
    expect(patch.url).toBe(`/api/proxy/superadmin/subscription-plans/${held.id}/`);
    // only what changed is sent, so a field nobody touched cannot overwrite what someone else saved meanwhile
    expect(patch.body).toEqual({ price: '449', collections_cap: null, reason: 'Price rise' });
  });

  it('does not revert what another admin saved after the form was filled in', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const tree = (plan: Plan) => <QueryClientProvider client={client}><PlanEditor plan={plan} /></QueryClientProvider>;
    const { rerender } = render(tree(held));
    rerender(tree({ ...held, price: '999.00', updated_at: '2026-10-20T00:00:00Z' }));   // the plan was refetched with a newer price
    await userEvent.type(screen.getByLabelText('Description (English)'), ' more');
    await userEvent.type(screen.getByLabelText('Reason for this change'), 'Fix the wording');
    await userEvent.click(screen.getByRole('button', { name: 'Save plan' }));
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    expect(calls.find((call) => call.method === 'PATCH')!.body).toEqual({ description: `${held.description} more`, reason: 'Fix the wording' });   // no price
  });

  it('counts every subscription on record, paid or not, in its note', () => {
    mount({ ...held, subscribers: { running: 0, waiting: 0, sold: 0, on_record: 2 } });
    expect(screen.getByText(/2 subscriptions on record/)).toBeInTheDocument();
  });

  it('cannot be saved while it is the same as the saved plan', async () => {
    mount(held);
    await userEvent.type(screen.getByLabelText('Reason for this change'), 'Nothing to change');
    expect(screen.getByRole('button', { name: 'Save plan' })).toBeDisabled();
    expect(screen.getByText(/Change something to save/)).toBeInTheDocument();
  });

  it('sends every language again when one of them changes (the server replaces the translations as a whole)', async () => {
    mount(held);
    await userEvent.click(screen.getByRole('button', { name: /Hindi/ }));
    await userEvent.type(screen.getByLabelText('Badge (Hindi)'), 'सबसे अच्छा');
    await userEvent.type(screen.getByLabelText('Reason for this change'), 'Add a Hindi badge');
    await userEvent.click(screen.getByRole('button', { name: 'Save plan' }));
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    expect(calls.find((call) => call.method === 'PATCH')!.body).toEqual({
      translations: { hi: { name: 'स्टार्टर', description: 'छोटी डेयरी के लिए', badge: 'सबसे अच्छा' } }, reason: 'Add a Hindi badge' });
  });

  it('shows a dash, never NaN, while a number is half typed', async () => {
    mount(null);
    await userEvent.type(screen.getByLabelText('Price (₹)'), '12abc');
    await userEvent.click(screen.getByLabelText('Limit milk weight'));
    await userEvent.type(screen.getByLabelText('Milk weight limit (kg)'), '1,5');
    const preview = screen.getByRole('group', { name: 'Preview' });
    expect(preview).not.toHaveTextContent('NaN');
    expect(preview).toHaveTextContent('₹—');
  });
});

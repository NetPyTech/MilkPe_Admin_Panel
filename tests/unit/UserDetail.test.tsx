import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { UserDetailView } from '@/features/users/UserDetail';
import type { UserDetail } from '@/features/users/schemas';

const detail: UserDetail = {
  user: { id: 'u1', phone_number: '+919893100070', universal_id: '123456', name: 'Ramesh', email: 'r@example.com', language: 'pa', roles: ['buyer'],
    state: 'Punjab', district: 'Ludhiana', is_active: true, has_logged_in: true, date_joined: '2026-10-14T18:00:00Z', wallet_balance: '125.50', last_active: null },
  profile: { name: 'Ramesh', email: 'r@example.com', address: null, state: 'Punjab', district: 'Ludhiana', tehsil: null, village: null, pincode: null },
  buyer: { dairy_name: 'Sunrise Dairy', state: 'Punjab', district: 'Ludhiana', rate_type: 'fat_snf', payment_cycle: 'ten_days',
    created_at: '2026-10-01T05:00:00Z', supplier_count: 4, collections_count: 20, last_collection_date: '2026-10-13',
    trial_extra_days: 0, trial_granted_days: 0, trial_ends_at: '2026-10-31T05:00:00Z', trial_days_remaining: 17 },
  seller: null,
  wallet: { balance: '125.50', transactions: [{ id: 't1', transaction_type: 'CREDIT', status: 'SUCCESS', category: 'RECHARGE', amount: '500.00', description: 'Recharge', created_at: '2026-10-10T05:00:00Z' }] },
  subscription: { current: null, upcoming: [], held: 0 },
  referral: { code: 'ABC12', referred_by: { id: 'r1', phone_number: '+919893100071' }, referred_count: 2 },
  devices: [{ platform: 'android', is_active: true, last_seen: '2026-10-13T05:00:00Z' }],
  notification_settings: [{ category: 'system', in_app: true, push: false }],
  activity: [],
  audit: [{ action: 'user.deactivate', reason: 'Fraud report 42', created_at: '2026-10-12T05:00:00Z' }],
};

const view = (data: UserDetail) => render(<QueryClientProvider client={new QueryClient()}><UserDetailView data={data} /></QueryClientProvider>);

describe('the subscription plan of a dairy', () => {
  const card = { id: 's1', name: 'Starter', state: 'active', source: 'purchase', price: '399.00', duration_days: 30, starts_at: '2026-10-01T05:00:00Z',
    ends_at: '2026-10-31T05:00:00Z', days_left: 17, cap_period: 'month' as const, weight_cap_kg: '2000.00', collections_cap: null, suppliers_cap: 50, reports_cap: null,
    unlimited: false, usage: { weight_kg: '150.00', collections: 4, reports: 1, suppliers: 3, volume_used_up: false, resets_at: null } };
  it('says the wallet pays when no plan runs, and offers to give one', async () => {
    view(detail);
    await userEvent.click(screen.getByRole('tab', { name: 'Dairy and supplier' }));
    expect(screen.getByText(/No plan is running: the wallet pays the collection fee/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Give a plan' })).toBeInTheDocument();
  });
  it('hides the plan section, and nothing else, when the backend sends no plan block', async () => {
    const without: Partial<UserDetail> = { ...detail };
    delete without.subscription;
    view(without as UserDetail);
    await userEvent.click(screen.getByRole('tab', { name: 'Dairy and supplier' }));
    expect(screen.getByText('Sunrise Dairy')).toBeInTheDocument();
    expect(screen.queryByText('Subscription plan')).not.toBeInTheDocument();
  });
  it('shows the running plan with its limits and use, and what comes next', async () => {
    view({ ...detail, subscription: { current: card, upcoming: [{ ...card, id: 's2', name: 'Pro', starts_at: '2026-10-31T05:00:00Z', ends_at: '2026-11-30T05:00:00Z' }], held: 2 } });
    await userEvent.click(screen.getByRole('tab', { name: 'Dairy and supplier' }));
    expect(screen.getByText('Starter (₹399.00)')).toBeInTheDocument();
    expect(screen.getByText('2,000 kg every 30 days · 50 suppliers')).toBeInTheDocument();
    expect(screen.getByText(/150 kg · 4 collections · 1 report · 3 suppliers/)).toBeInTheDocument();
    expect(screen.getByText(/Next: Pro/)).toBeInTheDocument();
    expect(screen.getByText('2 plans bought or given so far.')).toBeInTheDocument();
  });
});

describe('UserDetailView', () => {
  it('shows who the person is and the action that applies', () => {
    view(detail);
    expect(screen.getByRole('heading', { name: 'Ramesh' })).toBeInTheDocument();
    expect(screen.getByText('+919893100070')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deactivate' })).toBeInTheDocument();
  });
  it('shows the dairy, wallet, network, activity and audit on their tabs', async () => {
    view(detail);
    await userEvent.click(screen.getByRole('tab', { name: 'Dairy and supplier' }));
    expect(screen.getByText('Sunrise Dairy')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Wallet' }));
    expect(screen.getByText('₹500.00')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Network' }));
    expect(screen.getByText('+919893100071')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Activity' }));
    expect(screen.getByText(/no activity recorded yet/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Audit' }));
    expect(screen.getByText('Fraud report 42')).toBeInTheDocument();
  });
  it('opens the wallet adjustment from the Wallet tab', async () => {
    view(detail);
    await userEvent.click(screen.getByRole('tab', { name: 'Wallet' }));
    await userEvent.click(screen.getByRole('button', { name: 'Adjust wallet' }));
    expect(screen.getByRole('heading', { name: 'Adjust wallet of Ramesh' })).toBeInTheDocument();
    expect(screen.getByLabelText('Amount (₹)')).toBeInTheDocument();
  });
  it('handles a user with no profiles', () => {
    view({ ...detail, profile: null, buyer: null, seller: null });
    expect(screen.getByRole('heading', { name: 'Ramesh' })).toBeInTheDocument();
  });
});

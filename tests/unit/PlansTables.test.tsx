import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import list from '../fixtures/plans-list.json';
import subscriptions from '../fixtures/subscriptions-list.json';
import overview from '../fixtures/subscriptions-overview.json';
import { OverviewCards } from '@/features/plans/OverviewCards';
import { PlansTable } from '@/features/plans/PlansTable';
import type { Plan, SubscriptionOverview, SubscriptionRow } from '@/features/plans/schemas';
import { canCancel, canExtend, canReconcile, SubscriptionsTable } from '@/features/plans/SubscriptionsTable';

const plans = list.results as Plan[];

describe('PlansTable', () => {
  it('shows each plan with its price, length, limits, status and how many hold it', () => {
    render(<PlansTable rows={plans} onToggleSale={vi.fn()} onDelete={vi.fn()} />);
    const starter = plans.find((plan) => plan.weight_cap_kg !== null)!;
    expect(screen.getByText(starter.name)).toBeInTheDocument();
    expect(screen.getByText('2,000 kg every 30 days · 900 collections every 30 days · 50 suppliers · 20 reports every 30 days')).toBeInTheDocument();
    expect(screen.getByText('No limits')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Bought or given' })).toBeInTheDocument();
    expect(screen.getAllByText('On sale').length).toBeGreaterThan(0);
    expect(screen.getByText('Off sale')).toBeInTheDocument();
  });
  it('lets a plan be taken off sale or put back, and deleted only when nobody ever held it', async () => {
    const onToggleSale = vi.fn();
    const onDelete = vi.fn();
    render(<PlansTable rows={plans} onToggleSale={onToggleSale} onDelete={onDelete} />);
    const unsold = plans.filter((plan) => (plan.subscribers?.on_record ?? 0) === 0);   // the server refuses to delete a plan with anything on record
    expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(unsold.length);
    await userEvent.click(screen.getAllByRole('button', { name: /Take off sale|Put on sale/ })[0]);
    expect(onToggleSale).toHaveBeenCalledWith(plans[0]);
    await userEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    expect(onDelete).toHaveBeenCalledWith(unsold[0]);
  });
  it('points to creating the first plan when there are none', () => {
    render(<PlansTable rows={[]} onToggleSale={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByRole('link', { name: 'Create the first plan' })).toHaveAttribute('href', '/plans/new');
  });
});

const row = (change: Partial<SubscriptionRow>): SubscriptionRow => ({ ...(subscriptions.results[0] as SubscriptionRow), ...change });

describe('what can be done to a subscription', () => {
  it('follows its state', () => {
    expect([canCancel(row({ state: 'active' })), canCancel(row({ state: 'upcoming' })), canCancel(row({ state: 'pending' })), canCancel(row({ state: 'expired' })), canCancel(row({ state: 'cancelled' }))]).toEqual([true, true, true, false, false]);
    expect([canExtend(row({ state: 'active' })), canExtend(row({ state: 'upcoming' })), canExtend(row({ state: 'pending' })), canExtend(row({ state: 'expired' }))]).toEqual([true, true, false, false]);
    const bought = { source: 'purchase' as const, razorpay_order_id: 'order_1' };
    expect(canReconcile(row({ ...bought, state: 'pending' }))).toBe(true);
    expect(canReconcile(row({ ...bought, state: 'failed' }))).toBe(true);
    expect(canReconcile(row({ ...bought, state: 'cancelled', paid_at: null }))).toBe(true);
    expect(canReconcile(row({ ...bought, state: 'cancelled', paid_at: '2026-10-01T00:00:00Z' }))).toBe(false);
    expect(canReconcile(row({ ...bought, state: 'active' }))).toBe(false);
    expect(canReconcile(row({ source: 'grant', razorpay_order_id: null, state: 'pending' }))).toBe(false);
  });
});

describe('SubscriptionsTable', () => {
  it('shows the dairy, the plan with its limits, the status and a gift marker', () => {
    render(<SubscriptionsTable rows={subscriptions.results as SubscriptionRow[]} onDetails={vi.fn()} onCancel={vi.fn()} onExtend={vi.fn()} onReconcile={vi.fn()} />);
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('Gift')).toBeInTheDocument();
    expect(screen.getByText(/Reason: Goodwill after an outage/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '+919784587596' })).toHaveAttribute('href', `/users/${subscriptions.results[0].user.id}`);
  });
  it('offers the actions that fit the row and passes the row to them', async () => {
    const [onDetails, onCancel, onExtend, onReconcile] = [vi.fn(), vi.fn(), vi.fn(), vi.fn()];
    const rows = [row({ id: 'a', state: 'active' }), row({ id: 'p', state: 'pending', source: 'purchase', razorpay_order_id: 'order_9', starts_at: null, ends_at: null })];
    render(<SubscriptionsTable rows={rows} onDetails={onDetails} onCancel={onCancel} onExtend={onExtend} onReconcile={onReconcile} />);
    expect(screen.getAllByRole('button', { name: 'Extend' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Reconcile' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Cancel' })).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: 'Reconcile' }));
    expect(onReconcile).toHaveBeenCalledWith(rows[1]);
    await userEvent.click(screen.getByRole('button', { name: 'Extend' }));
    expect(onExtend).toHaveBeenCalledWith(rows[0]);
    await userEvent.click(screen.getAllByRole('button', { name: 'Usage' })[0]);
    expect(onDetails).toHaveBeenCalledWith(rows[0]);
  });
  it('shows a price paid only for a payment that happened', () => {
    const rows = [row({ id: 'paid', source: 'purchase', state: 'active', price: '399.00', paid_at: '2026-10-01T00:00:00Z' }),
      row({ id: 'wait', source: 'purchase', state: 'pending', price: '777.00', paid_at: null }), row({ id: 'gift', source: 'grant', price: '0.00' })];
    render(<SubscriptionsTable rows={rows} onDetails={vi.fn()} onCancel={vi.fn()} onExtend={vi.fn()} onReconcile={vi.fn()} />);
    expect(screen.getByText('₹399.00')).toBeInTheDocument();
    expect(screen.queryByText('₹777.00')).not.toBeInTheDocument();
  });
  it('disables Reconcile for every row whose request is still running', () => {
    const rows = [row({ id: 'a', source: 'purchase', state: 'pending', razorpay_order_id: 'o1' }), row({ id: 'b', source: 'purchase', state: 'pending', razorpay_order_id: 'o2' })];
    render(<SubscriptionsTable rows={rows} busyIds={new Set(['a', 'b'])} onDetails={vi.fn()} onCancel={vi.fn()} onExtend={vi.fn()} onReconcile={vi.fn()} />);
    screen.getAllByRole('button', { name: 'Reconcile' }).forEach((button) => expect(button).toBeDisabled());
  });
  it('says so when nothing matches', () => {
    render(<SubscriptionsTable rows={[]} onDetails={vi.fn()} onCancel={vi.fn()} onExtend={vi.fn()} onReconcile={vi.fn()} />);
    expect(screen.getByText('No subscriptions match these filters.')).toBeInTheDocument();
  });
});

describe('the plan filter of the subscriptions list', () => {
  it('shows a plan from the address even before the list of plans has it', async () => {
    const { SubscriptionFilters } = await import('@/features/plans/SubscriptionFilters');
    render(<SubscriptionFilters values={{ plan: 'p-unknown' }} plans={[]} onChange={vi.fn()} onClear={vi.fn()} />);
    expect(screen.getByLabelText('Plan')).toHaveValue('p-unknown');
  });
});

describe('OverviewCards', () => {
  it('shows the headline numbers and what was received', () => {
    render(<OverviewCards data={{ ...(overview as SubscriptionOverview), active: 12, active_granted: 2, upcoming: 3, ending_within_7_days: 4, bought_30_days: 9, revenue_30_days: '3591.00', stuck_payments: 1 }} />);
    expect(screen.getByText('Running now').nextSibling).toHaveTextContent('12');
    expect(screen.getByText('2 of them gifts')).toBeInTheDocument();
    expect(screen.getByText('₹3,591.00 received')).toBeInTheDocument();
    expect(screen.getByText('Reconcile them below')).toBeInTheDocument();
  });
});

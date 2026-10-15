import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BalancesCards } from '@/features/money/BalancesCards';
import { RevenueTable } from '@/features/money/RevenueTable';
import revenue from '../fixtures/revenue.json';
import balances from '../fixtures/balances.json';
import type { Balances, Revenue } from '@/features/money/schemas';

describe('RevenueTable', () => {
  it('lists each period and a totals row with money formatted for India', () => {
    const data: Revenue = {
      from: '2026-10-01', to: '2026-10-02', group: 'day',
      buckets: [{ period: '2026-10-01', recharge_count: 2, recharge_amount: '123456.78', bonus_amount: '0.00', fee_amount: '12.50', referral_payout: '0.00', adjustment_credit: '0.00', adjustment_debit: '0.00', subscription_amount: '0.00', subscription_count: 0 }],
      totals: { recharge_count: 2, recharge_amount: '123456.78', bonus_amount: '0.00', fee_amount: '12.50', referral_payout: '0.00', adjustment_credit: '0.00', adjustment_debit: '0.00', subscription_amount: '0.00', subscription_count: 0 },
    };
    render(<RevenueTable data={data} />);
    expect(screen.getAllByText('₹1,23,456.78')).toHaveLength(2);
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('1 Oct 2026')).toBeInTheDocument();
  });
  it('says so when the range had no money moving, and renders the real answer', () => {
    render(<RevenueTable data={{ ...(revenue as Revenue), buckets: [] }} />);
    expect(screen.getByText(/no money moved/i)).toBeInTheDocument();
    render(<RevenueTable data={revenue as Revenue} />);
    expect(screen.getAllByText('Total').length).toBeGreaterThan(0);
  });
});

describe('BalancesCards', () => {
  it('shows what the wallets hold and how many are low', () => {
    render(<BalancesCards data={balances as Balances} />);
    expect(screen.getByText('Held in wallets')).toBeInTheDocument();
    expect(screen.getByText('₹53,189.37')).toBeInTheDocument();
    expect(screen.getByText(/below ₹200\.00/)).toBeInTheDocument();
  });
});

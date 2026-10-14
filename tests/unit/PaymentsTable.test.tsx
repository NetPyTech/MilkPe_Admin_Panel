import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PaymentsTable } from '@/features/money/PaymentsTable';
import type { PaymentRow } from '@/features/money/schemas';

const row = (over: Partial<PaymentRow> = {}): PaymentRow => ({
  id: 'p1', created_at: '2026-10-14T18:00:00Z', user: { id: 'u1', phone_number: '+919893100010', name: 'Ramesh' }, type: 'CREDIT', status: 'SUCCESS',
  category: 'RECHARGE', amount: '1000.00', description: 'Wallet recharge', razorpay_order_id: 'order_ABC', razorpay_payment_id: 'pay_1', reason: '', created_by: null, ...over,
});

describe('PaymentsTable', () => {
  it('shows who, what, how much and the Razorpay ids, formatted for India', () => {
    render(<PaymentsTable rows={[row()]} onReconcile={vi.fn()} />);
    expect(screen.getByRole('link', { name: 'Ramesh' })).toHaveAttribute('href', '/users/u1');
    expect(screen.getByText('₹1,000.00')).toBeInTheDocument();
    expect(screen.getByText('order_ABC')).toBeInTheDocument();
    expect(screen.getByText('RECHARGE')).toBeInTheDocument();
  });
  it('offers Reconcile only on a pending or failed recharge that has a Razorpay order', async () => {
    const onReconcile = vi.fn();
    render(<PaymentsTable rows={[
      row({ id: 'a', status: 'PENDING' }), row({ id: 'b', status: 'FAILED', razorpay_order_id: 'order_F' }),
      row({ id: 'c', status: 'SUCCESS' }), row({ id: 'd', status: 'PENDING', category: 'COLLECTION_FEE', type: 'DEBIT', razorpay_order_id: null }),
      row({ id: 'e', status: 'PENDING', razorpay_order_id: null })]} onReconcile={onReconcile} />);
    const buttons = screen.getAllByRole('button', { name: 'Reconcile' });
    expect(buttons).toHaveLength(2);
    await userEvent.click(buttons[0]);
    expect(onReconcile).toHaveBeenCalledWith('a');
  });
  it('shows an adjustment with its reason and who made it, and debits as negative', () => {
    render(<PaymentsTable rows={[row({ category: 'ADJUSTMENT', type: 'DEBIT', amount: '25.50', reason: 'Fee charged twice', created_by: '+919999900001', razorpay_order_id: null, razorpay_payment_id: null })]} onReconcile={vi.fn()} />);
    expect(screen.getByText('−₹25.50')).toBeInTheDocument();
    expect(screen.getByText(/Fee charged twice/)).toBeInTheDocument();
    expect(screen.getByText(/\+919999900001/)).toBeInTheDocument();
  });
  it('says so when there is nothing', () => {
    render(<PaymentsTable rows={[]} onReconcile={vi.fn()} />);
    expect(screen.getByText(/no payments match/i)).toBeInTheDocument();
  });
});

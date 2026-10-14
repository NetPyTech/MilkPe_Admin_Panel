import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdjustWalletDialog } from '@/features/money/AdjustWalletDialog';

const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const paymentRow = { id: 'p1', created_at: '2026-10-14T18:00:00Z', user: { id: 'u1', phone_number: '+91', name: 'Ramesh' }, type: 'CREDIT', status: 'SUCCESS',
  category: 'ADJUSTMENT', amount: '100.00', description: 'Adjustment by MilkPe', razorpay_order_id: null, razorpay_payment_id: null, reason: 'x', created_by: '+91' };
const user = { id: 'u1', name: 'Ramesh', phone_number: '+919893100010', balance: '450.00' };

const open = (onClose = vi.fn()) => {
  render(<QueryClientProvider client={new QueryClient()}><AdjustWalletDialog open user={user} onClose={onClose} /></QueryClientProvider>);
  return onClose;
};
afterEach(() => vi.unstubAllGlobals());

describe('AdjustWalletDialog', () => {
  it('needs an amount and a reason before it can be sent, and says what will happen', async () => {
    open();
    const send = screen.getByRole('button', { name: 'Credit wallet' });
    expect(send).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Amount (₹)'), '100');
    expect(send).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Reason'), 'Goodwill');
    expect(send).toBeEnabled();
    expect(screen.getByText(/Credit ₹100\.00 to Ramesh/)).toBeInTheDocument();
    expect(screen.getByText(/₹450\.00/)).toBeInTheDocument();
  });
  it('rejects an amount with more than two decimals or below one paisa', async () => {
    open();
    await userEvent.type(screen.getByLabelText('Reason'), 'Goodwill');
    for (const bad of ['1.005', '0', '-4', 'abc']) {
      await userEvent.clear(screen.getByLabelText('Amount (₹)'));
      await userEvent.type(screen.getByLabelText('Amount (₹)'), bad);
      expect(screen.getByRole('button', { name: 'Credit wallet' }), bad).toBeDisabled();
    }
  });
  it('sends the body with an idempotency key and closes', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(201, paymentRow));
    vi.stubGlobal('fetch', fetchMock);
    const onClose = open();
    await userEvent.type(screen.getByLabelText('Amount (₹)'), '100');
    await userEvent.type(screen.getByLabelText('Reason'), 'Goodwill after an outage');
    await userEvent.click(screen.getByRole('button', { name: 'Credit wallet' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/proxy/superadmin/wallet-adjustments/');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ user_id: 'u1', type: 'credit', amount: '100', reason: 'Goodwill after an outage' });
    expect(body.idempotency_key).toMatch(/^[0-9a-f-]{36}$/);
  });
  it('switches to a debit and shows the server message when it is refused, keeping the same key for a retry', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(409, { error: 'The balance (₹450.00) is lower than the debit.' }));
    vi.stubGlobal('fetch', fetchMock);
    open();
    await userEvent.selectOptions(screen.getByLabelText('Type'), 'debit');
    await userEvent.type(screen.getByLabelText('Amount (₹)'), '900');
    await userEvent.type(screen.getByLabelText('Reason'), 'Fee charged twice');
    await userEvent.click(screen.getByRole('button', { name: 'Debit wallet' }));
    expect(await screen.findByText('The balance (₹450.00) is lower than the debit.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Debit wallet' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).idempotency_key).toBe(JSON.parse(fetchMock.mock.calls[1][1].body).idempotency_key);
  });
});

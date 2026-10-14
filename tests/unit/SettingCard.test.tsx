import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import list from '../fixtures/controls-config-list.json';
import { SettingCard } from '@/features/controls/SettingCard';
import { configListSchema, type ConfigRow } from '@/features/controls/schemas';

const rows = configListSchema.parse(list).results;
const fee = rows.find((r) => r.key === 'COLLECTION_FEE') as ConfigRow;
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const show = (row = fee) => render(<QueryClientProvider client={new QueryClient()}><SettingCard row={row} onHistory={vi.fn()} /></QueryClientProvider>);
afterEach(() => vi.unstubAllGlobals());

describe('SettingCard', () => {
  it('shows the value in use and keeps Save off until something changes', async () => {
    show();
    expect(screen.getByLabelText('Rupees per kg of milk')).toHaveValue('0.012');
    expect(screen.getByLabelText('Charge the fee')).toBeChecked();
    expect(screen.getByText('Default')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Save/ })).toBeDisabled();
    await userEvent.clear(screen.getByLabelText('Rupees per kg of milk'));
    await userEvent.type(screen.getByLabelText('Rupees per kg of milk'), '0.015');
    expect(screen.getByRole('button', { name: /^Save/ })).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(screen.getByLabelText('Rupees per kg of milk')).toHaveValue('0.012');
  });

  it('asks for a reason, then sends the value and the reason', async () => {
    const saved = { ...fee, value: { ENABLED: true, PER_KG_RATE: '0.015' }, source: 'db', updated_at: '2026-10-14T10:00:00Z', updated_by: '+919' };
    const fetchMock = vi.fn().mockResolvedValue(reply(200, saved));
    vi.stubGlobal('fetch', fetchMock);
    show();
    await userEvent.clear(screen.getByLabelText('Rupees per kg of milk'));
    await userEvent.type(screen.getByLabelText('Rupees per kg of milk'), '0.015');
    await userEvent.click(screen.getByRole('button', { name: /^Save/ }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/within 30 seconds/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeDisabled();
    await userEvent.type(within(dialog).getByLabelText('Reason'), 'Raise the fee a little');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/proxy/superadmin/config/COLLECTION_FEE/');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({ value: { ENABLED: true, PER_KG_RATE: '0.015' }, reason: 'Raise the fee a little' });
  });

  it("puts the server's message beside the field it names", async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(400, { error: 'Validation Error', detail: { PER_KG_RATE: ['Use an amount from 0 to 10.'] } })));
    show();
    await userEvent.clear(screen.getByLabelText('Rupees per kg of milk'));
    await userEvent.type(screen.getByLabelText('Rupees per kg of milk'), '99');
    await userEvent.click(screen.getByRole('button', { name: /^Save/ }));
    await userEvent.type(within(screen.getByRole('dialog')).getByLabelText('Reason'), 'Trying a high fee');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getAllByText(/Use an amount from 0 to 10/).length).toBeGreaterThan(0));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(screen.getByLabelText('Rupees per kg of milk')).toHaveAttribute('aria-invalid', 'true');
  });

  it('offers a way back to the default only for a saved value, and resets with a reason', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(200, fee));
    vi.stubGlobal('fetch', fetchMock);
    const { unmount } = show();
    expect(screen.queryByRole('button', { name: 'Back to default' })).not.toBeInTheDocument();
    unmount();
    show({ ...fee, value: { ENABLED: false, PER_KG_RATE: '0.5' }, source: 'db', updated_at: '2026-10-14T10:00:00Z', updated_by: '+919' });
    expect(screen.getByText('Changed')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Back to default' }));
    await userEvent.type(within(screen.getByRole('dialog')).getByLabelText('Reason'), 'Back to normal');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Back to default' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ reason: 'Back to normal' });
  });

  it('adds and removes rows of a list setting', async () => {
    const tiers = rows.find((r) => r.key === 'WALLET_RECHARGE_BONUS_TIERS') as ConfigRow;
    show(tiers);
    expect(screen.getAllByRole('button', { name: 'Remove' })).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: 'Add row' }));
    expect(screen.getAllByRole('button', { name: 'Remove' })).toHaveLength(3);
    expect(screen.getByRole('button', { name: /^Save/ })).toBeEnabled();
    await userEvent.click(screen.getAllByRole('button', { name: 'Remove' })[2]);
    expect(screen.getByRole('button', { name: /^Save/ })).toBeDisabled();
  });
});

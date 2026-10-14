import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UserActions } from '@/features/users/UserActions';
import type { UserRow } from '@/features/users/schemas';

const row: UserRow = {
  id: 'u1', phone_number: '+919893100010', universal_id: '123456', name: 'Ramesh', email: null, language: 'pa', roles: ['buyer'],
  state: null, district: null, is_active: true, has_logged_in: true, date_joined: '2026-10-14T18:00:00Z', wallet_balance: '0.00', last_active: null,
};
const client = new QueryClient();
const tree = (user: UserRow) => <QueryClientProvider client={client}><UserActions user={user} /></QueryClientProvider>;
const wrap = (user: UserRow) => render(tree(user));
afterEach(() => vi.unstubAllGlobals());

describe('UserActions', () => {
  it('offers only the action that applies', () => {
    wrap(row);
    expect(screen.getByRole('button', { name: 'Deactivate' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reactivate' })).toBeNull();
  });
  it('offers reactivation for a deactivated user', () => {
    wrap({ ...row, is_active: false });
    expect(screen.getByRole('button', { name: 'Reactivate' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Deactivate' })).toBeNull();
  });
  it('keeps the wording it was opened with when the user changes underneath it', async () => {
    const view = wrap(row);
    await userEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
    view.rerender(tree({ ...row, is_active: false })); // the change went through and the list refetched
    expect(screen.getByRole('heading', { name: 'Deactivate Ramesh' })).toBeInTheDocument();
    expect(screen.getByText(/signed out/i)).toBeInTheDocument();
  });
  it('posts the reason to the right endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ...row, is_active: false }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    wrap(row);
    await userEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
    expect(screen.getByText(/signed out/i)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/reason/i), 'Fraud report 42');
    await userEvent.click(screen.getAllByRole('button', { name: 'Deactivate' }).at(-1)!);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/proxy/superadmin/users/u1/deactivate/');
    expect(JSON.parse(init.body)).toEqual({ reason: 'Fraud report 42' });
  });
});

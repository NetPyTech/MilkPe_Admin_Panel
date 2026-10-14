import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExtendTrialDialog } from '@/features/controls/ExtendTrialDialog';

const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const open = (onClose = vi.fn(), remaining = 40) => {
  render(<QueryClientProvider client={new QueryClient()}><ExtendTrialDialog open userId="u1" who="Ramesh" extraDays={10} endsAt="2026-12-03T17:39:29Z" remaining={remaining} onClose={onClose} /></QueryClientProvider>);
  return onClose;
};
afterEach(() => vi.unstubAllGlobals());

describe('ExtendTrialDialog', () => {
  it('says where the trial stands and needs days and a reason', async () => {
    open();
    expect(screen.getByText(/ends on 3 Dec 2026/)).toBeInTheDocument();
    expect(screen.getByText(/already extended by 10 days/)).toBeInTheDocument();
    const send = screen.getByRole('button', { name: 'Extend trial' });
    expect(send).toBeDisabled();
    for (const bad of ['0', '366', '1.5', 'abc', '-3']) {
      await userEvent.clear(screen.getByLabelText('Days to add'));
      await userEvent.type(screen.getByLabelText('Days to add'), bad);
      await userEvent.type(screen.getByLabelText('Reason'), 'x'.repeat(3));
      expect(send, bad).toBeDisabled();
      await userEvent.clear(screen.getByLabelText('Reason'));
    }
    await userEvent.clear(screen.getByLabelText('Days to add'));
    await userEvent.type(screen.getByLabelText('Days to add'), '15');
    await userEvent.type(screen.getByLabelText('Reason'), 'Goodwill after an outage');
    expect(send).toBeEnabled();
  });

  it('says the days start today when the trial has already ended', () => {
    open(vi.fn(), 0);
    expect(screen.getByText(/has already ended/)).toBeInTheDocument();
    expect(screen.getByText(/start today/)).toBeInTheDocument();
  });
  it('says the days are added when the trial is still running', () => {
    open(vi.fn(), 12);
    expect(screen.queryByText(/has already ended/)).toBeNull();
    expect(screen.getByText(/added to that/)).toBeInTheDocument();
  });

  it('sends the days as a number with the reason and closes', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(200, { trial_extra_days: 25, trial_ends_at: '2026-12-13T17:39:29Z', trial_days_remaining: 60 }));
    vi.stubGlobal('fetch', fetchMock);
    const onClose = open();
    await userEvent.type(screen.getByLabelText('Days to add'), '15');
    await userEvent.type(screen.getByLabelText('Reason'), 'Goodwill after an outage');
    await userEvent.click(screen.getByRole('button', { name: 'Extend trial' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/proxy/superadmin/users/u1/trial-extension/');
    expect(JSON.parse(init.body)).toEqual({ days: 15, reason: 'Goodwill after an outage' });
  });

  it("shows the server's refusal and stays open", async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(409, { error: 'A trial can be extended by at most 365 days in total (this one already has 360).' })));
    const onClose = open();
    await userEvent.type(screen.getByLabelText('Days to add'), '15');
    await userEvent.type(screen.getByLabelText('Reason'), 'Goodwill');
    await userEvent.click(screen.getByRole('button', { name: 'Extend trial' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/at most 365 days/);
    expect(onClose).not.toHaveBeenCalled();
  });
});

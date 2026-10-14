import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PreviewPanel } from '@/features/outreach/GroupEditor';

const answer = (warnings: string[]) => new Response(JSON.stringify({
  rules: { inactive_days: 30 }, count: 812, warnings, sample: [{ id: 'u1', phone_number: '+919800000001', name: 'Ramesh', language: 'hi' }],
}), { status: 200, headers: { 'content-type': 'application/json' } });
const show = () => render(<QueryClientProvider client={new QueryClient()}><PreviewPanel rules={{ inactive_days: 30 }} /></QueryClientProvider>);
afterEach(() => vi.unstubAllGlobals());

describe('PreviewPanel', () => {
  it('shows the count and, beside it, the warning the server gives about a filter that leans on short history', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(answer(['Activity has only been recorded since 2026-10-10 (5 days), so "not opened for 30 days" also reaches people who have simply not been seen.'])));
    show();
    expect(await screen.findByText(/812/, undefined, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(/only been recorded since 2026-10-10/);
  });
  it('shows no warning when the server has none', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(answer([])));
    show();
    expect(await screen.findByText(/812/, undefined, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.queryByRole('note')).toBeNull();
  });
});

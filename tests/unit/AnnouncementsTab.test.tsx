import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import meta from '../fixtures/outreach-announcements-meta.json';
import list from '../fixtures/outreach-announcements-list.json';

const router = vi.hoisted(() => ({ replace: vi.fn() }));
const address = vi.hoisted(() => ({ search: '' }));
vi.mock('next/navigation', () => ({ useRouter: () => router, useSearchParams: () => new URLSearchParams(address.search) }));

import { AnnouncementsTab } from '@/features/outreach/AnnouncementsTab';

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
beforeEach(() => {
  router.replace.mockClear();
  vi.stubGlobal('fetch', vi.fn(async (url: string) => (String(url).includes('/meta/') ? json(meta) : json(list))));
});
afterEach(() => { vi.unstubAllGlobals(); window.history.replaceState(null, '', '/'); });

describe('AnnouncementsTab', () => {
  it('starts again from the first page when the status changes (page 3 of everything is not page 3 of one status)', async () => {
    address.search = 'page=3';
    window.history.replaceState(null, '', '/outreach?page=3');
    render(<QueryClientProvider client={new QueryClient()}><AnnouncementsTab /></QueryClientProvider>);
    await waitFor(() => expect(screen.getByRole('option', { name: 'Sent' })).toBeInTheDocument());      // the statuses come from the server
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'sent');
    expect(router.replace).toHaveBeenCalledTimes(1);
    const target = new URL(router.replace.mock.calls[0][0], 'http://x');
    expect(target.searchParams.get('status')).toBe('sent');
    expect(target.searchParams.has('page')).toBe(false);
  });
});

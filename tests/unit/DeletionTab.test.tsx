import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import list from '../fixtures/controls-deletion-list.json';
import { DeletionTab } from '@/features/controls/DeletionTab';

const page = (n: number, hasNext: boolean) => ({
  ...list, count: 120, next: hasNext ? `http://api/superadmin/deletion-requests/?page=${n + 1}` : null, previous: n > 1 ? `http://api/superadmin/deletion-requests/?page=${n - 1}` : null,
  results: [{ ...list.results[0], id: `req-${n}`, reason: `Reason on page ${n}` }],
});
const urls: string[] = [];
function serve() {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    urls.push(String(url));
    const n = Number(new URL(String(url), 'http://x').searchParams.get('page') ?? '1');
    return new Response(JSON.stringify(page(n, n < 3)), { status: 200, headers: { 'content-type': 'application/json' } });
  }));
}
const show = () => render(<QueryClientProvider client={new QueryClient()}><DeletionTab /></QueryClientProvider>);
afterEach(() => { vi.unstubAllGlobals(); urls.length = 0; });

describe('DeletionTab paging', () => {
  it('shows the first page and can go forward and back through the queue', async () => {
    serve();
    show();
    expect(await screen.findByText('Reason on page 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('Reason on page 2')).toBeInTheDocument();
    expect(urls.at(-1)).toContain('page=2');
    expect(urls.at(-1)).toContain('status=requested');
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('Reason on page 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(await screen.findByText('Reason on page 2')).toBeInTheDocument();
  });

  it('goes back to the first page when the status changes', async () => {
    serve();
    show();
    await screen.findByText('Reason on page 1');
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('Reason on page 2');
    await userEvent.selectOptions(screen.getByLabelText('Show'), 'approved');
    await waitFor(() => expect(urls.at(-1)).toContain('status=approved'));
    expect(urls.at(-1)).not.toContain('page=');            // page 1 is the default
    expect(await screen.findByText('Reason on page 1')).toBeInTheDocument();
  });
});

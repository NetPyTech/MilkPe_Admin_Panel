import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import draft from '../fixtures/outreach-announcement-detail.json';
import meta from '../fixtures/outreach-announcements-meta.json';
import segments from '../fixtures/outreach-segments-list.json';
import sent from '../fixtures/outreach-announcement-sent.json';

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

import { AnnouncementEditor } from '@/features/outreach/AnnouncementEditor';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
type Handler = (url: string, init: RequestInit) => Response | undefined;
const isGet = (init: RequestInit): boolean => !init.method || init.method === 'GET';

/** Answers the editor's calls: the fixtures for reads, `extra` for what a test cares about. */
function stub(extra: Handler = () => undefined) {
  const calls: { url: string; method: string; body: unknown }[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
    calls.push({ url, method: init.method ?? 'GET', body: init.body ? JSON.parse(String(init.body)) : undefined });
    return extra(url, init)
      ?? (url.endsWith('/announcements/meta/') ? json(200, meta)
        : url.endsWith('/segments/') ? json(200, segments)
        : url.includes('/audience-count/') ? json(200, { count: 472, unknown_phones: [], warnings: [] })
        : json(404, { error: 'unexpected call in test' }));
  }));
  return calls;
}

const mount = (id: string | null) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AnnouncementEditor id={id} /></QueryClientProvider>);
beforeEach(() => { router.replace.mockClear(); router.push.mockClear(); });
afterEach(() => vi.unstubAllGlobals());

describe('a new announcement', () => {
  it('saves a draft with the English text and goes to its page', async () => {
    const calls = stub((url, init) => (url.endsWith('/announcements/') && init.method === 'POST' ? json(201, draft) : undefined));
    mount(null);
    await userEvent.type(await screen.findByLabelText('Title (English)'), 'Get 10% extra');
    await userEvent.type(screen.getByLabelText('Message (English)'), 'Recharge this week.');
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(`/outreach/announcements/${draft.id}`));
    const post = calls.find((c) => c.method === 'POST')!;
    expect(post.url).toBe('/api/proxy/superadmin/announcements/');
    expect(post.body).toMatchObject({ kind: 'info', priority: 'normal', send_push: true, show_on_home: false, audience: { type: 'all' }, translations: { en: { title: 'Get 10% extra', message: 'Recharge this week.', cta_label: '' } } });
  });

  it('cannot be published until it is complete, and says what is missing', async () => {
    stub();
    mount(null);
    expect(await screen.findByRole('button', { name: 'Publish…' })).toBeDisabled();
    expect(screen.getByText(/Write the English title and message/)).toBeInTheDocument();
  });

  it('counts the characters left in each field', async () => {
    stub();
    mount(null);
    await userEvent.type(await screen.findByLabelText('Title (English)'), 'Hello');
    expect(screen.getByText('5 / 80')).toBeInTheDocument();
  });

  it('shows a preview of the card in the language being edited', async () => {
    stub();
    mount(null);
    await userEvent.type(await screen.findByLabelText('Title (English)'), 'Big news');
    await userEvent.type(screen.getByLabelText('Message (English)'), 'Read this');
    const preview = screen.getByRole('group', { name: 'Preview' });
    expect(within(preview).getByText('Big news')).toBeInTheDocument();
    expect(within(preview).getByText('Read this')).toBeInTheDocument();
  });

  it('previews the button the app will show, with the default label when none is written', async () => {
    stub();
    mount(null);
    await userEvent.selectOptions(await screen.findByLabelText('Button', { exact: true }), 'screen');
    expect(within(screen.getByRole('group', { name: 'Preview' })).getByText('View')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Button label (English)'), 'Open wallet');
    expect(within(screen.getByRole('group', { name: 'Preview' })).getByText('Open wallet')).toBeInTheDocument();
  });

  it('can target a saved group, and sends only its id', async () => {
    const calls = stub((url, init) => (url.endsWith('/announcements/') && init.method === 'POST' ? json(201, draft) : undefined));
    mount(null);
    await userEvent.selectOptions(await screen.findByLabelText('Send to'), 'segment');
    await userEvent.selectOptions(screen.getByLabelText('Group'), segments.results[0].id);
    await userEvent.type(screen.getByLabelText('Title (English)'), 'Hi');
    await userEvent.type(screen.getByLabelText('Message (English)'), 'There');
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'POST')).toBe(true));
    expect(calls.find((c) => c.method === 'POST')!.body).toMatchObject({ audience: { type: 'segment', segment_id: segments.results[0].id } });
  });

  it('shows the server message when saving is refused', async () => {
    stub((url, init) => (url.endsWith('/announcements/') && init.method === 'POST' ? json(400, { error: 'Validation Error', detail: { translations: ['An English title and message are required'] } }) : undefined));
    mount(null);
    await userEvent.type(await screen.findByLabelText('Title (English)'), 'x');
    await userEvent.type(screen.getByLabelText('Message (English)'), 'y');
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(await screen.findByText(/An English title and message are required/)).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe('publishing a new announcement', () => {
  const fill = async () => {
    await userEvent.type(await screen.findByLabelText('Title (English)'), 'Get 10% extra');
    await userEvent.type(screen.getByLabelText('Message (English)'), 'Recharge this week.');
  };

  it('keeps the confirmation open and publishes the draft it just saved, without a second copy and without leaving the page first', async () => {
    const calls = stub((url, init) => {
      if (url.endsWith('/announcements/') && init.method === 'POST') return json(201, draft);
      if (url.endsWith(`/announcements/${draft.id}/`) && init.method === 'PATCH') return json(200, draft);
      if (url.endsWith('/publish/')) return json(202, { status: 'sent' });
      return undefined;
    });
    mount(null);
    await fill();
    await userEvent.click(screen.getByRole('button', { name: 'Publish…' }));
    expect(await screen.findByText(/472 people/)).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();                      // the page the confirmation lives on has not been replaced
    await userEvent.click(screen.getByRole('button', { name: 'Send now' }));
    await waitFor(() => expect(calls.some((c) => c.url.endsWith(`/announcements/${draft.id}/publish/`))).toBe(true));
    expect(calls.filter((c) => c.method === 'POST' && c.url.endsWith('/announcements/'))).toHaveLength(1);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(`/outreach/announcements/${draft.id}`));   // only after it went out
  });

  it('cannot be edited, or started twice, while the draft is being saved and counted', async () => {
    let release: (value: Response) => void = () => undefined;
    const calls = stub((url, init) => {
      if (url.endsWith('/announcements/') && init.method === 'POST') return new Promise<Response>((resolve) => { release = resolve; }) as unknown as Response;
      return undefined;
    });
    mount(null);
    await fill();
    const publish = screen.getByRole('button', { name: 'Publish…' });
    await userEvent.click(publish);
    await waitFor(() => expect(publish).toBeDisabled());
    expect(screen.getByLabelText('Title (English)')).toBeDisabled();
    expect(screen.getByLabelText('Message (English)')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
    await userEvent.click(publish);                                     // a second click while waiting
    release(json(201, draft));
    expect(await screen.findByText(/472 people/)).toBeInTheDocument();
    expect(calls.filter((c) => c.method === 'POST' && c.url.endsWith('/announcements/'))).toHaveLength(1);
  });

  it('opens the form again if the confirmation is dismissed, and Publish again updates that draft instead of making another', async () => {
    const calls = stub((url, init) => {
      if (url.endsWith('/announcements/') && init.method === 'POST') return json(201, draft);
      if (url.endsWith(`/announcements/${draft.id}/`) && init.method === 'PATCH') return json(200, draft);
      return undefined;
    });
    mount(null);
    await fill();
    await userEvent.click(screen.getByRole('button', { name: 'Publish…' }));
    await screen.findByText(/472 people/);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.getByLabelText('Title (English)')).toBeEnabled());
    await userEvent.type(screen.getByLabelText('Title (English)'), '!');
    await userEvent.click(screen.getByRole('button', { name: 'Publish…' }));
    await screen.findByText(/472 people/);
    expect(calls.filter((c) => c.method === 'POST' && c.url.endsWith('/announcements/'))).toHaveLength(1);
    expect(calls.filter((c) => c.method === 'PATCH')).toHaveLength(1);
  });

  it('removes a translation that was saved by Publish… and cleared before publishing again', async () => {
    const calls = stub((url, init) => {
      if (url.endsWith('/announcements/') && init.method === 'POST') return json(201, draft);
      if (url.endsWith(`/announcements/${draft.id}/`) && init.method === 'PATCH') return json(200, draft);
      return undefined;
    });
    mount(null);
    await fill();
    const languages = screen.getByRole('group', { name: 'Languages' });
    const other = within(languages).getAllByRole('button').find((b) => b.textContent && !/english/i.test(b.textContent))!;
    await userEvent.click(other);
    await userEvent.type(screen.getByLabelText(/^Title \(/), 'Namaste');
    await userEvent.type(screen.getByLabelText(/^Message \(/), 'Recharge karein');
    await userEvent.click(screen.getByRole('button', { name: 'Publish…' }));
    await screen.findByText(/472 people/);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.getByLabelText(/^Title \(/)).toBeEnabled());
    await userEvent.clear(screen.getByLabelText(/^Title \(/));
    await userEvent.clear(screen.getByLabelText(/^Message \(/));
    await userEvent.click(screen.getByRole('button', { name: 'Publish…' }));
    await screen.findByText(/472 people/);
    const patch = calls.find((c) => c.method === 'PATCH')!.body as { translations: Record<string, unknown> };
    expect(Object.values(patch.translations)).toContain(null);   // the cleared language is removed, not left behind
  });
});

describe('a draft', () => {
  it('asks for confirmation with the number of people before publishing, then saves and publishes', async () => {
    const calls = stub((url, init) => {
      if (url.endsWith(`/announcements/${draft.id}/`) && isGet(init)) return json(200, { ...draft, stats: { recipients: 0, read: 0, dismissed: 0, hidden_by_mute: 0 } });
      if (url.endsWith(`/announcements/${draft.id}/`) && init.method === 'PATCH') return json(200, draft);
      if (url.endsWith('/publish/')) return json(202, { status: 'scheduled', send_at: '2026-10-14T10:00:00Z' });
      return undefined;
    });
    mount(draft.id);
    await userEvent.click(await screen.findByRole('button', { name: 'Publish…' }));
    expect(await screen.findByText(/472 people/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Send now' }));
    await waitFor(() => expect(calls.some((c) => c.url.endsWith('/publish/'))).toBe(true));
    const order = calls.filter((c) => c.method !== 'GET' && c.url.includes('/announcements/')).map((c) => c.method);
    expect(order).toEqual(['PATCH', 'POST']); // saved first, then published
  });

  it('repeats the server\'s warning about a shaky audience in the confirmation', async () => {
    stub((url, init) => {
      if (url.endsWith(`/announcements/${draft.id}/`) && isGet(init)) return json(200, { ...draft, stats: { recipients: 0, read: 0, dismissed: 0, hidden_by_mute: 0 } });
      if (url.endsWith(`/announcements/${draft.id}/`) && init.method === 'PATCH') return json(200, draft);
      if (url.includes('/audience-count/')) return json(200, { count: 900, unknown_phones: [], warnings: ['Activity has only been recorded since 2026-10-10 (5 days).'] });
      return undefined;
    });
    mount(draft.id);
    await userEvent.click(await screen.findByRole('button', { name: 'Publish…' }));
    expect(await screen.findByText(/Note: Activity has only been recorded since 2026-10-10/)).toBeInTheDocument();
  });

  it('can send a test to the owner and be deleted', async () => {
    const calls = stub((url, init) => {
      if (url.endsWith(`/announcements/${draft.id}/`) && isGet(init)) return json(200, { ...draft, stats: { recipients: 0, read: 0, dismissed: 0, hidden_by_mute: 0 } });
      if (url.endsWith(`/announcements/${draft.id}/`) && init.method === 'PATCH') return json(200, draft);
      if (url.endsWith('/test/')) return json(200, { status: 'sent to you', preview: {} });
      if (url.endsWith(`/announcements/${draft.id}/`) && init.method === 'DELETE') return new Response(null, { status: 204 });
      return undefined;
    });
    mount(draft.id);
    await userEvent.click(await screen.findByRole('button', { name: 'Send a test to me' }));
    await waitFor(() => expect(calls.some((c) => c.url.endsWith('/test/'))).toBe(true));
    await userEvent.click(screen.getByRole('button', { name: 'Delete draft' }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete draft' }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/outreach'));
  });
});

describe('a sent announcement', () => {
  const detail = () => (url: string, init: RequestInit) => {
    if (url.endsWith(`/announcements/${sent.id}/`) && isGet(init)) return json(200, sent);
    return undefined;
  };

  it('shows how it did and locks everything except the text and the expiry', async () => {
    stub(detail());
    mount(sent.id);
    expect(await screen.findByText('Reached')).toBeInTheDocument();
    expect(screen.getByLabelText('Send to')).toBeDisabled();
    expect(screen.getByLabelText('Title (English)')).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Publish…' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Retract' })).toBeInTheDocument();
  });

  it('saves only the text and the expiry', async () => {
    const calls = stub((url, init) => (url.endsWith(`/announcements/${sent.id}/`) && init.method === 'PATCH' ? json(200, sent) : detail()(url, init)));
    mount(sent.id);
    await userEvent.type(await screen.findByLabelText('Title (English)'), '!');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
    expect(Object.keys(calls.find((c) => c.method === 'PATCH')!.body as object).sort()).toEqual(['expires_at', 'translations']);
  });

  it('retracts after a confirmation', async () => {
    const calls = stub((url, init) => (url.endsWith('/retract/') ? json(200, { status: 'retracted' }) : detail()(url, init)));
    mount(sent.id);
    await userEvent.click(await screen.findByRole('button', { name: 'Retract' }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Retract' }));
    await waitFor(() => expect(calls.some((c) => c.url.endsWith('/retract/'))).toBe(true));
  });
});

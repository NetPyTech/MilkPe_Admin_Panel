import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { api, ApiError } from '@/lib/api';

const respond = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

afterEach(() => vi.unstubAllGlobals());

describe('api', () => {
  it('calls the proxy with the admin header and validates the answer', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respond(200, { n: 1 }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await api('/superadmin/x/', z.object({ n: z.number() }))).toEqual({ n: 1 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/proxy/superadmin/x/');
    expect(init.headers['X-Admin-Request']).toBe('1');
  });
  it('turns a server refusal into an ApiError with its message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(409, { error: 'This account is already deactivated.' })));
    await expect(api('/superadmin/x/', z.any(), { method: 'POST', body: {} })).rejects.toMatchObject({ status: 409, message: 'This account is already deactivated.' });
  });
  it('flattens a validation error to readable text', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(400, { error: 'Validation Error', detail: { role: ['Use one of: buyer, seller.'] } })));
    await expect(api('/superadmin/x/', z.any())).rejects.toMatchObject({ status: 400, message: 'role: Use one of: buyer, seller.' });
  });
  it('keeps the wait of a 429', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(429, { detail: 'Throttled' }, { 'retry-after': '41' })));
    await expect(api('/superadmin/x/', z.any())).rejects.toMatchObject({ status: 429, retryAfter: 41 });
  });
  it('sends the person to sign-in on a 401', async () => {
    const assign = vi.fn();
    vi.stubGlobal('window', { location: { assign } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(401, { error: 'session_ended' })));
    await expect(api('/superadmin/x/', z.any())).rejects.toBeInstanceOf(ApiError);
    expect(assign).toHaveBeenCalledWith('/login');
  });
  it('rejects an answer of the wrong shape', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(200, { n: 'x' })));
    await expect(api('/superadmin/x/', z.object({ n: z.number() }))).rejects.toMatchObject({ status: 0 });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveProxyPath } from '@/lib/proxyPath';

describe('resolveProxyPath', () => {
  it('allows only superadmin paths', () => {
    expect(resolveProxyPath(['superadmin', 'users'], '?role=buyer')).toBe('/superadmin/users/?role=buyer');
    expect(resolveProxyPath(['superadmin', 'users', 'abc', 'deactivate'], '')).toBe('/superadmin/users/abc/deactivate/');
    expect(resolveProxyPath(['user-info'], '')).toBeNull();
    expect(resolveProxyPath(['superadmin', '..', 'user-info'], '')).toBeNull();
    expect(resolveProxyPath(['superadmin', '%2e%2e', 'x'], '')).toBeNull();
    expect(resolveProxyPath(['superadmin', 'a%2Fb'], '')).toBeNull();
    expect(resolveProxyPath(['superadmin', ''], '')).toBeNull();
    expect(resolveProxyPath([], '')).toBeNull();
  });
});

const django = vi.fn();
const store = { value: undefined as string | undefined };
vi.mock('@/lib/django', () => ({ djangoFetch: (...a: unknown[]) => django(...a) }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => (store.value ? { value: store.value } : undefined) }) }));

import { GET, POST } from '@/app/api/proxy/[...path]/route';
import { seal } from '@/lib/session';

const adminHeaders = { host: 'admin.test', origin: 'http://admin.test', 'x-admin-request': '1', 'content-type': 'application/json' };
const ctx = (...path: string[]) => ({ params: Promise.resolve({ path }) });

beforeEach(async () => {
  process.env.DJANGO_API_URL = 'http://localhost:8000/api'; process.env.SESSION_SECRET = 'k'.repeat(40); process.env.TRUSTED_PROXY_HOPS = '1';
  django.mockReset();
  const now = Date.now();
  store.value = await seal({ token: 'TOKEN', userId: 'u1', phone: '+91', createdAt: now, lastActive: now });
});

describe('proxy route', () => {
  it("passes the visitor's address on to the backend", async () => {
    django.mockResolvedValue(new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }));
    await GET(new Request('http://admin.test/api/proxy/superadmin/users', { headers: { ...adminHeaders, 'x-forwarded-for': '203.0.113.9' } }), ctx('superadmin', 'users'));
    expect(django.mock.calls[0][1].clientIp).toBe('203.0.113.9');
  });
  it('forwards with the session token and returns the body', async () => {
    django.mockResolvedValue(new Response('{"results":[]}', { status: 200, headers: { 'content-type': 'application/json' } }));
    const response = await GET(new Request('http://admin.test/api/proxy/superadmin/users?role=buyer', { headers: adminHeaders }), ctx('superadmin', 'users'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ results: [] });
    const [path, init] = django.mock.calls[0];
    expect(path).toBe('/superadmin/users/?role=buyer');
    expect(init.token).toBe('TOKEN');
  });
  it('refuses with no session, no header, or a forbidden path, without calling Django', async () => {
    store.value = undefined;
    expect((await GET(new Request('http://admin.test/x', { headers: adminHeaders }), ctx('superadmin', 'users'))).status).toBe(401);
    store.value = await seal({ token: 'T', userId: 'u', phone: '+91', createdAt: Date.now(), lastActive: Date.now() });
    expect((await GET(new Request('http://admin.test/x'), ctx('superadmin', 'users'))).status).toBe(403);
    expect((await GET(new Request('http://admin.test/x', { headers: adminHeaders }), ctx('user-info'))).status).toBe(404);
    expect((await POST(new Request('http://admin.test/x', { method: 'POST', headers: { ...adminHeaders, origin: 'http://evil.test' }, body: '{}' }), ctx('superadmin', 'users'))).status).toBe(403);
    expect(django).not.toHaveBeenCalled();
  });
  it('ends the session when Django says 401', async () => {
    django.mockResolvedValue(new Response('{"detail":"x"}', { status: 401 }));
    const response = await GET(new Request('http://admin.test/x', { headers: adminHeaders }), ctx('superadmin', 'users'));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'session_ended' });
    expect(response.headers.get('set-cookie')).toMatch(/milkpe_admin_session=;/);
  });
  it('passes a 429 and its wait through', async () => {
    django.mockResolvedValue(new Response('{"detail":"Throttled"}', { status: 429, headers: { 'retry-after': '41', 'content-type': 'application/json' } }));
    const response = await GET(new Request('http://admin.test/x', { headers: adminHeaders }), ctx('superadmin', 'users'));
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('41');
  });
  it('turns an unreachable Django into a 502', async () => {
    django.mockRejectedValue(new Error('down'));
    expect((await GET(new Request('http://admin.test/x', { headers: adminHeaders }), ctx('superadmin', 'users'))).status).toBe(502);
  });
});

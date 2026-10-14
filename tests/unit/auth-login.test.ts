import { beforeEach, describe, expect, it, vi } from 'vitest';

const django = vi.fn();
vi.mock('@/lib/django', () => ({ djangoFetch: (...a: unknown[]) => django(...a) }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined, set: vi.fn(), delete: vi.fn() }) }));

import { POST } from '@/app/api/auth/login/route';
import { resetLoginLimit } from '@/lib/loginLimit';

const call = (body: unknown, ip = '203.0.113.9') => POST(new Request('http://admin.test/api/auth/login', {
  method: 'POST', body: JSON.stringify(body),
  headers: { host: 'admin.test', origin: 'http://admin.test', 'x-admin-request': '1', 'content-type': 'application/json', 'x-forwarded-for': ip } }));
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

beforeEach(() => {
  resetLoginLimit();
  process.env.DJANGO_API_URL = 'http://localhost:8000/api'; process.env.SESSION_SECRET = 'k'.repeat(40); process.env.TRUSTED_PROXY_HOPS = '1';
  django.mockReset();
});

describe('POST /api/auth/login', () => {
  it('signs an administrator in and sets the cookie, never returning the token', async () => {
    django.mockResolvedValue(reply(200, { token: 'T', user: { id: 'u1', phone_number: '+919999900001', is_superadmin: true } }));
    const response = await call({ mode: 'password', identifier: 'a@b.com', password: 'pw' });
    expect(response.status).toBe(200);
    expect(await response.clone().json()).toEqual({ user: { phone_number: '+919999900001' } });
    expect(response.headers.get('set-cookie')).toMatch(/milkpe_admin_session=/);
    expect(response.headers.get('set-cookie')).toMatch(/HttpOnly/i);
    expect(await response.text()).not.toContain('"T"');
  });
  it('refuses a valid account that is not an administrator, with no cookie', async () => {
    django.mockResolvedValue(reply(200, { token: 'T', user: { id: 'u2', phone_number: '+919999900002', is_superadmin: false } }));
    const response = await call({ mode: 'password', identifier: 'x@y.com', password: 'pw' });
    expect(response.status).toBe(403);
    expect(response.headers.get('set-cookie')).toBeNull();
  });
  it('passes the wrong-password message through', async () => {
    django.mockResolvedValue(reply(400, { error: 'Incorrect email or password.' }));
    const response = await call({ mode: 'password', identifier: 'a@b.com', password: 'bad' });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Incorrect email or password.' });
  });
  it('code-send returns the step and the verification id', async () => {
    django.mockResolvedValue(reply(200, { message: 'OTP sent.', verificationId: 'v1', channels: [{ channel: 'phone', masked: '+91 ******0001' }] }));
    const response = await call({ mode: 'code-send', identifier: '9999900001' });
    expect(await response.json()).toEqual({ step: 'code', verificationId: 'v1', channels: [{ channel: 'phone', masked: '+91 ******0001' }] });
  });
  it("passes the visitor's address to the backend", async () => {
    django.mockResolvedValue(reply(400, { error: 'Incorrect email or password.' }));
    await call({ mode: 'password', identifier: 'a@b.com', password: 'bad' }, '198.51.100.4');
    expect(django.mock.calls[0][1].clientIp).toBe('198.51.100.4');
  });
  it('stops a visitor who keeps trying, with how long to wait, without reaching the backend again; others are not affected', async () => {
    django.mockResolvedValue(reply(400, { error: 'Incorrect email or password.' }));
    for (let i = 0; i < 10; i += 1) expect((await call({ mode: 'password', identifier: 'a@b.com', password: 'bad' }, '192.0.2.1')).status).toBe(400);
    const refused = await call({ mode: 'password', identifier: 'a@b.com', password: 'bad' }, '192.0.2.1');
    expect(refused.status).toBe(429);
    expect(Number(refused.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(django).toHaveBeenCalledTimes(10);
    expect((await call({ mode: 'password', identifier: 'a@b.com', password: 'bad' }, '192.0.2.2')).status).toBe(400);
  });
  it('rejects a body it does not understand', async () => {
    expect((await call({ mode: 'nope' })).status).toBe(400);
  });
  it('rejects a request without the admin header', async () => {
    const response = await POST(new Request('http://admin.test/api/auth/login', { method: 'POST', body: '{}', headers: { host: 'admin.test', origin: 'http://admin.test' } }));
    expect(response.status).toBe(403);
  });
});

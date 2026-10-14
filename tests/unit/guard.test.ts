import { describe, expect, it } from 'vitest';
import { assertAdminRequest } from '@/lib/guard';

const req = (method: string, headers: Record<string, string>) =>
  new Request('http://admin.test/api/proxy/superadmin/users/', { method, headers: { host: 'admin.test', ...headers } });

describe('assertAdminRequest', () => {
  it('needs the custom header on every request', () => {
    expect(assertAdminRequest(req('GET', {}))?.status).toBe(403);
    expect(assertAdminRequest(req('GET', { 'x-admin-request': '1' }))).toBeNull();
  });
  it('needs a same-origin Origin on a change', () => {
    const h = { 'x-admin-request': '1' };
    expect(assertAdminRequest(req('POST', h))?.status).toBe(403);
    expect(assertAdminRequest(req('POST', { ...h, origin: 'http://evil.test' }))?.status).toBe(403);
    expect(assertAdminRequest(req('POST', { ...h, origin: 'http://admin.test' }))).toBeNull();
  });
});

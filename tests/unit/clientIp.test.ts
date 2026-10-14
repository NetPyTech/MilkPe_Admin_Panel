import { describe, expect, it } from 'vitest';
import { clientIp } from '@/lib/clientIp';

const request = (headers: Record<string, string>) => new Request('http://admin.test/x', { headers });

describe('clientIp', () => {
  it('takes the address the trusted proxy added, counting from the right', () => {
    expect(clientIp(request({ 'x-forwarded-for': '203.0.113.9' }), 1)).toBe('203.0.113.9');
    // A visitor can send their own header; the proxy in front of this app appends the address it really saw, so that one is the last.
    expect(clientIp(request({ 'x-forwarded-for': '6.6.6.6, 203.0.113.9' }), 1)).toBe('203.0.113.9');
    expect(clientIp(request({ 'x-forwarded-for': '203.0.113.9, 10.0.0.2' }), 2)).toBe('203.0.113.9');
  });
  it('is null when there is no header, no trusted proxy, or fewer entries than proxies', () => {
    expect(clientIp(request({}), 1)).toBeNull();
    expect(clientIp(request({ 'x-forwarded-for': '203.0.113.9' }), 0)).toBeNull();
    expect(clientIp(request({ 'x-forwarded-for': '203.0.113.9' }), 2)).toBeNull();
  });
  it('accepts IPv6 and refuses anything that is not an address, so it can never inject into a header', () => {
    expect(clientIp(request({ 'x-forwarded-for': '2001:db8::1' }), 1)).toBe('2001:db8::1');
    expect(clientIp(request({ 'x-forwarded-for': '1.2.3.4, 9.9.9.9 x-admin: 1' }), 1)).toBeNull();
    expect(clientIp(request({ 'x-forwarded-for': 'not-an-ip' }), 1)).toBeNull();
  });
});

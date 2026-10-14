import { afterEach, describe, expect, it } from 'vitest';
import { getConfig } from '@/lib/config';

const original = { ...process.env };
afterEach(() => { process.env = { ...original }; });

describe('getConfig', () => {
  it('reads both variables and drops a trailing slash', () => {
    process.env.DJANGO_API_URL = 'http://localhost:8000/api/';
    process.env.SESSION_SECRET = 'x'.repeat(32);
    expect(getConfig()).toEqual({ djangoApiUrl: 'http://localhost:8000/api', sessionSecret: 'x'.repeat(32), trustedProxyHops: 0 });   // no proxy is trusted unless the deployment says so
    process.env.TRUSTED_PROXY_HOPS = '2';
    expect(getConfig().trustedProxyHops).toBe(2);
    process.env.TRUSTED_PROXY_HOPS = '0';
    expect(getConfig().trustedProxyHops).toBe(0);
  });
  it('refuses a bad TRUSTED_PROXY_HOPS', () => {
    process.env.DJANGO_API_URL = 'http://localhost:8000/api';
    process.env.SESSION_SECRET = 'x'.repeat(32);
    process.env.TRUSTED_PROXY_HOPS = 'many';
    expect(() => getConfig()).toThrow(/TRUSTED_PROXY_HOPS/);
  });
  it('names the bad variable', () => {
    process.env.DJANGO_API_URL = 'not a url';
    process.env.SESSION_SECRET = 'x'.repeat(32);
    expect(() => getConfig()).toThrow(/DJANGO_API_URL/);
    process.env.DJANGO_API_URL = 'http://localhost:8000/api';
    process.env.SESSION_SECRET = 'short';
    expect(() => getConfig()).toThrow(/SESSION_SECRET/);
  });
});

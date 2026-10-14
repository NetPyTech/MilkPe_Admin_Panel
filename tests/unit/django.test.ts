import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { djangoFetch } from '@/lib/django';

beforeEach(() => { process.env.DJANGO_API_URL = 'http://localhost:8000/api'; process.env.SESSION_SECRET = 'k'.repeat(40); });
afterEach(() => vi.unstubAllGlobals());

describe('djangoFetch', () => {
  it("passes the visitor's address on, so the backend's audit log and per-address limits see the visitor, not this server", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetchMock);
    await djangoFetch('/login/', { method: 'POST', clientIp: '203.0.113.9' });
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get('x-forwarded-for')).toBe('203.0.113.9');
  });
  it('sends no address header when none is known', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetchMock);
    await djangoFetch('/login/', { method: 'POST' });
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get('x-forwarded-for')).toBeNull();
  });
});

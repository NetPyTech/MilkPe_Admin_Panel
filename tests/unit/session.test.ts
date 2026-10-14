import { beforeEach, describe, expect, it } from 'vitest';
import { IDLE_MS, MAX_AGE_MS, seal, unseal, type Session } from '@/lib/session';

const base: Session = { token: 'jwt-token', userId: 'u1', phone: '+919999900001', createdAt: 1_000_000, lastActive: 1_000_000 };

beforeEach(() => { process.env.DJANGO_API_URL = 'http://localhost:8000/api'; process.env.SESSION_SECRET = 'k'.repeat(40); });

describe('session cookie', () => {
  it('round-trips and does not contain the token in clear', async () => {
    const sealed = await seal(base);
    expect(sealed).not.toContain('jwt-token');
    expect(await unseal(sealed, 1_000_500)).toEqual(base);
  });
  it('rejects a tampered, empty or foreign cookie', async () => {
    const sealed = await seal(base);
    expect(await unseal(sealed.slice(0, -3) + 'abc', 1_000_500)).toBeNull();
    expect(await unseal(undefined)).toBeNull();
    expect(await unseal('garbage')).toBeNull();
    process.env.SESSION_SECRET = 'z'.repeat(40);
    expect(await unseal(sealed, 1_000_500)).toBeNull();
  });
  it('ends after 12 hours idle or 24 hours in total', async () => {
    const sealed = await seal(base);
    expect(await unseal(sealed, base.lastActive + IDLE_MS + 1)).toBeNull();
    const active = await seal({ ...base, lastActive: base.createdAt + MAX_AGE_MS });
    expect(await unseal(active, base.createdAt + MAX_AGE_MS + 1)).toBeNull();
  });
});

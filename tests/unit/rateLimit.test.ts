import { describe, expect, it } from 'vitest';
import { createLimiter } from '@/lib/rateLimit';

describe('createLimiter', () => {
  it('lets a key through up to the limit inside a window, then says how long to wait', () => {
    let now = 1_000_000;
    const limiter = createLimiter({ limit: 3, windowMs: 60_000, now: () => now });
    expect([1, 2, 3].map(() => limiter.take('a').allowed)).toEqual([true, true, true]);
    const refused = limiter.take('a');
    expect(refused.allowed).toBe(false);
    expect(refused.retryAfterSeconds).toBe(60);
    now += 20_000;
    expect(limiter.take('a').retryAfterSeconds).toBe(40);
  });
  it('counts keys separately and starts again after the window', () => {
    let now = 0;
    const limiter = createLimiter({ limit: 1, windowMs: 1000, now: () => now });
    expect(limiter.take('a').allowed).toBe(true);
    expect(limiter.take('b').allowed).toBe(true);
    expect(limiter.take('a').allowed).toBe(false);
    now = 1001;
    expect(limiter.take('a').allowed).toBe(true);
  });
  it('forgets old keys so the table cannot grow without bound', () => {
    let now = 0;
    const limiter = createLimiter({ limit: 1, windowMs: 1000, now: () => now, maxKeys: 100 });
    for (let i = 0; i < 500; i += 1) { now += 10; limiter.take(`k${i}`); }
    expect(limiter.size()).toBeLessThanOrEqual(100);
  });
});

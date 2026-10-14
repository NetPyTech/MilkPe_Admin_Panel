import { createLimiter } from './rateLimit';

// Ten tries a minute per visitor address; visitors whose address is unknown share one, wider bucket.
const known = createLimiter({ limit: 10, windowMs: 60_000 });
const unknown = createLimiter({ limit: 60, windowMs: 60_000 });

export function takeLoginTry(ip: string | null) {
  return ip ? known.take(ip) : unknown.take('unknown');
}

export function resetLoginLimit() {
  known.reset();
  unknown.reset();
}

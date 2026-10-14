import { getConfig } from './config';

export function djangoFetch(path: string, init: RequestInit & { token?: string; clientIp?: string | null } = {}) {
  const { token, clientIp, headers, ...rest } = init;
  const merged = new Headers(headers);
  merged.set('accept', 'application/json');
  if (clientIp) merged.set('x-forwarded-for', clientIp); // exactly one entry: the backend counts this app as one hop (THROTTLE_NUM_PROXIES=1)
  if (token) merged.set('authorization', `Bearer ${token}`);
  return fetch(`${getConfig().djangoApiUrl}${path}`, { ...rest, headers: merged, cache: 'no-store', signal: AbortSignal.timeout(30_000) });
}

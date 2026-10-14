import { getConfig } from './config';

const ADDRESS = /^[0-9a-fA-F:.]{2,45}$/;

/** The visitor's address as the proxy in front of this app saw it. A visitor can send their own `X-Forwarded-For`, so the entry to believe is the one
 * `hops` places from the right (each trusted proxy appends the address it saw). Null when it cannot be told, or when it is not an address: the
 * value goes into a header for the backend and must never carry anything else. */
export function clientIp(request: Request, hops = getConfig().trustedProxyHops): string | null {
  const header = request.headers.get('x-forwarded-for');
  if (!header || hops < 1) return null;
  const entries = header.split(',').map((entry) => entry.trim());
  if (entries.length < hops) return null;
  const candidate = entries[entries.length - hops];
  return ADDRESS.test(candidate) ? candidate : null;
}

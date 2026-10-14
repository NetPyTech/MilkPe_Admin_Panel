import { z } from 'zod';

export class ApiError extends Error {
  constructor(message: string, public status: number, public body: unknown = null, public retryAfter: number | null = null) {
    super(message);
  }
}

export const page = <T extends z.ZodTypeAny>(item: T) =>
  z.object({ next: z.string().nullable(), previous: z.string().nullable(), results: z.array(item) });

function messageOf(body: unknown, status: number): string {
  if (body && typeof body === 'object') {
    const { error, detail } = body as { error?: unknown; detail?: unknown };
    if (detail && typeof detail === 'object') {
      const parts = Object.entries(detail as Record<string, unknown>).map(([field, v]) => `${field}: ${[v].flat().join(' ')}`);
      if (parts.length) return parts.join('; ');
    }
    if (typeof error === 'string' && error !== 'Validation Error') return error;
    if (typeof detail === 'string') return detail;
  }
  return status === 404 ? 'Not found.' : `The request failed (${status}).`;
}

export async function api<T>(path: string, schema: z.ZodType<T>, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const response = await fetch(`/api/proxy${path}`, {
    method: init.method ?? 'GET',
    headers: { 'X-Admin-Request': '1', ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const body = await response.json().catch(() => null);
  if (response.status === 401) {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a full reload also drops the cached data of the ended session
    if (typeof window !== 'undefined') window.location.assign('/login');
    throw new ApiError('Your session has ended. Please sign in again.', 401, body);
  }
  if (!response.ok) {
    const wait = Number(response.headers.get('retry-after'));
    throw new ApiError(messageOf(body, response.status), response.status, body, response.status === 429 && wait ? wait : null);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ApiError('Unexpected answer from the server', 0, body);
  return parsed.data;
}

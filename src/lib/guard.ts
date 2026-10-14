import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { COOKIE_NAME, cookieOptions, seal, unseal, type Session } from './session';

const forbidden = (message: string) => NextResponse.json({ error: message }, { status: 403 });

/** A browser page of this app sends `X-Admin-Request: 1` (a cross-site form cannot), and a change must come from this same origin. */
export function assertAdminRequest(request: Request): Response | null {
  if (request.headers.get('x-admin-request') !== '1') return forbidden('Missing request header.');
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const origin = request.headers.get('origin');
    const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
    let originHost: string | null = null;
    try { originHost = origin ? new URL(origin).host : null; } catch { originHost = null; }
    if (!originHost || !host || originHost !== host) return forbidden('Cross-site request refused.');
  }
  return null;
}

export async function getSession(): Promise<Session | null> {
  return unseal((await cookies()).get(COOKIE_NAME)?.value);
}

export async function setSessionCookie(response: NextResponse, session: Session) {
  response.cookies.set(COOKIE_NAME, await seal(session), cookieOptions(process.env.NODE_ENV === 'production'));
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, '', { ...cookieOptions(process.env.NODE_ENV === 'production'), maxAge: 0 });
}

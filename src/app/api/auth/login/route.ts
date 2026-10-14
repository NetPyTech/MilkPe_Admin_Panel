import { NextResponse } from 'next/server';
import { z } from 'zod';
import { clientIp } from '@/lib/clientIp';
import { djangoFetch } from '@/lib/django';
import { assertAdminRequest, setSessionCookie } from '@/lib/guard';
import { takeLoginTry } from '@/lib/loginLimit';

const identifier = z.string().min(3).max(254);
const body = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('password'), identifier, password: z.string().min(1).max(200) }),
  z.object({ mode: z.literal('code-send'), identifier }),
  z.object({ mode: z.literal('code-verify'), identifier, otp: z.string().regex(/^\d{6}$/), verificationId: z.string().max(64).optional() }),
]);

const loginReply = z.object({ token: z.string(), user: z.object({ id: z.string(), phone_number: z.string(), is_superadmin: z.boolean() }) });

export async function POST(request: Request) {
  const refused = assertAdminRequest(request);
  if (refused) return refused;
  const ip = clientIp(request);
  const turn = takeLoginTry(ip);
  if (!turn.allowed) {
    return NextResponse.json({ error: 'Too many attempts. Wait a moment and try again.' }, { status: 429, headers: { 'retry-after': String(turn.retryAfterSeconds) } });
  }
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Check the details and try again.' }, { status: 400 });
  const input = parsed.data;

  const [path, payload] =
    input.mode === 'password' ? ['/login/password/', { identifier: input.identifier, password: input.password }]
    : input.mode === 'code-send' ? ['/login/', { identifier: input.identifier }]
    : ['/verify-otp/', { identifier: input.identifier, otp: input.otp, ...(input.verificationId ? { verificationId: input.verificationId } : {}) }];
  const upstream = await djangoFetch(path, { method: 'POST', body: JSON.stringify(payload), headers: { 'content-type': 'application/json' }, clientIp: ip }).catch(() => null);
  if (!upstream) return NextResponse.json({ error: 'The server could not be reached.' }, { status: 502 });
  const data = await upstream.json().catch(() => ({}));

  const signedIn = loginReply.safeParse(data);
  if (upstream.ok && signedIn.success) {
    if (!signedIn.data.user.is_superadmin) return NextResponse.json({ error: 'This account is not an administrator.' }, { status: 403 });
    const response = NextResponse.json({ user: { phone_number: signedIn.data.user.phone_number } });
    const now = Date.now();
    await setSessionCookie(response, { token: signedIn.data.token, userId: signedIn.data.user.id, phone: signedIn.data.user.phone_number, createdAt: now, lastActive: now });
    return response;
  }
  if (upstream.ok && input.mode === 'code-send' && data.verificationId) {
    return NextResponse.json({ step: 'code', verificationId: data.verificationId, channels: data.channels ?? [] });
  }
  const message = typeof data.error === 'string' ? data.error : 'Sign-in failed.';
  return NextResponse.json({ error: message }, { status: upstream.status >= 400 && upstream.status < 600 ? upstream.status : 400 });
}

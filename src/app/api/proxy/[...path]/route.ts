import { NextResponse } from 'next/server';
import { clientIp } from '@/lib/clientIp';
import { djangoFetch } from '@/lib/django';
import { assertAdminRequest, clearSessionCookie, getSession, setSessionCookie } from '@/lib/guard';
import { resolveProxyPath } from '@/lib/proxyPath';

type Context = { params: Promise<{ path: string[] }> };
const PASS = ['content-type', 'retry-after', 'content-disposition', 'x-export-truncated'];

async function forward(request: Request, { params }: Context) {
  const refused = assertAdminRequest(request);
  if (refused) return refused;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'session_ended' }, { status: 401 });
  const { path } = await params;
  const target = resolveProxyPath(path, new URL(request.url).search);
  if (!target) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  const upstream = await djangoFetch(target, {
    method: request.method, token: session.token, clientIp: clientIp(request),
    headers: hasBody ? { 'content-type': request.headers.get('content-type') ?? 'application/json' } : undefined,
    body: hasBody ? await request.text() : undefined,
  }).catch(() => null);
  if (!upstream) return NextResponse.json({ error: 'The server could not be reached.' }, { status: 502 });

  if (upstream.status === 401) {
    const ended = NextResponse.json({ error: 'session_ended' }, { status: 401 });
    clearSessionCookie(ended);
    return ended;
  }
  const headers = new Headers();
  for (const name of PASS) { const value = upstream.headers.get(name); if (value) headers.set(name, value); }
  const response = new NextResponse(upstream.status === 204 ? null : await upstream.arrayBuffer(), { status: upstream.status, headers });
  await setSessionCookie(response, { ...session, lastActive: Date.now() }); // every call keeps the 12-hour idle clock moving
  return response;
}

export { forward as GET, forward as POST, forward as PUT, forward as PATCH, forward as DELETE };

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/guard';

export async function GET() {
  const session = await getSession();
  return session ? NextResponse.json({ phone: session.phone }) : NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
}

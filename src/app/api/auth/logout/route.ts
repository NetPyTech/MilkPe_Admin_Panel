import { NextResponse } from 'next/server';
import { assertAdminRequest, clearSessionCookie } from '@/lib/guard';

export async function POST(request: Request) {
  const refused = assertAdminRequest(request);
  if (refused) return refused;
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}

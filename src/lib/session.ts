import { createHash } from 'node:crypto';
import { EncryptJWT, jwtDecrypt } from 'jose';
import { getConfig } from './config';

export const COOKIE_NAME = 'milkpe_admin_session';
export const IDLE_MS = 12 * 60 * 60 * 1000;
export const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type Session = { token: string; userId: string; phone: string; createdAt: number; lastActive: number };

const key = () => new Uint8Array(createHash('sha256').update(getConfig().sessionSecret).digest());

export async function seal(session: Session): Promise<string> {
  return new EncryptJWT({ ...session }).setProtectedHeader({ alg: 'dir', enc: 'A256GCM' }).encrypt(key());
}

export async function unseal(sealed: string | undefined, now = Date.now()): Promise<Session | null> {
  if (!sealed) return null;
  try {
    const { payload } = await jwtDecrypt(sealed, key());
    const s = payload as unknown as Session;
    if (typeof s.token !== 'string' || typeof s.createdAt !== 'number' || typeof s.lastActive !== 'number') return null;
    if (now - s.lastActive > IDLE_MS || now - s.createdAt > MAX_AGE_MS) return null;
    return { token: s.token, userId: s.userId, phone: s.phone, createdAt: s.createdAt, lastActive: s.lastActive };
  } catch {
    return null;
  }
}

export const cookieOptions = (secure: boolean) =>
  ({ httpOnly: true, secure, sameSite: 'strict' as const, path: '/', maxAge: MAX_AGE_MS / 1000 });

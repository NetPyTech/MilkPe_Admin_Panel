'use client';
import { Button } from '@/components/ui/button';

export function Topbar({ phone }: { phone: string }) {
  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST', headers: { 'X-Admin-Request': '1' } }).catch(() => null);
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a full reload also drops the cached data of the ended session
    window.location.assign('/login');
  }
  return (
    <header className="flex h-14 items-center justify-between border-b px-6">
      <span className="text-sm text-muted-foreground">Signed in as {phone}</span>
      <Button variant="outline" size="sm" onClick={signOut}>Sign out</Button>
    </header>
  );
}

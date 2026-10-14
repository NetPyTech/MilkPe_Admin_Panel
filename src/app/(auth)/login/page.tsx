import { redirect } from 'next/navigation';
import { LoginClient } from '@/features/auth/LoginClient';
import { getSession } from '@/lib/guard';

export default async function LoginPage() {
  if (await getSession()) redirect('/overview');
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">MilkPe Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in with your administrator account.</p>
        </div>
        <LoginClient />
      </div>
    </main>
  );
}

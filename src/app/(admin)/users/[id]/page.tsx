'use client';
import Link from 'next/link';
import { use } from 'react';
import { ErrorState } from '@/components/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/features/users/queries';
import { UserDetailView } from '@/features/users/UserDetail';
import { ApiError } from '@/lib/api';

export default function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const user = useUser(id);
  return (
    <div className="space-y-4">
      <Link href="/users" className="text-sm text-muted-foreground hover:underline">← Back to users</Link>
      {user.isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : user.isError ? (
        <ErrorState message={user.error instanceof ApiError && user.error.status === 404 ? 'This user was not found.' : user.error.message}
          retryAfter={user.error instanceof ApiError ? user.error.retryAfter : null} onRetry={() => user.refetch()} />
      ) : (
        <UserDetailView data={user.data} />
      )}
    </div>
  );
}

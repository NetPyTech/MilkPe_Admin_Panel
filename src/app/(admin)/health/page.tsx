'use client';
import { ErrorState } from '@/components/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { HealthView } from '@/features/health/HealthView';
import { useHealth } from '@/features/health/queries';
import { ApiError } from '@/lib/api';

export default function HealthPage() {
  const health = useHealth();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">System health</h1>
      {health.isPending ? <Skeleton className="h-64 w-full" /> : health.isError
        ? <ErrorState message={health.error.message} retryAfter={health.error instanceof ApiError ? health.error.retryAfter : null} onRetry={() => health.refetch()} />
        : <HealthView data={health.data} />}
    </div>
  );
}

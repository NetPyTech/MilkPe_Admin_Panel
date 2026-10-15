'use client';
import Link from 'next/link';
import { use } from 'react';
import { ErrorState } from '@/components/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { PlanEditor } from '@/features/plans/PlanEditor';
import { usePlan } from '@/features/plans/queries';
import { ApiError } from '@/lib/api';

export default function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const plan = usePlan(id);
  return (
    <div className="space-y-4">
      <Link href="/plans" className="text-sm text-muted-foreground hover:underline">← Back to plans</Link>
      {plan.isPending ? <Skeleton className="h-64 w-full" /> : plan.isError ? (
        <ErrorState message={plan.error instanceof ApiError && plan.error.status === 404 ? 'This plan was not found.' : plan.error.message}
          retryAfter={plan.error instanceof ApiError ? plan.error.retryAfter : null} onRetry={() => plan.refetch()} />
      ) : <PlanEditor key={plan.data.id} plan={plan.data} />}
    </div>
  );
}

import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ErrorState } from '@/components/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api';

/** Loading skeleton, error with Retry (and the wait after a 429), or the data. While it refetches the previous data stays on screen, dimmed. */
export function QueryState<T>({ query, children }: { query: UseQueryResult<T, Error>; children: (data: T) => ReactNode }) {
  if (query.isPending) return <div className="space-y-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  if (query.isError) {
    return <ErrorState message={query.error.message} retryAfter={query.error instanceof ApiError ? query.error.retryAfter : null} onRetry={() => query.refetch()} />;
  }
  return <div className={query.isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>{children(query.data)}</div>;
}

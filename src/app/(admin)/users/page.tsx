'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useState } from 'react';
import { toast } from 'sonner';
import { ErrorState } from '@/components/ErrorState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { UserFilters } from '@/features/users/UserFilters';
import { downloadUsersCsv, saveFile } from '@/features/users/exportCsv';
import { cursorOf, USER_FILTER_KEYS, useUsers } from '@/features/users/queries';
import { UsersTable } from '@/features/users/UsersTable';
import { ApiError } from '@/lib/api';
import { readFilters, withFilters } from '@/lib/filters';

function UsersScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const filters = readFilters(params, USER_FILTER_KEYS);
  const cursor = params.get('cursor') ?? undefined;
  const users = useUsers(filters, cursor);
  const [exporting, setExporting] = useState(false);

  async function exportCsv() {
    setExporting(true);
    try {
      const file = await downloadUsersCsv(filters);
      saveFile(file.blob, file.filename);
      if (file.truncated) toast.warning('The file holds the first 10,000 people only. Narrow the filters to get the rest.');
      else toast.success('Export ready.');
    } catch (failure) {
      toast.error(failure instanceof Error ? failure.message : 'The export failed.');
    } finally {
      setExporting(false);
    }
  }

  const change = useCallback((changes: Record<string, string | undefined>) => {
    router.replace(`/users?${withFilters(new URLSearchParams(window.location.search), changes)}`);
  }, [router]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Users</h1>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={exporting}>{exporting ? 'Preparing…' : 'Export CSV'}</Button>
      </div>
      <UserFilters values={filters} onChange={change} onClear={() => router.replace('/users')} />
      {users.isPending ? (
        <div className="space-y-2">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : users.isError ? (
        <ErrorState message={users.error.message} retryAfter={users.error instanceof ApiError ? users.error.retryAfter : null} onRetry={() => users.refetch()} />
      ) : (
        <>
          <UsersTable rows={users.data.results} />
          <div className="flex justify-between">
            <Button variant="outline" size="sm" disabled={!users.data.previous} onClick={() => change({ cursor: cursorOf(users.data.previous) })}>Previous</Button>
            <Button variant="outline" size="sm" disabled={!users.data.next} onClick={() => change({ cursor: cursorOf(users.data.next) })}>Next</Button>
          </div>
        </>
      )}
    </div>
  );
}

export default function UsersPage() {
  return <Suspense fallback={null}><UsersScreen /></Suspense>;
}

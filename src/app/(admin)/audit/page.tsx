'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ErrorState } from '@/components/ErrorState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { AuditTable } from '@/features/audit/AuditTable';
import { AUDIT_FILTER_KEYS, useAudit } from '@/features/audit/queries';
import { cursorOf } from '@/features/users/queries';
import { ApiError } from '@/lib/api';
import { readFilters, withFilters } from '@/lib/filters';

function AuditScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const filters = readFilters(params, AUDIT_FILTER_KEYS);
  const audit = useAudit(filters, params.get('cursor') ?? undefined);
  const change = (changes: Record<string, string | undefined>) => router.replace(`/audit?${withFilters(new URLSearchParams(window.location.search), changes)}`);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Audit</h1>
      <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-4">
        <div className="space-y-1.5"><Label htmlFor="a-action">Action</Label>
          <Input id="a-action" placeholder="user.deactivate" defaultValue={filters.action ?? ''} onBlur={(e) => change({ action: e.target.value.trim() || undefined })} /></div>
        <div className="space-y-1.5"><Label htmlFor="a-target">Target id</Label>
          <Input id="a-target" defaultValue={filters.target_id ?? ''} onBlur={(e) => change({ target_id: e.target.value.trim() || undefined })} /></div>
        <div className="space-y-1.5"><Label htmlFor="a-from">From</Label>
          <Input id="a-from" type="date" value={filters.from ?? ''} onValueChange={(v) => change({ from: v || undefined })} /></div>
        <div className="space-y-1.5"><Label htmlFor="a-to">To</Label>
          <Input id="a-to" type="date" value={filters.to ?? ''} onValueChange={(v) => change({ to: v || undefined })} /></div>
      </div>
      {audit.isPending ? (
        <div className="space-y-2">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : audit.isError ? (
        <ErrorState message={audit.error.message} retryAfter={audit.error instanceof ApiError ? audit.error.retryAfter : null} onRetry={() => audit.refetch()} />
      ) : (
        <>
          <AuditTable rows={audit.data.results} />
          <div className="flex justify-between">
            <Button variant="outline" size="sm" disabled={!audit.data.previous} onClick={() => change({ cursor: cursorOf(audit.data.previous) })}>Previous</Button>
            <Button variant="outline" size="sm" disabled={!audit.data.next} onClick={() => change({ cursor: cursorOf(audit.data.next) })}>Next</Button>
          </div>
        </>
      )}
    </div>
  );
}

export default function AuditPage() {
  return <Suspense fallback={null}><AuditScreen /></Suspense>;
}

'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmReasonDialog } from '@/components/ConfirmReasonDialog';
import { ErrorState } from '@/components/ErrorState';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { api, ApiError } from '@/lib/api';
import { DeletionTable, type Verb } from './DeletionTable';
import { useDeletionRequests } from './queries';
import { deletionRequestSchema, type DeletionRequest } from './schemas';

const COPY: Record<Verb, { title: string; effect: (who: string) => string; confirm: string; done: string; destructive: boolean }> = {
  approve: { title: 'Approve deletion', confirm: 'Approve', done: 'Request approved.', destructive: false,
    effect: (who) => `${who}'s request is approved. Nothing is closed yet: use "Close account" when you are ready.` },
  reject: { title: 'Reject deletion', confirm: 'Reject', done: 'Request rejected.', destructive: false,
    effect: (who) => `${who} keeps their account. Write why: it is kept in the audit log.` },
  complete: { title: 'Close account', confirm: 'Close account', done: 'Account closed.', destructive: true,
    effect: (who) => `${who} will be signed out and cannot sign in again, their phone stops receiving notifications and their name, email, address and logo are removed. Wallet and collection records are kept. This cannot be undone.` },
};

export function DeletionTab() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('requested');
  const [action, setAction] = useState<{ row: DeletionRequest; verb: Verb } | null>(null);
  const [open, setOpen] = useState(false);
  const requests = useDeletionRequests(status);

  async function decide(note: string) {
    if (!action) return;
    await api(`/superadmin/deletion-requests/${action.row.id}/${action.verb}/`, deletionRequestSchema, { method: 'POST', body: { note } });
    await Promise.all([queryClient.invalidateQueries({ queryKey: ['deletions'] }), queryClient.invalidateQueries({ queryKey: ['users'] }), queryClient.invalidateQueries({ queryKey: ['user'] })]);
    toast.success(COPY[action.verb].done);
  }

  const copy = action ? COPY[action.verb] : null;
  const who = action ? action.row.user.name || action.row.user.phone_number : '';
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">People ask for their account to be deleted from the app. Approve or reject, then close the account when you are ready. Wallet and collection records are always kept.</p>
      <div className="max-w-48 space-y-1.5">
        <Label htmlFor="deletion-status">Show</Label>
        <select id="deletion-status" value={status} onChange={(e) => setStatus(e.target.value)}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
          <option value="requested">Waiting for a decision</option><option value="approved">Approved, not closed</option>
          <option value="done">Closed</option><option value="rejected">Rejected</option><option value="">All</option>
        </select>
      </div>
      {requests.isPending ? <Skeleton className="h-24 w-full" /> : requests.isError
        ? <ErrorState message={requests.error.message} retryAfter={requests.error instanceof ApiError ? requests.error.retryAfter : null} onRetry={() => requests.refetch()} />
        : <DeletionTable rows={requests.data.results} onAct={(row, verb) => { setAction({ row, verb }); setOpen(true); }} />}
      {action && copy ? (
        <ConfirmReasonDialog open={open} title={`${copy.title}: ${who}`} effect={copy.effect(who)} confirmLabel={copy.confirm}
          destructive={copy.destructive} onConfirm={decide} onClose={() => setOpen(false)} />
      ) : null}
    </div>
  );
}

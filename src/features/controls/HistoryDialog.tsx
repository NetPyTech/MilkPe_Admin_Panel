'use client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/format';
import { useConfigHistory } from './queries';
import type { ConfigRow } from './schemas';

const show = (value: unknown) => (value === null || value === undefined ? 'default' : typeof value === 'string' ? value : JSON.stringify(value));

export function HistoryDialog({ row, onClose }: { row: ConfigRow | null; onClose: () => void }) {
  const history = useConfigHistory(row?.key ?? null);
  return (
    <Dialog open={!!row} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>History of {row?.label}</DialogTitle>
          <DialogDescription>The last changes to this setting, newest first. The reason is the one written when it was changed.</DialogDescription>
        </DialogHeader>
        {history.isPending ? <Skeleton className="h-16 w-full" /> : history.isError ? <p role="alert" className="text-sm text-destructive">{history.error.message}</p> : history.data.results.length === 0 ? (
          <p className="text-sm text-muted-foreground">Never changed here.</p>
        ) : (
          <ul className="space-y-3">
            {history.data.results.map((change) => (
              <li key={change.id} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">{formatDateTime(change.created_at)} · {change.changed_by ?? 'unknown'}</p>
                <p className="mt-1 break-words text-muted-foreground"><span className="line-through">{show(change.old)}</span> → <span className="text-foreground">{show(change.new)}</span></p>
                <p className="mt-1">{change.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

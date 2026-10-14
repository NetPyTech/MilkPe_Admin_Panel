'use client';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format';
import type { DeletionRequest } from './schemas';

export type Verb = 'approve' | 'reject' | 'complete';

/** What a request can do next: the same order the server enforces (requested -> approved -> done, or rejected). */
export const NEXT: Record<DeletionRequest['status'], Verb[]> = { requested: ['approve', 'reject'], approved: ['complete', 'reject'], rejected: [], done: [] };
const LABEL: Record<Verb, string> = { approve: 'Approve', reject: 'Reject', complete: 'Close account' };

export function DeletionTable({ rows, onAct }: { rows: DeletionRequest[]; onAct: (row: DeletionRequest, verb: Verb) => void }) {
  if (rows.length === 0) return <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">No requests here.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow><TableHead>Person</TableHead><TableHead>Reason given</TableHead><TableHead>Asked</TableHead><TableHead>Status</TableHead><TableHead>Decision</TableHead><TableHead /></TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>
              <Link href={`/users/${row.user.id}`} className="font-medium underline-offset-4 hover:underline">{row.user.name || row.user.phone_number}</Link>
              <div className="text-xs text-muted-foreground">{row.user.phone_number}</div>
            </TableCell>
            <TableCell className="max-w-64 whitespace-normal break-words">{row.reason || '—'}</TableCell>
            <TableCell>{formatDateTime(row.requested_at)}</TableCell>
            <TableCell><Badge variant={row.status === 'done' ? 'secondary' : row.status === 'rejected' ? 'outline' : 'default'}>{row.status}</Badge></TableCell>
            <TableCell className="max-w-64 whitespace-normal break-words text-sm text-muted-foreground">
              {row.decided_at ? `${row.decided_by ?? 'unknown'}, ${formatDateTime(row.decided_at)}${row.note ? `: ${row.note}` : ''}` : '—'}
            </TableCell>
            <TableCell className="space-x-1 text-right">
              {NEXT[row.status].map((verb) => (
                <Button key={verb} size="sm" variant={verb === 'approve' ? 'default' : 'outline'} onClick={() => onAct(row, verb)}>{LABEL[verb]}</Button>
              ))}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

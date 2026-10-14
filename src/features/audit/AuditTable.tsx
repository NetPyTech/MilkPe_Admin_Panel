import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format';
import type { AuditRow } from './schemas';

/** `key: before → after` for every key that changed. */
const change = (row: AuditRow) =>
  Object.keys({ ...row.before, ...row.after }).map((key) => `${key}: ${String(row.before[key] ?? '—')} → ${String(row.after[key] ?? '—')}`);

export function AuditTable({ rows }: { rows: AuditRow[] }) {
  if (rows.length === 0) return <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">Nothing has been changed from the panel yet.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow><TableHead>When</TableHead><TableHead>Who</TableHead><TableHead>Action</TableHead><TableHead>Target</TableHead><TableHead>Reason</TableHead><TableHead>Change</TableHead></TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{formatDateTime(row.created_at)}</TableCell>
            <TableCell>{row.actor ? row.actor.phone_number : <span className="text-muted-foreground">Removed account</span>}</TableCell>
            <TableCell>{row.action}</TableCell>
            <TableCell>
              {row.target_type === 'user'
                ? <Link href={`/users/${row.target_id}`} className="underline-offset-4 hover:underline">user {row.target_id.slice(0, 8)}…</Link>
                : `${row.target_type} ${row.target_id}`.trim()}
            </TableCell>
            <TableCell>{row.reason || '—'}</TableCell>
            <TableCell className="space-y-0.5">{change(row).map((line) => <div key={line}>{line}</div>)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

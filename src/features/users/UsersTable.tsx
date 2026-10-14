import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate, formatDateTime, formatInr } from '@/lib/format';
import type { UserRow } from './schemas';

const place = (row: UserRow) => [row.district, row.state].filter(Boolean).join(', ') || '—';

export function UsersTable({ rows }: { rows: UserRow[] }) {
  if (rows.length === 0) return <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">No users match these filters.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Roles</TableHead><TableHead>Location</TableHead>
          <TableHead className="text-right">Wallet</TableHead><TableHead>Joined</TableHead><TableHead>Last active</TableHead><TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell><Link href={`/users/${row.id}`} className="font-medium underline-offset-4 hover:underline">{row.name || row.phone_number}</Link></TableCell>
            <TableCell>{row.phone_number}</TableCell>
            <TableCell className="space-x-1">{row.roles.length ? row.roles.map((role) => <Badge key={role} variant="secondary">{role}</Badge>) : '—'}</TableCell>
            <TableCell>{place(row)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatInr(row.wallet_balance)}</TableCell>
            <TableCell>{formatDate(row.date_joined)}</TableCell>
            <TableCell>{formatDateTime(row.last_active)}</TableCell>
            <TableCell>{row.is_active ? <Badge variant="outline">Active</Badge> : <Badge variant="destructive">Deactivated</Badge>}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

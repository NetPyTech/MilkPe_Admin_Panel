import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime, formatInr } from '@/lib/format';
import type { PaymentRow } from './schemas';

const canReconcile = (row: PaymentRow) =>
  row.category === 'RECHARGE' && row.type === 'CREDIT' && !!row.razorpay_order_id && (row.status === 'PENDING' || row.status === 'FAILED');

const STATUS_LOOK = { SUCCESS: 'outline', PENDING: 'secondary', FAILED: 'destructive' } as const;

export function PaymentsTable({ rows, onReconcile, busyId }: { rows: PaymentRow[]; onReconcile: (id: string) => void; busyId?: string | null }) {
  if (rows.length === 0) return <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">No payments match these filters.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>When</TableHead><TableHead>User</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Amount</TableHead>
          <TableHead>Status</TableHead><TableHead>Razorpay</TableHead><TableHead>Details</TableHead><TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{formatDateTime(row.created_at)}</TableCell>
            <TableCell>
              <Link href={`/users/${row.user.id}`} className="font-medium underline-offset-4 hover:underline">{row.user.name || row.user.phone_number}</Link>
              {row.user.name ? <div className="text-xs text-muted-foreground">{row.user.phone_number}</div> : null}
            </TableCell>
            <TableCell>{row.category}</TableCell>
            <TableCell className="text-right tabular-nums">{row.type === 'DEBIT' ? `−${formatInr(row.amount)}` : formatInr(row.amount)}</TableCell>
            <TableCell><Badge variant={STATUS_LOOK[row.status]}>{row.status}</Badge></TableCell>
            <TableCell className="space-y-0.5 text-xs">
              {row.razorpay_order_id ? <div><span>{row.razorpay_order_id}</span></div> : null}
              {row.razorpay_payment_id ? <div className="text-muted-foreground">{row.razorpay_payment_id}</div> : null}
              {!row.razorpay_order_id && !row.razorpay_payment_id ? '—' : null}
            </TableCell>
            <TableCell className="text-xs">
              <div>{row.description}</div>
              {row.reason ? <div className="text-muted-foreground">Reason: {row.reason}</div> : null}
              {row.created_by ? <div className="text-muted-foreground">By {row.created_by}</div> : null}
            </TableCell>
            <TableCell>
              {canReconcile(row) ? <Button size="sm" variant="outline" disabled={busyId === row.id} onClick={() => onReconcile(row.id)}>Reconcile</Button> : null}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

'use client';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate, formatDateTime, formatInr } from '@/lib/format';
import { limitsText } from './form';
import type { SubscriptionRow } from './schemas';

const LOOK = { active: 'default', upcoming: 'outline', expired: 'secondary', cancelled: 'destructive', pending: 'secondary', failed: 'destructive' } as const;
const WORDS = { active: 'Running', upcoming: 'Starts later', expired: 'Ended', cancelled: 'Cancelled', pending: 'Waiting for payment', failed: 'Payment failed' } as const;

/** What the owner can do to a subscription in its state. */
export const canCancel = (row: SubscriptionRow) => row.state === 'active' || row.state === 'upcoming' || row.state === 'pending';
export const canExtend = (row: SubscriptionRow) => row.state === 'active' || row.state === 'upcoming';
export const canReconcile = (row: SubscriptionRow) =>
  row.source === 'purchase' && !!row.razorpay_order_id && (row.state === 'pending' || row.state === 'failed' || (row.state === 'cancelled' && !row.paid_at));

type Props = {
  rows: SubscriptionRow[]; busyIds?: ReadonlySet<string>;
  onDetails: (row: SubscriptionRow) => void; onCancel: (row: SubscriptionRow) => void; onExtend: (row: SubscriptionRow) => void; onReconcile: (row: SubscriptionRow) => void;
};

export function SubscriptionsTable({ rows, busyIds, onDetails, onCancel, onExtend, onReconcile }: Props) {
  if (rows.length === 0) return <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">No subscriptions match these filters.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Dairy</TableHead><TableHead>Plan</TableHead><TableHead>Status</TableHead><TableHead>Runs</TableHead>
          <TableHead className="text-right">Price paid</TableHead><TableHead>Details</TableHead><TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>
              <Link href={`/users/${row.user.id}`} className="font-medium underline-offset-4 hover:underline">{row.user.name || row.user.phone_number}</Link>
              {row.user.name ? <div className="text-xs text-muted-foreground">{row.user.phone_number}</div> : null}
            </TableCell>
            <TableCell>
              <div>{row.plan.name}</div>
              <div className="max-w-56 text-xs text-muted-foreground">{limitsText(row)}</div>
            </TableCell>
            <TableCell>
              <Badge variant={LOOK[row.state]}>{WORDS[row.state]}</Badge>
              {row.source === 'grant' ? <div className="mt-1 text-xs text-muted-foreground">Gift</div> : null}
            </TableCell>
            <TableCell className="whitespace-nowrap text-xs">
              {row.starts_at && row.ends_at ? <>{formatDate(row.starts_at)} – {formatDate(row.ends_at)}<div className="text-muted-foreground">{row.duration_days} days</div></> : <span className="text-muted-foreground">{row.duration_days} days, not started</span>}
            </TableCell>
            <TableCell className="text-right tabular-nums">{row.source === 'grant' || !row.paid_at ? '—' : formatInr(row.price)}</TableCell>
            <TableCell className="space-y-0.5 text-xs">
              <div className="text-muted-foreground">Made {formatDateTime(row.created_at)}</div>
              {row.razorpay_order_id ? <div>{row.razorpay_order_id}</div> : null}
              {row.reason ? <div className="text-muted-foreground">Reason: {row.reason}</div> : null}
              {row.granted_by ? <div className="text-muted-foreground">By {row.granted_by}</div> : null}
            </TableCell>
            <TableCell className="space-x-2 whitespace-nowrap text-right">
              <Button size="sm" variant="outline" onClick={() => onDetails(row)}>Usage</Button>
              {canExtend(row) ? <Button size="sm" variant="outline" onClick={() => onExtend(row)}>Extend</Button> : null}
              {canReconcile(row) ? <Button size="sm" variant="outline" disabled={busyIds?.has(row.id) ?? false} onClick={() => onReconcile(row)}>Reconcile</Button> : null}
              {canCancel(row) ? <Button size="sm" variant="ghost" onClick={() => onCancel(row)}>Cancel</Button> : null}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

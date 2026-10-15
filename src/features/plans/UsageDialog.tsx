'use client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate, formatUnit } from '@/lib/format';
import { useSubscription } from './queries';
import type { SubscriptionRow } from './schemas';

/** What a subscription recorded in each limit period it has been through (milk saved, collections, reports built). */
export function UsageDialog({ row, onClose }: { row: SubscriptionRow; onClose: () => void }) {
  const detail = useSubscription(row.id);
  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{row.plan.name}: what it covered</DialogTitle>
          <DialogDescription>For {row.user.name || row.user.phone_number}. Each line is one limit period; usage is counted when a collection is saved.</DialogDescription>
        </DialogHeader>
        {detail.isPending ? <Skeleton className="h-24 w-full" /> : detail.isError ? <p role="alert" className="text-sm text-destructive">{detail.error.message}</p> : detail.data.usage.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing has been recorded yet.</p>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Period</TableHead><TableHead className="text-right">Milk</TableHead><TableHead className="text-right">Collections</TableHead><TableHead className="text-right">Reports</TableHead></TableRow></TableHeader>
            <TableBody>
              {detail.data.usage.map((period) => (
                <TableRow key={period.index}>
                  <TableCell>{formatDate(period.starts_at)} – {formatDate(period.ends_at)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatUnit(period.weight_kg, 'kg')}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatUnit(String(period.collections), 'count')}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatUnit(String(period.reports), 'count')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

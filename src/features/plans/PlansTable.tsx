'use client';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatInr } from '@/lib/format';
import { limitsText } from './form';
import type { Plan } from './schemas';

type Props = { rows: Plan[]; onToggleSale: (plan: Plan) => void; onDelete: (plan: Plan) => void };

export function PlansTable({ rows, onToggleSale, onDelete }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
        <p>No plans yet. Dairies pay the per-collection fee from their wallet until you add one.</p>
        <Link href="/plans/new" className="mt-2 inline-block font-medium text-foreground underline-offset-4 hover:underline">Create the first plan</Link>
      </div>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Plan</TableHead><TableHead className="text-right">Price</TableHead><TableHead>Lasts</TableHead><TableHead>Limits</TableHead>
          <TableHead>Status</TableHead><TableHead className="text-right">Running</TableHead><TableHead className="text-right">Waiting</TableHead>
          <TableHead className="text-right">Bought or given</TableHead><TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((plan) => (
          <TableRow key={plan.id}>
            <TableCell>
              <Link href={`/plans/${plan.id}`} className="font-medium underline-offset-4 hover:underline">{plan.name}</Link>
              {plan.badge ? <Badge variant="secondary" className="ml-2">{plan.badge}</Badge> : null}
              {plan.description ? <div className="text-xs text-muted-foreground">{plan.description}</div> : null}
            </TableCell>
            <TableCell className="text-right tabular-nums">{formatInr(plan.price)}</TableCell>
            <TableCell>{plan.duration_days} days</TableCell>
            <TableCell className="max-w-64 text-xs">{limitsText(plan)}</TableCell>
            <TableCell>{plan.is_active ? <Badge variant="outline">On sale</Badge> : <Badge variant="secondary">Off sale</Badge>}</TableCell>
            <TableCell className="text-right tabular-nums">{plan.subscribers?.running ?? 0}</TableCell>
            <TableCell className="text-right tabular-nums">{plan.subscribers?.waiting ?? 0}</TableCell>
            <TableCell className="text-right tabular-nums">{plan.subscribers?.sold ?? 0}</TableCell>
            <TableCell className="space-x-2 whitespace-nowrap text-right">
              <Link href={`/plans/${plan.id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>Edit</Link>
              <Button size="sm" variant="outline" onClick={() => onToggleSale(plan)}>{plan.is_active ? 'Take off sale' : 'Put on sale'}</Button>
              {(plan.subscribers?.on_record ?? 0) === 0 ? <Button size="sm" variant="ghost" onClick={() => onDelete(plan)}>Delete</Button> : null}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

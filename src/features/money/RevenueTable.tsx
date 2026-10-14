import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate, formatInr } from '@/lib/format';
import type { Revenue } from './schemas';

function periodLabel(period: string, group: Revenue['group']) {
  if (group === 'month') return formatDate(`${period}T12:00:00+05:30`).replace(/^\d+ /, '');
  if (group === 'week') return `Week of ${formatDate(`${period}T12:00:00+05:30`)}`;
  return formatDate(`${period}T12:00:00+05:30`);
}

type Cells = Revenue['totals'];
const money = (value: string) => <TableCell className="text-right tabular-nums">{formatInr(value)}</TableCell>;
const cells = (row: Cells) => (
  <>
    <TableCell className="text-right tabular-nums">{row.recharge_count}</TableCell>
    {money(row.recharge_amount)}{money(row.bonus_amount)}{money(row.fee_amount)}{money(row.referral_payout)}{money(row.adjustment_credit)}{money(row.adjustment_debit)}
  </>
);

export function RevenueTable({ data }: { data: Revenue }) {
  if (data.buckets.length === 0) return <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">No money moved between {formatDate(`${data.from}T12:00:00+05:30`)} and {formatDate(`${data.to}T12:00:00+05:30`)}.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Period</TableHead><TableHead className="text-right">Recharges</TableHead><TableHead className="text-right">Recharged</TableHead>
          <TableHead className="text-right">Bonuses</TableHead><TableHead className="text-right">Fees</TableHead><TableHead className="text-right">Referral payouts</TableHead>
          <TableHead className="text-right">Adjusted in</TableHead><TableHead className="text-right">Adjusted out</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.buckets.map((bucket) => <TableRow key={bucket.period}><TableCell>{periodLabel(bucket.period, data.group)}</TableCell>{cells(bucket)}</TableRow>)}
      </TableBody>
      <TableFooter><TableRow><TableCell className="font-medium">Total</TableCell>{cells(data.totals)}</TableRow></TableFooter>
    </Table>
  );
}

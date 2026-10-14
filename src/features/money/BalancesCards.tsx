import { formatInr } from '@/lib/format';
import type { Balances } from './schemas';

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export function BalancesCards({ data }: { data: Balances }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card label="Held in wallets" value={formatInr(data.total_outstanding)} />
      <Card label="Wallets" value={data.wallets.toLocaleString('en-IN')} />
      <Card label={`Wallets below ${formatInr(data.low_balance_threshold)}`} value={data.below_low_balance.toLocaleString('en-IN')} />
      <Card label="Empty wallets" value={data.zero_balance.toLocaleString('en-IN')} />
    </div>
  );
}

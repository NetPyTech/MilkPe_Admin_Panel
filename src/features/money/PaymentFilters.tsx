'use client';
import { SELECT_CLASS } from '@/lib/styles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSearchBox } from '@/lib/useSearchBox';

type Props = { values: Record<string, string>; onChange: (changes: Record<string, string | undefined>) => void; onClear: () => void };
const SELECT = SELECT_CLASS;

const STATUS = [['', 'Any status'], ['PENDING', 'Pending'], ['SUCCESS', 'Success'], ['FAILED', 'Failed']] as const;
const CATEGORY = [['', 'Any category'], ['RECHARGE', 'Recharge'], ['RECHARGE_BONUS', 'Recharge bonus'], ['COLLECTION_FEE', 'Collection fee'],
  ['REFERRAL_BONUS', 'Referral bonus'], ['ADJUSTMENT', 'Adjustment']] as const;
const TYPE = [['', 'Credits and debits'], ['credit', 'Credits'], ['debit', 'Debits']] as const;

function Select({ id, label, value, options, onChange }: { id: string; label: string; value: string; options: readonly (readonly [string, string])[]; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select id={id} className={SELECT} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
      </select>
    </div>
  );
}

export function PaymentFilters({ values, onChange, onClear }: Props) {
  const search = useSearchBox(values.search, (value) => onChange({ search: value }));
  return (
    <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1.5 lg:col-span-2">
        <Label htmlFor="p-search">Search</Label>
        <Input id="p-search" placeholder="Order id, payment id or phone" value={search.text} onValueChange={search.onType} />
      </div>
      <Select id="p-status" label="Status" value={values.status ?? ''} options={STATUS} onChange={(v) => onChange({ status: v || undefined })} />
      <Select id="p-category" label="Category" value={values.category ?? ''} options={CATEGORY} onChange={(v) => onChange({ category: v || undefined })} />
      <Select id="p-type" label="Direction" value={values.type ?? ''} options={TYPE} onChange={(v) => onChange({ type: v || undefined })} />
      <div className="space-y-1.5"><Label htmlFor="p-from">From</Label><Input id="p-from" type="date" value={values.from ?? ''} onValueChange={(v) => onChange({ from: v || undefined })} /></div>
      <div className="space-y-1.5"><Label htmlFor="p-to">To</Label><Input id="p-to" type="date" value={values.to ?? ''} onValueChange={(v) => onChange({ to: v || undefined })} /></div>
      <label className="flex items-end gap-2 pb-1 text-sm">
        <input type="checkbox" checked={values.stuck === 'true'} onChange={(e) => onChange({ stuck: e.target.checked ? 'true' : undefined })} />
        Stuck recharges only (pending over 30 minutes)
      </label>
      <div className="flex items-end lg:col-span-4"><Button variant="ghost" size="sm" onClick={() => { search.clear(); onClear(); }}>Clear filters</Button></div>
    </div>
  );
}

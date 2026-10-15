'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSearchBox } from '@/lib/useSearchBox';
import { SELECT_CLASS } from '@/lib/styles';
import type { Plan } from './schemas';

type Props = { values: Record<string, string>; plans: Plan[]; onChange: (changes: Record<string, string | undefined>) => void; onClear: () => void };


export function SubscriptionFilters({ values, plans, onChange, onClear }: Props) {
  const search = useSearchBox(values.search, (value) => onChange({ search: value }));
  return (
    <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1.5 lg:col-span-2">
        <Label htmlFor="s-search">Search</Label>
        <Input id="s-search" placeholder="Name, phone, plan or Razorpay order" value={search.text} onValueChange={search.onType} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="s-state">Status</Label>
        <select id="s-state" className={SELECT_CLASS} value={values.state ?? ''} onChange={(e) => onChange({ state: e.target.value || undefined })}>
          <option value="">Any</option><option value="active">Running</option><option value="upcoming">Starts later</option><option value="expired">Ended</option>
          <option value="cancelled">Cancelled</option><option value="pending">Waiting for payment</option><option value="failed">Payment failed</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="s-source">Kind</Label>
        <select id="s-source" className={SELECT_CLASS} value={values.source ?? ''} onChange={(e) => onChange({ source: e.target.value || undefined })}>
          <option value="">Bought and gifts</option><option value="purchase">Bought</option><option value="grant">Gifts</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="s-plan">Plan</Label>
        <select id="s-plan" className={SELECT_CLASS} value={values.plan ?? ''} onChange={(e) => onChange({ plan: e.target.value || undefined })}>
          <option value="">Any plan</option>
          {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
          {values.plan && !plans.some((plan) => plan.id === values.plan) ? <option value={values.plan}>Plan from the address (not in the list)</option> : null}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="s-ending">Running plans ending within</Label>
        <select id="s-ending" className={SELECT_CLASS} value={values.ending_within ?? ''} onChange={(e) => onChange({ ending_within: e.target.value || undefined })}>
          <option value="">Any time</option><option value="3">3 days</option><option value="7">7 days</option><option value="14">14 days</option>
          <option value="30">30 days</option><option value="60">60 days</option>
        </select>
      </div>
      <div className="flex items-end gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={values.stuck === 'true'} onChange={(e) => onChange({ stuck: e.target.checked ? 'true' : undefined })} />
          Stuck payments only
        </label>
      </div>
      <div className="flex items-end lg:col-span-4"><Button variant="ghost" size="sm" onClick={() => { search.clear(); onClear(); }}>Clear filters</Button></div>
    </div>
  );
}

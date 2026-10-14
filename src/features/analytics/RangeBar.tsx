'use client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const CUSTOM = 'custom';
export const PRESETS = [['7', 'Last 7 days'], ['30', 'Last 30 days'], ['90', 'Last 90 days'], ['365', 'Last 12 months'], ['custom', 'Custom range']] as const;

/** The date range every chart under it uses: a preset (the server works out the dates) or a custom from / to. */
export function rangeOf(values: Record<string, string>): Record<string, string> {
  if (values.from || values.to) return Object.fromEntries(['from', 'to'].filter((k) => values[k]).map((k) => [k, values[k]]));
  return { days: values.days ?? '30' };
}

export function RangeBar({ values, onChange }: { values: Record<string, string>; onChange: (changes: Record<string, string | undefined>) => void }) {
  // Choosing "Custom range" has no dates to put in the address yet, so the choice itself is kept there as `range=custom`: navigating to another
  // address (a sidebar link, the back button) then resets it together with the charts' period, and the two can never disagree.
  const custom = !!(values.from || values.to) || values.range === CUSTOM;
  const selected = custom ? 'custom' : values.days ?? '30';
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="range-preset">Period</Label>
        <select id="range-preset" value={selected}
          onChange={(e) => {
            if (e.target.value === CUSTOM) {
              onChange({ days: undefined, range: CUSTOM });   // the dates come next; until then the charts keep the default period
            } else {
              onChange({ days: e.target.value, from: undefined, to: undefined, range: undefined });
            }
          }}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
          {PRESETS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      {custom ? (
        <>
          <div className="space-y-1.5"><Label htmlFor="range-from">From</Label><Input id="range-from" type="date" value={values.from ?? ''} onValueChange={(v) => onChange({ from: v || undefined, days: undefined })} /></div>
          <div className="space-y-1.5"><Label htmlFor="range-to">To</Label><Input id="range-to" type="date" value={values.to ?? ''} onValueChange={(v) => onChange({ to: v || undefined, days: undefined })} /></div>
        </>
      ) : null}
    </div>
  );
}

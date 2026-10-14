'use client';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const PRESETS = [['7', 'Last 7 days'], ['30', 'Last 30 days'], ['90', 'Last 90 days'], ['365', 'Last 12 months'], ['custom', 'Custom range']] as const;

/** The date range every chart under it uses: a preset (the server works out the dates) or a custom from / to. */
export function rangeOf(values: Record<string, string>): Record<string, string> {
  if (values.from || values.to) return Object.fromEntries(['from', 'to'].filter((k) => values[k]).map((k) => [k, values[k]]));
  return { days: values.days ?? '30' };
}

export function RangeBar({ values, onChange }: { values: Record<string, string>; onChange: (changes: Record<string, string | undefined>) => void }) {
  // Choosing "Custom range" has nothing to put in the address yet (no dates are picked), so the choice itself is kept here; dates in the address
  // (a shared link, a reload) always mean custom.
  const [chosenCustom, setChosenCustom] = useState(false);
  const custom = !!(values.from || values.to) || chosenCustom;
  const selected = custom ? 'custom' : values.days ?? '30';
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="range-preset">Period</Label>
        <select id="range-preset" value={selected}
          onChange={(e) => {
            if (e.target.value === 'custom') {
              setChosenCustom(true);
              onChange({ days: undefined });   // the dates come next; until then the charts keep the default period
            } else {
              setChosenCustom(false);
              onChange({ days: e.target.value, from: undefined, to: undefined });
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

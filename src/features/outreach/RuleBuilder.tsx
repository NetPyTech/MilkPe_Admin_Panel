'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { RuleDef, Rules } from './schemas';

const SELECT = 'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

/** The rules that have a value (a filter just added and not yet filled in is left out of a preview or a save). */
export function cleanRules(rules: Rules): Rules {
  return Object.fromEntries(Object.entries(rules).filter(([, value]) => value !== '' && !(typeof value === 'string' && value.trim() === '')));
}

const startingValue = (def: RuleDef): string | boolean => (def.type === 'flag' ? true : def.type === 'choice' ? def.choices[0]?.value ?? '' : '');

/** Filters for a group of people, built from the server's list of rules. Emits the whole rule set on every change. */
export function RuleBuilder({ defs, rules, onChange }: { defs: RuleDef[]; rules: Rules; onChange: (rules: Rules) => void }) {
  const chosen = defs.filter((def) => def.key in rules);
  const available = defs.filter((def) => !(def.key in rules));
  const set = (key: string, value: string | number | boolean) => onChange({ ...rules, [key]: value });
  const remove = (key: string) => onChange(Object.fromEntries(Object.entries(rules).filter(([k]) => k !== key)));

  return (
    <div className="space-y-3">
      {chosen.length === 0 ? <p className="text-sm text-muted-foreground">No filters yet. Add one below; people must match every filter.</p> : null}
      {chosen.map((def) => (
        <div key={def.key} className="flex flex-wrap items-end gap-3 rounded-lg border p-3">
          <div className="min-w-48 flex-1 space-y-1.5">
            <Label htmlFor={`rule-${def.key}`}>{def.label}</Label>
            {def.type === 'choice' ? (
              <select id={`rule-${def.key}`} className={SELECT} value={String(rules[def.key])} onChange={(e) => set(def.key, e.target.value)}>
                {def.choices.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            ) : def.type === 'flag' ? (
              <div id={`rule-${def.key}`} className="flex h-8 items-center text-sm">Yes</div>
            ) : (
              <Input id={`rule-${def.key}`} type={def.type === 'date' ? 'date' : 'text'} inputMode={def.type === 'number' ? 'numeric' : undefined}
                value={String(rules[def.key] ?? '')} onValueChange={(v) => set(def.key, v)} />
            )}
            {def.help ? <p className="text-xs text-muted-foreground">{def.help}</p> : null}
          </div>
          <Button type="button" variant="ghost" size="sm" aria-label={`Remove ${def.label}`} onClick={() => remove(def.key)}>Remove</Button>
        </div>
      ))}
      {available.length ? (
        <div className="max-w-sm space-y-1.5">
          <Label htmlFor="rule-add">Add a filter</Label>
          <select id="rule-add" className={SELECT} value="" onChange={(e) => { const def = defs.find((d) => d.key === e.target.value); if (def) set(def.key, startingValue(def)); }}>
            <option value="">Choose a filter…</option>
            {available.map((def) => <option key={def.key} value={def.key}>{def.label}</option>)}
          </select>
        </div>
      ) : null}
    </div>
  );
}

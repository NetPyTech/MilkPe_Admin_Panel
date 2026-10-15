'use client';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { SELECT_CLASS } from '@/lib/styles';
import { formatInr } from '@/lib/format';
import { blankTexts, changesFromPlan, emptyForm, formFromPlan, LANGUAGES, LIMIT_KEYS, limitsText, payloadFromForm, problemsIn, TEXT_FIELDS, type Form, type LimitKey, type TextField } from './form';
import { usePlanRefresh } from './refresh';
import { planSchema, type Plan } from './schemas';


function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

const LIMITS: Record<LimitKey, { label: string; unit: string; hint: string; inputMode: 'decimal' | 'numeric' }> = {
  weight_cap_kg: { label: 'Milk weight', unit: 'kg', inputMode: 'decimal', hint: 'Milk beyond this is charged to the wallet as usual.' },
  collections_cap: { label: 'Number of collections', unit: 'collections', inputMode: 'numeric', hint: 'Once reached, new collections are charged to the wallet as usual.' },
  suppliers_cap: { label: 'Suppliers', unit: 'suppliers', inputMode: 'numeric', hint: 'The most suppliers the dairy can hold at once. Adding more is refused.' },
  reports_cap: { label: 'Reports', unit: 'reports', inputMode: 'numeric', hint: 'PDF reports the dairy can build. The next one is refused.' },
};

/** The card as the dairy sees it in the app. */
function Preview({ form, language }: { form: Form; language: string }) {
  const own = form.translations[language];
  // a field left empty in another language shows the English one, field by field, as the app does
  const text = language === 'en' || !own ? { name: form.name, description: form.description, badge: form.badge } : {
    name: own.name || form.name, description: own.description || form.description, badge: own.badge || form.badge };
  const number = (value: string) => (Number.isFinite(Number(value)) ? Number(value) : 0);   // a half-typed limit shows as 0, never NaN
  const limits = limitsText({
    cap_period: form.cap_period, weight_cap_kg: form.limited.weight_cap_kg ? String(number(form.weight_cap_kg)) : null,
    collections_cap: form.limited.collections_cap ? number(form.collections_cap) : null,
    suppliers_cap: form.limited.suppliers_cap ? number(form.suppliers_cap) : null, reports_cap: form.limited.reports_cap ? number(form.reports_cap) : null,
  });
  return (
    <div role="group" aria-label="Preview" className="space-y-2 rounded-xl border bg-card p-4 shadow-sm">
      <div className="text-xs text-muted-foreground">How it looks in the app</div>
      {text.badge ? <span className="inline-block rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">{text.badge}</span> : null}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">{text.name || 'Plan name'}</div>
          {text.description ? <div className="text-sm text-muted-foreground">{text.description}</div> : null}
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-primary">{form.price && Number.isFinite(Number(form.price)) ? formatInr(form.price) : '₹—'}</div>
          <div className="text-xs text-muted-foreground">for {form.duration_days || '—'} days</div>
        </div>
      </div>
      <div className="rounded-lg bg-muted p-2 text-sm">{limits === 'No limits' ? 'No limits: unlimited milk, suppliers and reports. No wallet fee.' : limits}</div>
    </div>
  );
}

/** Create a plan, or change one. Every save asks for a reason (kept in the audit log). Dairies that already hold the plan keep the terms they paid for. */
export function PlanEditor({ plan }: { plan: Plan | null }) {
  const router = useRouter();
  const { afterPlanChange } = usePlanRefresh();
  // The plan the form was filled from. Changes are measured against THIS, not against a plan refetched later: a field nobody here touched
  // is then never sent, so it cannot revert what another admin saved in between.
  const [base] = useState(plan);
  const [form, setFormState] = useState<Form>(() => (plan ? formFromPlan(plan) : emptyForm()));
  const [language, setLanguage] = useState('en');
  const [error, setError] = useState('');
  const set = (change: Partial<Form>) => setFormState((current) => ({ ...current, ...change }));
  const nothingChanged = !!base && Object.keys(changesFromPlan(form, base).changed).length === 0;
  const problems = [...problemsIn(form), ...(nothingChanged ? ['Change something to save: the form is the same as the saved plan.'] : [])];
  const held = plan?.subscribers?.on_record ?? 0;

  const save = useMutation({
    mutationFn: () => api(plan ? `/superadmin/subscription-plans/${plan.id}/` : '/superadmin/subscription-plans/', planSchema, {
      method: plan ? 'PATCH' : 'POST', body: base ? changesFromPlan(form, base).body : payloadFromForm(form),
    }),
    onSuccess: async () => {
      await afterPlanChange();
      toast.success(plan ? 'Plan saved.' : 'Plan created.');
      router.replace('/plans');
    },
    onError: (failure: Error) => setError(failure.message),
  });

  const text = language === 'en' ? { name: form.name, description: form.description, badge: form.badge } : form.translations[language] ?? blankTexts();
  const setText = (field: TextField, value: string) => {
    if (language === 'en') set({ [field]: value } as Partial<Form>);
    else set({ translations: { ...form.translations, [language]: { ...(form.translations[language] ?? blankTexts()), [field]: value } } });
  };
  const written = (code: string) => code === 'en' ? form.name.trim() !== '' : !!form.translations[code] && Object.values(form.translations[code]).some((value) => value.trim() !== '');
  const name = language === 'en' ? 'English' : LANGUAGES.find(([code]) => code === language)?.[1] ?? language;

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold">{plan ? `Edit plan: ${plan.name}` : 'New plan'}</h1>
        {plan ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {held > 0 ? `${held} subscription${held === 1 ? '' : 's'} on record. ` : ''}Changes apply to new purchases only: a dairy that already holds this plan keeps the price, length and limits it paid for.
          </p>
        ) : <p className="mt-1 text-sm text-muted-foreground">While a dairy holds a plan, collection fees are not taken from its wallet, up to the milk limits you set here.</p>}
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-medium">What it is called</h2>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Languages">
          {[['en', 'English'], ...LANGUAGES].map(([code, label]) => (
            <button key={code} type="button" aria-pressed={language === code} onClick={() => setLanguage(code)}
              className={`rounded-md border px-2.5 py-1 text-sm ${language === code ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
              {label}{written(code) ? ' ✓' : ''}
            </button>
          ))}
        </div>
        {language !== 'en' ? <p className="text-xs text-muted-foreground">Leave {name} empty to show the English text to people who use {name}. A field left empty falls back to English on its own.</p> : null}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <Field label={`Name (${name})`} htmlFor="plan-name" hint={`${text.name.length} / ${TEXT_FIELDS.name}`}>
              <Input id="plan-name" value={text.name} onValueChange={(v) => setText('name', v)} />
            </Field>
            <Field label={`Description (${name})`} htmlFor="plan-description" hint={`${text.description.length} / ${TEXT_FIELDS.description}`}>
              <Textarea id="plan-description" rows={3} value={text.description} onChange={(e) => setText('description', e.target.value)} />
            </Field>
            <Field label={`Badge (${name})`} htmlFor="plan-badge" hint={`${text.badge.length} / ${TEXT_FIELDS.badge}. A short tag on the card, such as "Best value".`}>
              <Input id="plan-badge" value={text.badge} onValueChange={(v) => setText('badge', v)} />
            </Field>
          </div>
          <Preview form={form} language={language} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium">Price and length</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Price (₹)" htmlFor="plan-price" hint="Paid through Razorpay. ₹1 to ₹1,00,000.">
            <Input id="plan-price" inputMode="decimal" value={form.price} onValueChange={(v) => set({ price: v })} />
          </Field>
          <Field label="Lasts (days)" htmlFor="plan-days" hint="1 to 3650. For example 30, 90 or 365.">
            <Input id="plan-days" inputMode="numeric" value={form.duration_days} onValueChange={(v) => set({ duration_days: v })} />
          </Field>
          <Field label="Position in the list" htmlFor="plan-sort" hint="Smaller numbers come first.">
            <Input id="plan-sort" inputMode="numeric" value={form.sort_order} onValueChange={(v) => set({ sort_order: v })} />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium">Limits</h2>
        <p className="text-xs text-muted-foreground">Switch a limit on to cap it. With every limit off this is the full plan: unlimited milk, suppliers and reports.</p>
        <Field label="Limits start again" htmlFor="plan-period" hint="Counted from the day the dairy’s plan starts, not on calendar weeks or months.">
          <select id="plan-period" className={SELECT_CLASS} value={form.cap_period} onChange={(e) => set({ cap_period: e.target.value as Form['cap_period'] })}>
            <option value="week">Every 7 days</option>
            <option value="month">Every 30 days</option>
            <option value="validity">Never (one limit for the whole plan)</option>
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          {LIMIT_KEYS.map((key) => (
            <div key={key} className="space-y-2 rounded-lg border p-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={form.limited[key]} onChange={(e) => set({ limited: { ...form.limited, [key]: e.target.checked } })} />
                Limit {LIMITS[key].label.toLowerCase()}
              </label>
              <Input aria-label={`${LIMITS[key].label} limit (${LIMITS[key].unit})`} inputMode={LIMITS[key].inputMode} disabled={!form.limited[key]}
                placeholder={form.limited[key] ? LIMITS[key].unit : 'No limit'} value={form.limited[key] ? form[key] : ''} onValueChange={(v) => set({ [key]: v } as Partial<Form>)} />
              <p className="text-xs text-muted-foreground">{LIMITS[key].hint}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">On sale</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.is_active} onChange={(e) => set({ is_active: e.target.checked })} />
          Dairies can buy this plan. Switch off to take it off sale (dairies that hold it keep it).
        </label>
      </section>

      <section className="space-y-3">
        <Field label="Reason for this change" htmlFor="plan-reason">
          <Textarea id="plan-reason" rows={2} maxLength={500} value={form.reason} onChange={(e) => set({ reason: e.target.value })} placeholder="Why is this being done? (kept in the audit log)" />
        </Field>
      </section>

      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      {problems.length ? <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">{problems.map((problem) => <li key={problem}>{problem}</li>)}</ul> : null}
      <div className="flex gap-3 border-t pt-4">
        <Button onClick={() => { setError(''); save.mutate(); }} disabled={problems.length > 0 || save.isPending}>{plan ? 'Save plan' : 'Create plan'}</Button>
        <Button variant="outline" onClick={() => router.push('/plans')} disabled={save.isPending}>Cancel</Button>
      </div>
    </div>
  );
}

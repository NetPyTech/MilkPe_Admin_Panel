'use client';
import { useState, type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { blankText, type Form } from './form';
import { PreviewPanel } from './GroupEditor';
import { describeRules } from './GroupsTab';
import { RuleBuilder } from './RuleBuilder';
import type { Meta, Segment } from './schemas';

export const SELECT = 'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50';

export function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

type SetForm = (change: Partial<Form>) => void;

/** One card as the app shows it: the title, the message and the button, in the language being written (English where that language is blank). */
export function CardPreview({ form, language, meta }: { form: Form; language: string; meta: Meta }) {
  const own = form.texts[language];
  const fallback = !own || (own.title.trim() === '' && own.message.trim() === '');
  const text = fallback ? form.texts.en ?? blankText() : own;
  const name = meta.languages.find((l) => l.code === language)?.name ?? language;
  return (
    <div role="group" aria-label="Preview" className="space-y-2 rounded-xl border bg-card p-4 shadow-sm">
      <div className="text-xs text-muted-foreground">Preview · {name}{fallback && language !== 'en' ? ' (not written yet: people with this language see English)' : ''}</div>
      <div className="font-semibold">{text.title || 'Title'}</div>
      <div className="whitespace-pre-wrap text-sm">{text.message || 'Message'}</div>
      {form.cta !== 'none' ? <div className="inline-block rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground">{text.cta_label || 'View'}</div> : null}
    </div>
  );
}

export function TextsEditor({ form, setForm, meta, disabled }: { form: Form; setForm: SetForm; meta: Meta; disabled: boolean }) {
  const [language, setLanguage] = useState('en');
  const name = meta.languages.find((l) => l.code === language)?.name ?? language;
  const text = form.texts[language] ?? blankText();
  const set = (change: Partial<typeof text>) => setForm({ texts: { ...form.texts, [language]: { ...text, ...change } } });
  const limits = meta.limits;
  const written = (code: string) => !!form.texts[code] && (form.texts[code].title.trim() !== '' || form.texts[code].message.trim() !== '');
  const counter = (value: string, max: number) => <span className={value.length > max ? 'text-destructive' : undefined}>{value.length} / {max}</span>;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Languages">
        {meta.languages.map((l) => (
          <button key={l.code} type="button" aria-pressed={language === l.code} onClick={() => setLanguage(l.code)}
            className={`rounded-md border px-2.5 py-1 text-sm ${language === l.code ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
            {l.name}{written(l.code) ? ' ✓' : ''}
          </button>
        ))}
      </div>
      {language !== 'en' ? <p className="text-xs text-muted-foreground">Leave {name} empty to show English to people who use {name}.</p> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <Field label={`Title (${name})`} htmlFor="text-title" hint={counter(text.title, limits.title)}>
            <Input id="text-title" value={text.title} onValueChange={(v) => set({ title: v })} disabled={disabled} />
          </Field>
          <Field label={`Message (${name})`} htmlFor="text-message" hint={counter(text.message, limits.message)}>
            <Textarea id="text-message" rows={5} value={text.message} onChange={(e) => set({ message: e.target.value })} disabled={disabled} />
          </Field>
          {form.cta !== 'none' ? (
            <Field label={`Button label (${name})`} htmlFor="text-cta" hint={counter(text.cta_label, limits.cta_label)}>
              <Input id="text-cta" value={text.cta_label} onValueChange={(v) => set({ cta_label: v })} disabled={disabled} placeholder="Leave empty for “View”" />
            </Field>
          ) : null}
        </div>
        <CardPreview form={form} language={language} meta={meta} />
      </div>
    </div>
  );
}

export function AudiencePicker({ form, setForm, meta, segments, disabled }: { form: Form; setForm: SetForm; meta: Meta; segments: Segment[]; disabled: boolean }) {
  const saved = segments.find((s) => s.id === form.segmentId);
  return (
    <div className="space-y-3">
      <Field label="Send to" htmlFor="audience-type">
        <select id="audience-type" className={SELECT} value={form.audienceType} disabled={disabled} onChange={(e) => setForm({ audienceType: e.target.value as Form['audienceType'] })}>
          {meta.audiences.map((a) => <option key={a.type} value={a.type}>{a.label}</option>)}
        </select>
      </Field>
      {form.audienceType === 'users' ? (
        <Field label="Phone numbers" htmlFor="audience-phones" hint="One per line, or separated by commas. Up to 500.">
          <Textarea id="audience-phones" rows={4} value={form.phones} disabled={disabled} onChange={(e) => setForm({ phones: e.target.value })} />
        </Field>
      ) : null}
      {form.audienceType === 'segment' ? (
        <div className="space-y-3">
          <Field label="Group" htmlFor="audience-group">
            <select id="audience-group" className={SELECT} value={form.segmentId} disabled={disabled} onChange={(e) => setForm({ segmentId: e.target.value, rules: e.target.value ? {} : form.rules })}>
              <option value="">Custom filters…</option>
              {segments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          {saved ? (
            <p className="text-sm text-muted-foreground">{describeRules(saved.rules, meta.segment_rules)} · {saved.count} people now. The filters are copied when you save, so editing the group later does not change this message.</p>
          ) : disabled ? (
            <p className="text-sm text-muted-foreground">{describeRules(form.rules, meta.segment_rules) || 'No filters'}</p>
          ) : (
            <>
              <RuleBuilder defs={meta.segment_rules} rules={form.rules} onChange={(rules) => setForm({ rules })} />
              <PreviewPanel rules={form.rules} />
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function DeliveryFields({ form, setForm, meta, lockedAll, lockedText }: { form: Form; setForm: SetForm; meta: Meta; lockedAll: boolean; lockedText: boolean }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kind" htmlFor="ann-kind">
          <select id="ann-kind" className={SELECT} value={form.kind} disabled={lockedAll} onChange={(e) => setForm({ kind: e.target.value })}>{meta.kinds.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}</select>
        </Field>
        <Field label="Priority" htmlFor="ann-priority" hint="High is a high-priority push.">
          <select id="ann-priority" className={SELECT} value={form.priority} disabled={lockedAll} onChange={(e) => setForm({ priority: e.target.value })}>{meta.priorities.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}</select>
        </Field>
      </div>
      <div className="flex flex-wrap gap-6 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.sendPush} disabled={lockedAll} onChange={(e) => setForm({ sendPush: e.target.checked })} /> Send a push notification</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.showOnHome} disabled={lockedAll} onChange={(e) => setForm({ showOnHome: e.target.checked })} /> Show a card on the Home screen</label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Button" htmlFor="ann-cta">
          <select id="ann-cta" className={SELECT} value={form.cta} disabled={lockedAll} onChange={(e) => setForm({ cta: e.target.value as Form['cta'] })}>
            <option value="none">No button</option><option value="screen">Open a screen of the app</option><option value="url">Open a link</option>
          </select>
        </Field>
        {form.cta === 'screen' ? (
          <Field label="Screen" htmlFor="ann-screen">
            <select id="ann-screen" className={SELECT} value={form.screen} disabled={lockedAll} onChange={(e) => setForm({ screen: e.target.value })}>
              <option value="">Choose…</option>{meta.screens.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </Field>
        ) : null}
        {form.cta === 'url' ? (
          <Field label="Link (https)" htmlFor="ann-url"><Input id="ann-url" value={form.url} disabled={lockedAll} onValueChange={(v) => setForm({ url: v })} placeholder="https://" /></Field>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="When" htmlFor="ann-when">
          <select id="ann-when" className={SELECT} value={form.schedule} disabled={lockedAll} onChange={(e) => setForm({ schedule: e.target.value as Form['schedule'] })}>
            <option value="now">As soon as it is published</option><option value="later">At a set time (India time)</option>
          </select>
        </Field>
        {form.schedule === 'later' ? (
          <>
            <Field label="Send date" htmlFor="ann-send-date"><Input id="ann-send-date" type="date" value={form.sendDate} disabled={lockedAll} onValueChange={(v) => setForm({ sendDate: v })} /></Field>
            <Field label="Send time" htmlFor="ann-send-time"><Input id="ann-send-time" type="time" value={form.sendTime} disabled={lockedAll} onValueChange={(v) => setForm({ sendTime: v })} /></Field>
          </>
        ) : null}
      </div>
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.expires} disabled={lockedText} onChange={(e) => setForm({ expires: e.target.checked })} /> Stop showing it after a set time (India time)</label>
        {form.expires ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Expiry date" htmlFor="ann-exp-date"><Input id="ann-exp-date" type="date" value={form.expiresDate} disabled={lockedText} onValueChange={(v) => setForm({ expiresDate: v })} /></Field>
            <Field label="Expiry time" htmlFor="ann-exp-time"><Input id="ann-exp-time" type="time" value={form.expiresTime} disabled={lockedText} onValueChange={(v) => setForm({ expiresTime: v })} /></Field>
          </div>
        ) : null}
      </div>
    </div>
  );
}

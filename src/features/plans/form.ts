import type { Plan } from './schemas';

export const LANGUAGES = [['hi', 'Hindi'], ['pa', 'Punjabi'], ['kn', 'Kannada'], ['mr', 'Marathi'], ['gu', 'Gujarati']] as const;
export const LIMIT_KEYS = ['weight_cap_kg', 'collections_cap', 'suppliers_cap', 'reports_cap'] as const;
export type LimitKey = (typeof LIMIT_KEYS)[number];
export const TEXT_FIELDS = { name: 60, description: 200, badge: 24 } as const;
export type TextField = keyof typeof TEXT_FIELDS;

export type Texts = Record<TextField, string>;

export type Form = {
  name: string; description: string; badge: string; price: string; duration_days: string;
  cap_period: 'week' | 'month' | 'validity';
  limited: Record<LimitKey, boolean>;
  weight_cap_kg: string; collections_cap: string; suppliers_cap: string; reports_cap: string;
  sort_order: string; is_active: boolean;
  translations: Record<string, Texts>;
  reason: string;
};

export const MAX_DAYS = 3650;
/** A whole number of days from 1 to 3650 (the server's own range for a plan's length, a gift and an extension). */
export const validDayCount = (text: string) => /^\d{1,4}$/.test(text) && Number(text) >= 1 && Number(text) <= MAX_DAYS;

export const blankTexts = (): Texts => ({ name: '', description: '', badge: '' });

export const emptyForm = (): Form => ({
  name: '', description: '', badge: '', price: '', duration_days: '30', cap_period: 'month',
  limited: { weight_cap_kg: false, collections_cap: false, suppliers_cap: false, reports_cap: false },
  weight_cap_kg: '', collections_cap: '', suppliers_cap: '', reports_cap: '', sort_order: '0', is_active: true, translations: {}, reason: '',
});

export function formFromPlan(plan: Plan): Form {
  const translations: Record<string, Texts> = {};
  for (const [code, texts] of Object.entries(plan.translations)) translations[code] = { ...blankTexts(), ...texts };
  return {
    name: plan.name, description: plan.description, badge: plan.badge, price: plan.price.replace(/\.00$/, ''), duration_days: String(plan.duration_days),
    cap_period: plan.cap_period,
    limited: { weight_cap_kg: plan.weight_cap_kg !== null, collections_cap: plan.collections_cap !== null, suppliers_cap: plan.suppliers_cap !== null, reports_cap: plan.reports_cap !== null },
    weight_cap_kg: plan.weight_cap_kg === null ? '' : plan.weight_cap_kg.replace(/\.00$/, ''),
    collections_cap: plan.collections_cap === null ? '' : String(plan.collections_cap),
    suppliers_cap: plan.suppliers_cap === null ? '' : String(plan.suppliers_cap),
    reports_cap: plan.reports_cap === null ? '' : String(plan.reports_cap),
    sort_order: String(plan.sort_order), is_active: plan.is_active, translations, reason: '',
  };
}

const MONEY = /^\d{1,8}(\.\d{1,2})?$/;
const WHOLE = /^\d{1,9}$/;
const WHOLE_LIMITS: Record<Exclude<LimitKey, 'weight_cap_kg'>, [string, number]> = {
  collections_cap: ['Number of collections', 100_000_000], suppliers_cap: ['Suppliers', 1_000_000], reports_cap: ['Reports', 1_000_000],
};

/** What stops the form being saved, in words (the server checks again; this only saves a round trip). */
export function problemsIn(form: Form): string[] {
  const out: string[] = [];
  const name = form.name.trim();
  if (!name) out.push('Give the plan a name.');
  else if (name.length > TEXT_FIELDS.name) out.push(`The name can be at most ${TEXT_FIELDS.name} characters.`);
  if (form.description.trim().length > TEXT_FIELDS.description) out.push(`The description can be at most ${TEXT_FIELDS.description} characters.`);
  if (form.badge.trim().length > TEXT_FIELDS.badge) out.push(`The badge can be at most ${TEXT_FIELDS.badge} characters.`);
  if (!MONEY.test(form.price) || Number(form.price) < 1 || Number(form.price) > 100000) out.push('The price must be from ₹1 to ₹1,00,000 with at most two decimals.');
  if (!validDayCount(form.duration_days)) out.push(`The length must be from 1 to ${MAX_DAYS} days.`);
  if (form.limited.weight_cap_kg && (!MONEY.test(form.weight_cap_kg) || Number(form.weight_cap_kg) <= 0)) out.push('The weight limit must be more than 0 kg, with at most two decimals.');
  for (const [key, [label, max]] of Object.entries(WHOLE_LIMITS) as [Exclude<LimitKey, 'weight_cap_kg'>, [string, number]][]) {
    if (form.limited[key] && (!WHOLE.test(form[key]) || Number(form[key]) < 1 || Number(form[key]) > max)) out.push(`${label} limit must be a whole number from 1 to ${max.toLocaleString('en-IN')}.`);
  }
  if (!WHOLE.test(form.sort_order) || Number(form.sort_order) > 32000) out.push('The position must be a whole number from 0 to 32000.');
  for (const [code, texts] of Object.entries(form.translations)) {
    for (const field of Object.keys(TEXT_FIELDS) as TextField[]) {
      if (texts[field].trim().length > TEXT_FIELDS[field]) out.push(`${LANGUAGES.find(([c]) => c === code)?.[1] ?? code} ${field} is longer than ${TEXT_FIELDS[field]} characters.`);
    }
  }
  const reason = form.reason.trim();
  if (reason.length < 3 || reason.length > 500) out.push('Write a reason of 3 to 500 characters (kept in the audit log).');
  return out;
}

/** Equal as the server sees them: an amount typed as 2000.50 or 2000.5 is one value, not a change. */
const AMOUNT_KEYS = ['price', 'weight_cap_kg'];
const sameValue = (key: string, a: unknown, b: unknown) =>
  AMOUNT_KEYS.includes(key) && typeof a === 'string' && typeof b === 'string' && MONEY.test(a) && MONEY.test(b) ? Number(a) === Number(b) : JSON.stringify(a) === JSON.stringify(b);

/** What changed against the saved plan, for a PATCH: only the fields that differ (a field nobody touched is not sent, so it cannot overwrite what someone
 * else saved meanwhile), and the whole translations object when any language changed (the server replaces it as a whole). The reason always goes. */
export function changesFromPlan(form: Form, plan: Plan) {
  const now = payloadFromForm(form);
  const before = payloadFromForm({ ...formFromPlan(plan), reason: form.reason });
  const changed: Record<string, unknown> = {};
  for (const key of Object.keys(now) as (keyof typeof now)[]) {
    if (key === 'reason') continue;
    if (!sameValue(key, now[key], before[key])) changed[key] = now[key];
  }
  return { changed, body: { ...changed, reason: now.reason } };
}

/** The request body. Limits that are not switched on are sent as null (no limit); a language with no text is left out. */
export function payloadFromForm(form: Form) {
  const translations: Record<string, Record<string, string>> = {};
  for (const [code, texts] of Object.entries(form.translations)) {
    const kept = Object.fromEntries((Object.keys(TEXT_FIELDS) as TextField[]).map((field) => [field, texts[field].trim()]).filter(([, text]) => text));
    if (Object.keys(kept).length) translations[code] = kept;
  }
  return {
    name: form.name.trim(), description: form.description.trim(), badge: form.badge.trim(), translations,
    price: form.price, duration_days: Number(form.duration_days), cap_period: form.cap_period,
    weight_cap_kg: form.limited.weight_cap_kg ? form.weight_cap_kg : null,
    collections_cap: form.limited.collections_cap ? Number(form.collections_cap) : null,
    suppliers_cap: form.limited.suppliers_cap ? Number(form.suppliers_cap) : null,
    reports_cap: form.limited.reports_cap ? Number(form.reports_cap) : null,
    sort_order: Number(form.sort_order), is_active: form.is_active, reason: form.reason.trim(),
  };
}

const PERIOD_TEXT = { week: 'every 7 days', month: 'every 30 days', validity: 'over the whole plan' } as const;
const grouped = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

/** One line for a table: "2,000 kg every 30 days · 50 suppliers", or "No limits". */
export function limitsText(plan: { cap_period: Plan['cap_period']; weight_cap_kg: string | null; collections_cap: number | null; suppliers_cap: number | null; reports_cap: number | null }) {
  const period = PERIOD_TEXT[plan.cap_period];
  const parts: string[] = [];
  if (plan.weight_cap_kg !== null) parts.push(`${grouped.format(Number(plan.weight_cap_kg))} kg ${period}`);
  if (plan.collections_cap !== null) parts.push(`${grouped.format(plan.collections_cap)} collections ${period}`);
  if (plan.suppliers_cap !== null) parts.push(`${grouped.format(plan.suppliers_cap)} suppliers`);
  if (plan.reports_cap !== null) parts.push(`${grouped.format(plan.reports_cap)} reports ${period}`);
  return parts.length ? parts.join(' · ') : 'No limits';
}

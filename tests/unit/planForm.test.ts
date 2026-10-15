import { describe, expect, it } from 'vitest';
import { changesFromPlan, emptyForm, formFromPlan, limitsText, payloadFromForm, problemsIn, type Form } from '@/features/plans/form';
import type { Plan } from '@/features/plans/schemas';
import plans from '../fixtures/plans-list.json';

const valid = (change: Partial<Form> = {}): Form => ({ ...emptyForm(), name: 'Starter', price: '399', reason: 'Launch plan', ...change });

describe('problemsIn', () => {
  it('accepts a plan with only a name, a price, a length and a reason (every limit off = the full plan)', () => {
    expect(problemsIn(valid())).toEqual([]);
  });
  it('names what is wrong with each field', () => {
    expect(problemsIn(valid({ name: ' ' }))).toContain('Give the plan a name.');
    expect(problemsIn(valid({ price: '0' })).join()).toMatch(/price must be/);
    expect(problemsIn(valid({ price: '10.555' })).join()).toMatch(/price must be/);
    expect(problemsIn(valid({ price: '100001' })).join()).toMatch(/price must be/);
    expect(problemsIn(valid({ duration_days: '0' })).join()).toMatch(/length/);
    expect(problemsIn(valid({ duration_days: '4000' })).join()).toMatch(/length/);
    expect(problemsIn(valid({ reason: 'no' })).join()).toMatch(/reason/);
    expect(problemsIn(valid({ sort_order: '40000' })).join()).toMatch(/position/);
    expect(problemsIn(valid({ badge: 'x'.repeat(25) })).join()).toMatch(/badge/);
  });
  it('checks a limit only when it is switched on', () => {
    expect(problemsIn(valid({ weight_cap_kg: 'abc' }))).toEqual([]);
    const on = { weight_cap_kg: true, collections_cap: true, suppliers_cap: true, reports_cap: true };
    expect(problemsIn(valid({ limited: on, weight_cap_kg: '0', collections_cap: '0', suppliers_cap: 'x', reports_cap: '' })).length).toBe(4);
    expect(problemsIn(valid({ limited: on, weight_cap_kg: '2000.5', collections_cap: '900', suppliers_cap: '50', reports_cap: '20' }))).toEqual([]);
  });
  it('measures the description and badge as the server does, without surrounding blanks', () => {
    expect(problemsIn(valid({ description: `${'x'.repeat(200)}\n` }))).toEqual([]);
    expect(problemsIn(valid({ description: 'x'.repeat(201) })).join()).toMatch(/description/);
    expect(problemsIn(valid({ badge: `  ${'b'.repeat(24)}  ` }))).toEqual([]);
  });
  it('checks translated texts against the same lengths', () => {
    const translations = { hi: { name: 'x'.repeat(61), description: '', badge: '' } };
    expect(problemsIn(valid({ translations })).join()).toMatch(/Hindi name is longer than 60/);
  });
});

describe('payloadFromForm', () => {
  it('sends null for a limit that is off and numbers for the ones that are on', () => {
    const body = payloadFromForm(valid({ limited: { weight_cap_kg: true, collections_cap: false, suppliers_cap: true, reports_cap: false }, weight_cap_kg: '2000', suppliers_cap: '50', collections_cap: '77' }));
    expect(body).toMatchObject({ weight_cap_kg: '2000', collections_cap: null, suppliers_cap: 50, reports_cap: null, price: '399', duration_days: 30, cap_period: 'month', is_active: true });
  });
  it('leaves out a language with no text and empty fields of one with some', () => {
    const body = payloadFromForm(valid({ translations: { hi: { name: ' स्टार्टर ', description: '', badge: '' }, pa: { name: '', description: '', badge: '' } } }));
    expect(body.translations).toEqual({ hi: { name: 'स्टार्टर' } });
  });
});

describe('changesFromPlan', () => {
  const saved = plans.results.find((plan) => plan.weight_cap_kg !== null) as Plan;
  const edited = (change: Partial<Form>): Form => ({ ...formFromPlan(saved), reason: 'A reason', ...change });
  it('is empty for the saved plan, and for the same amounts written another way', () => {
    expect(changesFromPlan(edited({}), saved).changed).toEqual({});
    expect(changesFromPlan(edited({ price: '399.00', weight_cap_kg: '2000.00' }), saved).changed).toEqual({});
  });
  it('compares only amounts as numbers: a name or badge that looks like a number is still text', () => {
    expect(changesFromPlan(edited({ badge: '100' }), { ...saved, badge: '100.0' }).changed).toEqual({ badge: '100' });
    expect(changesFromPlan(edited({ name: '0100' }), { ...saved, name: '100' }).changed).toEqual({ name: '0100' });
  });
  it('sends only the languages that changed, and an empty one for a language that was removed', () => {
    const withTwo = { ...saved, translations: { hi: { name: 'स्टार्टर' }, pa: { name: 'ਸ਼ੁਰੂ' } } };
    const form = (change: Record<string, { name: string; description: string; badge: string }>) =>
      ({ ...formFromPlan(withTwo), reason: 'A reason', translations: { ...formFromPlan(withTwo).translations, ...change } });
    expect(changesFromPlan(form({ pa: { name: 'ਨਵਾਂ', description: '', badge: '' } }), withTwo).changed).toEqual({ translations: { pa: { name: 'ਨਵਾਂ' } } });
    expect(changesFromPlan(form({ hi: { name: '', description: '', badge: '' } }), withTwo).changed).toEqual({ translations: { hi: {} } });
    expect(changesFromPlan(form({}), withTwo).changed).toEqual({});
  });
  it('holds only what differs, with a real change in an amount counted', () => {
    expect(changesFromPlan(edited({ price: '449.5' }), saved).changed).toEqual({ price: '449.5' });
    expect(changesFromPlan(edited({ description: 'New text' }), saved).body).toEqual({ description: 'New text', reason: 'A reason' });
  });
});

describe('formFromPlan and limitsText', () => {
  const starter = plans.results.find((plan) => plan.weight_cap_kg !== null) as Plan;
  it('switches on exactly the limits the plan has and drops the .00', () => {
    const form = formFromPlan(starter);
    expect(form.limited).toEqual({ weight_cap_kg: true, collections_cap: true, suppliers_cap: true, reports_cap: true });
    expect(form.weight_cap_kg).toBe('2000');
    expect(form.price).toBe('399');
    expect(form.translations.hi.name).toBe('स्टार्टर');
    expect(form.reason).toBe('');
  });
  it('writes the limits in one line, or says there are none', () => {
    expect(limitsText(starter)).toBe('2,000 kg every 30 days · 900 collections every 30 days · 50 suppliers · 20 reports every 30 days');
    expect(limitsText({ cap_period: 'validity', weight_cap_kg: null, collections_cap: null, suppliers_cap: null, reports_cap: null })).toBe('No limits');
    expect(limitsText({ cap_period: 'week', weight_cap_kg: '500.00', collections_cap: null, suppliers_cap: null, reports_cap: null })).toBe('500 kg every 7 days');
  });
});

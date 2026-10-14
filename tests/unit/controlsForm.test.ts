import { describe, expect, it } from 'vitest';
import list from '../fixtures/controls-config-list.json';
import { blankRow, changed, draftOf, hint, summary, valueOf, type Draft } from '@/features/controls/form';
import { configListSchema, type ConfigRow } from '@/features/controls/schemas';

const rows = configListSchema.parse(list).results;
const row = (key: string) => rows.find((r) => r.key === key) as ConfigRow;

describe('setting drafts', () => {
  it('starts from the value in use and sends back the same value untouched', () => {
    for (const r of rows) {
      expect(changed(r, draftOf(r)), r.key).toBe(false);
      expect(valueOf(r, draftOf(r)), r.key).toEqual(JSON.parse(JSON.stringify(r.value)));
    }
  });

  it('a whole number goes as a number, a decimal as the text typed', () => {
    const trial = row('TRIAL_PERIOD_DAYS');
    expect(valueOf(trial, '45')).toBe(45);
    const fee = row('COLLECTION_FEE');
    const draft = { ...(draftOf(fee) as Record<string, string | boolean>), PER_KG_RATE: '0.015' };
    expect(valueOf(fee, draft)).toEqual({ ENABLED: true, PER_KG_RATE: '0.015' });
  });

  it('leaves unreadable text as typed so the server names the problem', () => {
    expect(valueOf(row('TRIAL_PERIOD_DAYS'), '3x')).toBe('3x');
    expect(valueOf(row('TRIAL_PERIOD_DAYS'), '')).toBe('');
  });

  it('knows when something changed, and when it was changed back', () => {
    const fee = row('COLLECTION_FEE');
    const draft = draftOf(fee) as Record<string, string | boolean>;
    expect(changed(fee, { ...draft, ENABLED: false })).toBe(true);
    expect(changed(fee, { ...draft, PER_KG_RATE: '0.0120' })).toBe(true);
    expect(changed(fee, { ...draft, ENABLED: true })).toBe(false);
  });

  it('edits a list: add a row, remove a row', () => {
    const tiers = row('WALLET_RECHARGE_BONUS_TIERS');
    const draft = draftOf(tiers) as Array<Record<string, string | boolean>>;
    expect(draft).toHaveLength(2);
    const added: Draft = [...draft, { ...blankRow(tiers.fields), min_amount: '2000', bonus_percent: '15' }];
    expect(changed(tiers, added)).toBe(true);
    expect((valueOf(tiers, added) as unknown[])).toHaveLength(3);
    expect(changed(tiers, draft.slice(0, 1))).toBe(true);
  });

  it('writes a hint from the range and the server help, and a one-line summary', () => {
    expect(hint(row('COLLECTION_FEE').fields[1])).toBe('0 to 10 · Up to 3 decimals, e.g. 0.012.');
    expect(hint(row('COLLECTION_FEE').fields[0])).toBe('');
    expect(summary(row('TRIAL_PERIOD_DAYS'))).toBe('30');
    expect(summary(row('WALLET_RECHARGE_BONUS_TIERS'))).toBe('2 tiers');
  });
});

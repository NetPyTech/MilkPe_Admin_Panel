import { describe, expect, it } from 'vitest';
import { isoToIst, istToIso } from '@/lib/datetime';

describe('India date and time', () => {
  it('writes a typed date and time as an instant with the India offset', () => {
    expect(istToIso('2026-10-20', '10:30')).toBe('2026-10-20T10:30:00+05:30');
    expect(istToIso('2026-10-20', '')).toBeNull();
    expect(istToIso('', '10:30')).toBeNull();
    expect(istToIso('20-10-2026', '10:30')).toBeNull();
    expect(istToIso('2026-10-20', '25:00')).toBeNull();
  });
  it('reads an instant as the India date and time (23:30 on the 14th is still the 14th there)', () => {
    expect(isoToIst('2026-10-14T18:00:00Z')).toEqual({ date: '2026-10-14', time: '23:30' });
    expect(isoToIst('2026-10-14T19:00:00Z')).toEqual({ date: '2026-10-15', time: '00:30' });
    expect(isoToIst('2026-10-14T18:29:59Z')).toEqual({ date: '2026-10-14', time: '23:59' });
  });
  it('is empty for nothing or nonsense', () => {
    expect(isoToIst(null)).toEqual({ date: '', time: '' });
    expect(isoToIst('not a date')).toEqual({ date: '', time: '' });
  });
  it('round-trips', () => {
    const iso = istToIso('2026-03-01', '00:05')!;
    expect(isoToIst(iso)).toEqual({ date: '2026-03-01', time: '00:05' });
  });
});

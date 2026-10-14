import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, formatInr, formatShortDay, formatUnit } from '@/lib/format';
import { readFilters, withFilters } from '@/lib/filters';

describe('format', () => {
  it('groups rupees the Indian way', () => {
    expect(formatInr('123456.78')).toBe('₹1,23,456.78');
    expect(formatInr('0')).toBe('₹0.00');
    expect(formatInr(null)).toBe('—');
  });
  it('shows times in India', () => {
    expect(formatDateTime('2026-10-14T18:00:00Z')).toMatch(/14 Oct 2026.*11:30/i); // 23:30 India
    expect(formatDate('2026-10-14T19:00:00Z')).toBe('15 Oct 2026');                 // already the 15th there
    expect(formatDateTime(null)).toBe('—');
  });
});

describe('analytics formats', () => {
  it('formats a value by its unit', () => {
    expect(formatUnit('1234567', 'count')).toBe('12,34,567');
    expect(formatUnit('12.5', 'count')).toBe('12.5');
    expect(formatUnit('135007.92', 'kg')).toBe('1,35,007.92 kg');
    expect(formatUnit('728267.5', 'rupees')).toBe('₹7,28,267.50');
  });
  it('writes a day short, as the India calendar day', () => {
    expect(formatShortDay('2026-10-14')).toBe('14 Oct');
    expect(formatShortDay('2026-01-05')).toBe('5 Jan');
  });
});

describe('filters', () => {
  it('reads only the known keys', () => {
    const p = new URLSearchParams('role=buyer&x=1&search=');
    expect(readFilters(p, ['role', 'search'])).toEqual({ role: 'buyer' });
  });
  it('writes a query, drops empties and the cursor when a filter changes', () => {
    const p = new URLSearchParams('role=buyer&cursor=abc');
    expect(withFilters(p, { language: 'hi', role: '' })).toBe('language=hi');
    expect(withFilters(p, { cursor: 'def' })).toBe('role=buyer&cursor=def');
  });
});

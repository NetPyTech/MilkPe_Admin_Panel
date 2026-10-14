const ZONE = 'Asia/Kolkata';
const NONE = '—';
const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateTime = new Intl.DateTimeFormat('en-IN', { timeZone: ZONE, day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
const day = new Intl.DateTimeFormat('en-IN', { timeZone: ZONE, day: '2-digit', month: 'short', year: 'numeric' });

// Display only: the amount was worked out by the server.
export const formatInr = (value: string | number | null) => (value === null || value === undefined || value === '' ? NONE : money.format(Number(value)));

const parts = (formatter: Intl.DateTimeFormat, iso: string) =>
  Object.fromEntries(formatter.formatToParts(new Date(iso)).map((part) => [part.type, part.value]));

export function formatDateTime(iso: string | null) {
  if (!iso) return NONE;
  const p = parts(dateTime, iso);
  return `${Number(p.day)} ${p.month} ${p.year}, ${p.hour}:${p.minute} ${p.dayPeriod}`;
}

export function formatDate(iso: string | null) {
  if (!iso) return NONE;
  const p = parts(day, iso);
  return `${Number(p.day)} ${p.month} ${p.year}`;
}

const grouped = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A server number written for its unit: a count in Indian grouping, kilograms, or rupees. */
export function formatUnit(value: string, unit: 'count' | 'kg' | 'rupees') {
  if (unit === 'rupees') return formatInr(value);
  const text = grouped.format(Number(value));
  return unit === 'kg' ? `${text} kg` : text;
}

/** `2026-10-14` as `14 Oct` - a calendar day the server named, so no time zone is involved. */
export function formatShortDay(isoDay: string) {
  const [, month, day] = isoDay.split('-').map(Number);
  return `${day} ${SHORT_MONTHS[month - 1]}`;
}

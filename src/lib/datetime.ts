/** The owner types dates and times as India time. India has no daylight saving, so a typed date and time becomes an instant by writing the fixed
 *  +05:30 offset (no clock arithmetic), and an instant is read back as India time with the platform's time-zone data. */
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function istToIso(date: string, time: string): string | null {
  if (!DATE.test(date) || !TIME.test(time)) return null;
  return `${date}T${time}:00+05:30`;
}

const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

export function isoToIst(iso: string | null): { date: string; time: string } {
  const moment = iso ? new Date(iso) : null;
  if (!moment || Number.isNaN(moment.getTime())) return { date: '', time: '' };
  const p = Object.fromEntries(parts.formatToParts(moment).map((part) => [part.type, part.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

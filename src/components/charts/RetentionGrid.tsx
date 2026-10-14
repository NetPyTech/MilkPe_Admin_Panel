import { inkOn } from './scale';

export type Cohort = { week: string; size: number; retained: (string | null)[] };

const STEPS = [[0, 'var(--seq-100)', '#cde2fb'], [20, '#86b6ef', '#86b6ef'], [40, '#3987e5', '#3987e5'], [60, '#1c5cab', '#1c5cab'], [80, '#0d366b', '#0d366b']] as const;

function fill(rate: string) {
  const value = Number(rate);
  const step = [...STEPS].reverse().find(([from]) => value >= from) ?? STEPS[0];
  return { background: step[1] === 'var(--seq-100)' ? 'var(--seq-100)' : step[1], ink: inkOn(step[2]) };
}

/** Cohort retention: one row per week of new users, one column per week since; a darker blue is a larger share, and every cell says its number. */
export function RetentionGrid({ cohorts, formatWeek }: { cohorts: Cohort[]; formatWeek: (week: string) => string }) {
  const columns = cohorts[0]?.retained.length ?? 0;
  if (cohorts.every((c) => c.size === 0)) return <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">No users have been seen in these weeks yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate text-sm" style={{ borderSpacing: 2 }}>
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th className="p-1 text-left font-normal">Week of</th><th className="p-1 text-right font-normal">New users</th>
            {Array.from({ length: columns }, (_, i) => <th key={i} className="p-1 font-normal">{i === 0 ? 'Week 0' : `+${i}`}</th>)}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((cohort) => (
            <tr key={cohort.week}>
              <td className="p-1 whitespace-nowrap">{formatWeek(cohort.week)}</td>
              <td className="p-1 text-right tabular-nums">{cohort.size}</td>
              {cohort.retained.map((rate, i) => {
                const look = rate === null ? null : fill(rate);
                return (
                  <td key={i} className="min-w-12 rounded p-1 text-center text-xs tabular-nums" title={rate === null ? undefined : `${rate}% of ${cohort.size} were active`}
                    style={look ? { background: look.background, color: look.ink } : { color: 'var(--viz-text-3)' }}>
                    {rate === null ? '—' : `${rate}%`}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

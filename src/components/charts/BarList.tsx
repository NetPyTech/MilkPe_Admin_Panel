export type BarRow = { key: string; label: string; value: number; text: string; note?: string };

/** Horizontal bars for a ranked list. All rows share one grid, so every bar has the same track and its length is its share of the largest
 *  value, whatever text sits beside it; at most 16px thick with a 4px rounded tip; the value is written after the track. */
export function BarList({ rows, empty = 'Nothing to show.' }: { rows: BarRow[]; empty?: string }) {
  if (rows.length === 0) return <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.value), 0) || 1;
  return (
    <ul className="grid grid-cols-[minmax(6rem,12rem)_minmax(8rem,1fr)_auto] items-center gap-x-3 gap-y-2 text-sm">
      {rows.map((row) => {
        const hint = `${row.label}: ${row.text}${row.note ? ` (${row.note})` : ''}`;
        return (
          <li key={row.key} className="contents">
            <span className="truncate" title={hint} style={{ color: 'var(--viz-text)' }}>{row.label}</span>
            <span className="block h-4 min-w-0" title={hint}>
              <span data-bar className="block h-4" style={{ width: `${Math.max(1, (row.value / max) * 100)}%`, background: 'var(--series-1)', borderRadius: '0 4px 4px 0' }} />
            </span>
            <span className="flex items-baseline gap-2 whitespace-nowrap" title={hint}>
              <span className="font-semibold tabular-nums" style={{ color: 'var(--viz-text)' }}>{row.text}</span>
              {row.note ? <span className="text-xs" style={{ color: 'var(--viz-text-2)' }}>{row.note}</span> : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

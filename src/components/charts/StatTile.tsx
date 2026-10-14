/** One headline number: label, value, and how it compares (signed, against a named period). Up is good for every number shown here. */
export function StatTile({ label, value, note, change, changeLabel }: { label: string; value: string; note?: string; change?: string | null; changeLabel?: string }) {
  const delta = change === undefined || change === null ? null : Number(change);
  return (
    <div className="rounded-lg border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {note ? <div className="mt-0.5 text-xs text-muted-foreground">{note}</div> : null}
      <div className="mt-2 text-xs" style={{ color: delta === null || delta === 0 ? 'var(--viz-text-2)' : delta > 0 ? 'var(--status-good)' : 'var(--status-critical)' }}>
        {delta === null ? '— no comparison yet' : `${delta > 0 ? '▲' : delta < 0 ? '▼' : '•'} ${change}% ${changeLabel ?? ''}`.trim()}
      </div>
    </div>
  );
}

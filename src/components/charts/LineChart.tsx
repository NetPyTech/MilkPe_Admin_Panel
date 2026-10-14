'use client';
import { useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { compact, niceScale } from './scale';

export type Series = { key: string; label: string; color: string };
export type Point = { x: string; values: Record<string, number> };

type Props = {
  title: string;
  series: Series[];
  points: Point[];
  formatValue: (value: number) => string;
  formatX: (x: string) => string;
};

const W = 720, H = 240, LEFT = 48, RIGHT = 16, TOP = 12, BOTTOM = 28;

/** A line chart on one y-axis: 2px lines, a hairline grid, an end dot per series, a crosshair with one tooltip listing every series, a legend
 *  for two or more series, and a table view of the same numbers. Keyboard: focus the chart, then left/right arrows move the readout. */
export function LineChart({ title, series, points, formatValue, formatX }: Props) {
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);

  const max = Math.max(0, ...points.flatMap((p) => series.map((s) => p.values[s.key] ?? 0)));
  if (points.length === 0 || max === 0) {
    return (
      <figure className="space-y-2">
        <figcaption className="text-sm font-medium">{title}</figcaption>
        <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">Nothing recorded in this range.</p>
      </figure>
    );
  }
  const scale = niceScale(max);
  const x = (i: number) => LEFT + (points.length === 1 ? (W - LEFT - RIGHT) / 2 : (i / (points.length - 1)) * (W - LEFT - RIGHT));
  const y = (v: number) => TOP + (1 - v / scale.top) * (H - TOP - BOTTOM);
  const path = (s: Series) => points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.values[s.key] ?? 0).toFixed(1)}`).join(' ');
  const labelEvery = Math.max(1, Math.ceil(points.length / 6));

  function nearest(event: PointerEvent<SVGRectElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const fraction = (event.clientX - rect.left) / rect.width;
    const position = (fraction * W - LEFT) / (W - LEFT - RIGHT);
    setActive(Math.min(points.length - 1, Math.max(0, Math.round(position * (points.length - 1)))));
  }
  function onKey(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft') setActive((current) => Math.max(0, (current ?? points.length) - 1));
    else if (event.key === 'ArrowRight') setActive((current) => Math.min(points.length - 1, (current ?? -1) + 1));
    else if (event.key === 'Escape') setActive(null);
    else return;
    event.preventDefault();
  }

  const point = active === null ? null : points[active];
  return (
    <figure className="max-w-4xl space-y-2">
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">{title}</span>
        <button type="button" className="text-xs text-muted-foreground underline-offset-4 hover:underline" onClick={() => setAsTable((v) => !v)}>
          {asTable ? 'Show chart' : 'Show as table'}
        </button>
      </figcaption>
      {series.length >= 2 ? (
        <ul className="flex flex-wrap gap-4 text-xs" aria-label="Legend">
          {series.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5" style={{ color: 'var(--viz-text-2)' }}>
              <span aria-hidden className="inline-block h-0.5 w-4 rounded" style={{ background: s.color }} />{s.label}
            </li>
          ))}
        </ul>
      ) : null}

      {asTable ? (
        <div className="max-h-72 overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background text-left text-xs text-muted-foreground">
              <tr><th className="p-2">Day</th>{series.map((s) => <th key={s.key} className="p-2 text-right">{s.label}</th>)}</tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.x} className="border-t">
                  <td className="p-2">{formatX(p.x)}</td>
                  {series.map((s) => <td key={s.key} className="p-2 text-right tabular-nums">{formatValue(p.values[s.key] ?? 0)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={box} className="relative" style={{ color: 'var(--viz-text-2)' }}>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-labelledby={`${id}-t`} tabIndex={0} onKeyDown={onKey} onFocus={() => active === null && setActive(points.length - 1)} onBlur={() => setActive(null)}>
            <title id={`${id}-t`}>{`${title}. Use the left and right arrow keys to read each day.`}</title>
            {scale.ticks.map((t) => (
              <g key={t}>
                <line x1={LEFT} x2={W - RIGHT} y1={y(t)} y2={y(t)} stroke={t === 0 ? 'var(--viz-axis)' : 'var(--viz-grid)'} strokeWidth={1} />
                <text x={LEFT - 8} y={y(t) + 4} textAnchor="end" fontSize={10} fill="var(--viz-text-3)">{compact(t)}</text>
              </g>
            ))}
            {points.map((p, i) => i % labelEvery === 0 ? (
              <text key={p.x} x={x(i)} y={H - 8} textAnchor="middle" fontSize={10} fill="var(--viz-text-3)">{formatX(p.x)}</text>
            ) : null)}
            {series.length === 1 ? <path d={`${path(series[0])} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={series[0].color} opacity={0.1} /> : null}
            {series.map((s) => <path key={s.key} d={path(s)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />)}
            {series.map((s) => (
              <circle key={s.key} cx={x(points.length - 1)} cy={y(points[points.length - 1].values[s.key] ?? 0)} r={4} fill={s.color} stroke="var(--viz-surface)" strokeWidth={2} />
            ))}
            {active !== null ? (
              <g>
                <line x1={x(active)} x2={x(active)} y1={TOP} y2={H - BOTTOM} stroke="var(--viz-axis)" strokeWidth={1} />
                {series.map((s) => <circle key={s.key} cx={x(active)} cy={y(points[active].values[s.key] ?? 0)} r={4} fill={s.color} stroke="var(--viz-surface)" strokeWidth={2} />)}
              </g>
            ) : null}
            <rect x={LEFT} y={TOP} width={W - LEFT - RIGHT} height={H - TOP - BOTTOM} fill="transparent" onPointerMove={nearest} onPointerLeave={() => setActive(null)} />
          </svg>
          {point ? (
            <div role="status" className="pointer-events-none absolute top-2 rounded-md border bg-popover px-3 py-2 text-xs shadow-sm" style={{ left: `${(x(active!) / W) * 100}%`, transform: `translateX(${active! > points.length / 2 ? '-110%' : '10%'})`, color: 'var(--viz-text)' }}>
              <div className="mb-1" style={{ color: 'var(--viz-text-2)' }}>{formatX(point.x)}</div>
              {series.map((s) => (
                <div key={s.key} className="flex items-center gap-2">
                  <span aria-hidden className="inline-block h-0.5 w-3 rounded" style={{ background: s.color }} />
                  <span className="font-semibold tabular-nums">{formatValue(point.values[s.key] ?? 0)}</span>
                  {series.length > 1 ? <span style={{ color: 'var(--viz-text-2)' }}>{s.label}</span> : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </figure>
  );
}

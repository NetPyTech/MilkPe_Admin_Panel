/** Round a maximum up to a clean axis top (1, 2, 5 times a power of ten) and give evenly spaced ticks from 0. */
export function niceScale(max: number, ticks = 4) {
  if (!(max > 0)) return { top: 1, ticks: [0, 1] };
  const rough = max / ticks;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * power).find((candidate) => candidate >= rough) ?? 10 * power;
  const top = Math.ceil(max / step) * step;
  return { top, ticks: Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step) };
}

const compactFormat = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 });
/** Axis labels: 0, 500, 1.2K, 3L ... */
export const compact = (value: number) => (Math.abs(value) < 1000 ? String(value) : compactFormat.format(value));

/** Black or white ink for a label set inside a coloured fill, by the fill's luminance. */
export function inkOn(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? '#0b0b0b' : '#ffffff';
}

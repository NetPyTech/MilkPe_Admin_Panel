export function readFilters(params: URLSearchParams, keys: readonly string[]) {
  const out: Record<string, string> = {};
  for (const key of keys) {
    const value = params.get(key);
    if (value) out[key] = value;
  }
  return out;
}

export function withFilters(params: URLSearchParams, changes: Record<string, string | undefined>) {
  const next = new URLSearchParams(params);
  for (const [key, value] of Object.entries(changes)) {
    if (value) next.set(key, value);
    else next.delete(key);
  }
  if (!('cursor' in changes)) next.delete('cursor'); // a new filter starts again from the first page
  return next.toString();
}

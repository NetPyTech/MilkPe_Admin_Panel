/** The Django path (with a trailing slash, as its routes need) for a proxied request, or null when it is not under superadmin/. */
export function resolveProxyPath(segments: string[], search: string): string | null {
  if (segments.length < 2 || segments[0] !== 'superadmin') return null;
  for (const raw of segments) {
    let segment: string;
    try { segment = decodeURIComponent(raw); } catch { return null; }
    if (!segment || segment === '.' || segment === '..' || segment.includes('/') || segment.includes('\\')) return null;
  }
  return `/${segments.map(encodeURIComponent).join('/')}/${search}`;
}

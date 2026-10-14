/** The directory as a CSV file, with the same filters as the list (paging is not part of a file). The backend writes it and audits it. */
export async function downloadUsersCsv(filters: Record<string, string>): Promise<{ blob: Blob; filename: string; truncated: boolean }> {
  const query = new URLSearchParams(Object.entries(filters).filter(([key]) => key !== 'cursor' && key !== 'page_size')).toString();
  const response = await fetch(`/api/proxy/superadmin/users/export/${query ? `?${query}` : ''}`, { headers: { 'X-Admin-Request': '1' } });
  if (response.status === 401) {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- the session ended; a full load of the sign-in page drops cached data
    window.location.assign('/login');
    throw new Error('Your session has ended. Please sign in again.');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string; detail?: Record<string, unknown> | string } | null;
    const detail = body?.detail && typeof body.detail === 'object'
      ? Object.entries(body.detail).map(([field, messages]) => `${field}: ${[messages].flat().join(' ')}`).join('; ') : '';
    throw new Error(detail || (typeof body?.error === 'string' ? body.error : `The export failed (${response.status}).`));
  }
  const named = /filename="([^"]+)"/.exec(response.headers.get('content-disposition') ?? '');
  return { blob: await response.blob(), filename: named?.[1] ?? 'users.csv', truncated: response.headers.get('x-export-truncated') === 'true' };
}

/** Hands a file to the browser's download. */
export function saveFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000); // not at once: some browsers cancel a download whose address is revoked straight away
}

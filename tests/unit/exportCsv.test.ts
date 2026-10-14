import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadUsersCsv, saveFile } from '@/features/users/exportCsv';

const csv = (headers: Record<string, string> = {}) => new Response('id,phone_number\n1,+91\n', { status: 200, headers: { 'content-type': 'text/csv', ...headers } });
afterEach(() => vi.unstubAllGlobals());

describe('saveFile', () => {
  it('starts the download and lets go of the file address only later', () => {
    vi.useFakeTimers();
    const revoke = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL: revoke }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    saveFile(new Blob(['a']), 'users.csv');
    expect(click).toHaveBeenCalledTimes(1);
    expect(revoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(10_000);
    expect(revoke).toHaveBeenCalledWith('blob:x');
    click.mockRestore();
    vi.useRealTimers();
  });
});

describe('downloadUsersCsv', () => {
  it('asks for the same filters as the list, without paging, and returns the file with its name', async () => {
    const fetchMock = vi.fn().mockResolvedValue(csv({ 'content-disposition': 'attachment; filename="users-2026-10-14.csv"', 'x-export-truncated': 'false' }));
    vi.stubGlobal('fetch', fetchMock);
    const file = await downloadUsersCsv({ role: 'seller', trial: 'ended', cursor: 'abc', page_size: '50' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/proxy/superadmin/users/export/?role=seller&trial=ended');
    expect(init.headers['X-Admin-Request']).toBe('1');
    expect(file.filename).toBe('users-2026-10-14.csv');
    expect(file.truncated).toBe(false);
    expect(await file.blob.text()).toContain('phone_number');
  });
  it('says when the server cut the file short', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(csv({ 'x-export-truncated': 'true' })));
    const file = await downloadUsersCsv({});
    expect(file.truncated).toBe(true);
    expect(file.filename).toBe('users.csv');
  });
  it("throws the server's message when it refuses", async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Validation Error', detail: { role: ['Use one of: buyer.'] } }), { status: 400 })));
    await expect(downloadUsersCsv({ role: 'king' })).rejects.toThrow('role: Use one of: buyer.');
  });
});

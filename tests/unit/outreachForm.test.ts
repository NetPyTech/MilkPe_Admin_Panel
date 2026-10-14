import { describe, expect, it } from 'vitest';
import { emptyForm, formFromAnnouncement, parsePhones, payloadFromForm, problemsIn } from '@/features/outreach/form';
import { announcementDetailSchema, metaSchema } from '@/features/outreach/schemas';
import sent from '../fixtures/outreach-announcement-sent.json';
import metaJson from '../fixtures/outreach-announcements-meta.json';

const meta = metaSchema.parse(metaJson);
const filled = () => ({ ...emptyForm(), texts: { en: { title: 'Hello', message: 'World', cta_label: '' } } });

describe('phones', () => {
  it('splits on lines, commas and spaces, trims and drops duplicates and blanks', () => {
    expect(parsePhones('9876543210, 9123456789\n\n9876543210  +919000000001')).toEqual(['9876543210', '9123456789', '+919000000001']);
    expect(parsePhones('   ')).toEqual([]);
  });
});

describe('payloadFromForm', () => {
  it('sends the fixed fields and only the languages that have text', () => {
    const payload = payloadFromForm({ ...filled(), texts: { en: { title: 'Hello', message: 'World', cta_label: '' }, hi: { title: 'नमस्ते', message: 'दुनिया', cta_label: '' }, kn: { title: '', message: '', cta_label: '' } } });
    expect(payload).toMatchObject({ kind: 'info', priority: 'normal', send_push: true, show_on_home: false, screen: '', url: '', send_at: null, expires_at: null, audience: { type: 'all' } });
    expect(Object.keys(payload.translations as object)).toEqual(['en', 'hi']);
  });
  it('removes a language that was saved and is now blank, but never English', () => {
    const payload = payloadFromForm({ ...filled(), texts: { en: { title: 'Hello', message: 'World', cta_label: '' }, hi: { title: '', message: '', cta_label: '' } } }, ['en', 'hi']);
    expect((payload.translations as Record<string, unknown>).hi).toBeNull();
    expect((payload.translations as Record<string, unknown>).en).not.toBeNull();
  });
  it('builds each audience', () => {
    expect(payloadFromForm({ ...filled(), audienceType: 'buyers' }).audience).toEqual({ type: 'buyers' });
    expect(payloadFromForm({ ...filled(), audienceType: 'users', phones: '9876543210\n9123456789' }).audience).toEqual({ type: 'users', phones: ['9876543210', '9123456789'] });
    expect(payloadFromForm({ ...filled(), audienceType: 'segment', segmentId: 'g1' }).audience).toEqual({ type: 'segment', segment_id: 'g1' });
    expect(payloadFromForm({ ...filled(), audienceType: 'segment', segmentId: '', rules: { language: 'hi' } }).audience).toEqual({ type: 'segment', rules: { language: 'hi' } });
  });
  it('sends a screen or a link, never both', () => {
    expect(payloadFromForm({ ...filled(), cta: 'screen', screen: 'Wallet', url: 'https://x.in' })).toMatchObject({ screen: 'Wallet', url: '' });
    expect(payloadFromForm({ ...filled(), cta: 'url', screen: 'Wallet', url: 'https://x.in' })).toMatchObject({ screen: '', url: 'https://x.in' });
  });
  it('writes the schedule and expiry as India time', () => {
    const payload = payloadFromForm({ ...filled(), schedule: 'later', sendDate: '2026-10-20', sendTime: '10:30', expires: true, expiresDate: '2026-10-25', expiresTime: '18:00' });
    expect(payload).toMatchObject({ send_at: '2026-10-20T10:30:00+05:30', expires_at: '2026-10-25T18:00:00+05:30' });
  });
});

describe('formFromAnnouncement', () => {
  it('reads an announcement back into the form', () => {
    const form = formFromAnnouncement(announcementDetailSchema.parse(sent));
    expect(form.audienceType).toBe('users');
    expect(form.phones).toBe('9043771118');
    expect(form.texts.en.title).toBe('Bulk edit is here');
    expect(form.schedule).toBe('now');
    expect(form.sendPush).toBe(true);
  });
  it('reads a scheduled time and an expiry as India time', () => {
    const base = announcementDetailSchema.parse(sent);
    const form = formFromAnnouncement({ ...base, status: 'scheduled', send_at: '2026-10-14T18:00:00Z', expires_at: '2026-10-20T04:30:00Z' });
    expect(form).toMatchObject({ schedule: 'later', sendDate: '2026-10-14', sendTime: '23:30', expires: true, expiresDate: '2026-10-20', expiresTime: '10:00' });
  });
});

describe('problemsIn', () => {
  it('accepts a complete announcement', () => {
    expect(problemsIn(filled(), meta)).toEqual([]);
  });
  it('asks for English, and keeps within the limits', () => {
    expect(problemsIn(emptyForm(), meta).join(' ')).toMatch(/English/);
    const long = { ...filled(), texts: { en: { title: 'x'.repeat(81), message: 'y'.repeat(501), cta_label: 'z'.repeat(31) } } };
    const text = problemsIn(long, meta).join(' ');
    expect(text).toMatch(/title/i);
    expect(text).toMatch(/message/i);
    expect(text).toMatch(/button/i);
  });
  it('needs phones for a list, rules or a group for a segment, a target for a button label', () => {
    expect(problemsIn({ ...filled(), audienceType: 'users', phones: '' }, meta).join(' ')).toMatch(/phone/i);
    expect(problemsIn({ ...filled(), audienceType: 'segment' }, meta).join(' ')).toMatch(/filter|group/i);
    expect(problemsIn({ ...filled(), texts: { en: { title: 'a', message: 'b', cta_label: 'Open' } } }, meta).join(' ')).toMatch(/button/i);
  });
  it('wants an https link and a valid schedule, with the expiry after it', () => {
    expect(problemsIn({ ...filled(), cta: 'url', url: 'http://x.in' }, meta).join(' ')).toMatch(/https/);
    expect(problemsIn({ ...filled(), schedule: 'later', sendDate: '', sendTime: '' }, meta).join(' ')).toMatch(/time/i);
    const early = { ...filled(), schedule: 'later' as const, sendDate: '2026-10-20', sendTime: '10:30', expires: true, expiresDate: '2026-10-20', expiresTime: '10:00' };
    expect(problemsIn(early, meta).join(' ')).toMatch(/expire/i);
  });
});

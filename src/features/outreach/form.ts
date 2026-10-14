import { isoToIst, istToIso } from '@/lib/datetime';
import type { Announcement, Meta, Rules } from './schemas';

export type AudienceKind = 'all' | 'buyers' | 'sellers' | 'users' | 'segment';
export type Text = { title: string; message: string; cta_label: string };

export type Form = {
  kind: string; priority: string;
  audienceType: AudienceKind; phones: string; segmentId: string; rules: Rules;
  sendPush: boolean; showOnHome: boolean;
  cta: 'none' | 'screen' | 'url'; screen: string; url: string;
  schedule: 'now' | 'later'; sendDate: string; sendTime: string;
  expires: boolean; expiresDate: string; expiresTime: string;
  texts: Record<string, Text>;
};

export const blankText = (): Text => ({ title: '', message: '', cta_label: '' });

export const emptyForm = (): Form => ({
  kind: 'info', priority: 'normal', audienceType: 'all', phones: '', segmentId: '', rules: {}, sendPush: true, showOnHome: false,
  cta: 'none', screen: '', url: '', schedule: 'now', sendDate: '', sendTime: '', expires: false, expiresDate: '', expiresTime: '', texts: {},
});

export const parsePhones = (raw: string) => [...new Set(raw.split(/[\s,;]+/).map((p) => p.trim()).filter(Boolean))];

export function formFromAnnouncement(a: Announcement): Form {
  const send = isoToIst(a.send_at);
  const expiry = isoToIst(a.expires_at);
  return {
    kind: a.kind, priority: a.priority,
    audienceType: a.audience.type as AudienceKind, phones: a.audience.phones.join('\n'), segmentId: '', rules: a.audience.rules,
    sendPush: a.send_push, showOnHome: a.show_on_home,
    cta: a.screen ? 'screen' : a.url ? 'url' : 'none', screen: a.screen, url: a.url,
    schedule: a.status === 'scheduled' ? 'later' : 'now', sendDate: a.status === 'scheduled' ? send.date : '', sendTime: a.status === 'scheduled' ? send.time : '',
    expires: !!a.expires_at, expiresDate: expiry.date, expiresTime: expiry.time,
    texts: Object.fromEntries(Object.entries(a.translations).map(([code, t]) => [code, { ...t }])),
  };
}

const hasText = (t: Text | undefined) => !!t && (t.title.trim() !== '' || t.message.trim() !== '');

/** The body for POST (create) or PATCH (edit). `saved` lists the languages already stored, so one that is now blank is removed (null). */
export function payloadFromForm(form: Form, saved: string[] = []): Record<string, unknown> {
  const audience =
    form.audienceType === 'users' ? { type: 'users', phones: parsePhones(form.phones) }
    : form.audienceType === 'segment' ? (form.segmentId ? { type: 'segment', segment_id: form.segmentId } : { type: 'segment', rules: form.rules })
    : { type: form.audienceType };
  const translations: Record<string, Text | null> = {};
  for (const [code, text] of Object.entries(form.texts)) {
    if (hasText(text)) translations[code] = { title: text.title.trim(), message: text.message.trim(), cta_label: text.cta_label.trim() };
    else if (saved.includes(code) && code !== 'en') translations[code] = null;
  }
  return {
    kind: form.kind, priority: form.priority, audience, send_push: form.sendPush, show_on_home: form.showOnHome,
    screen: form.cta === 'screen' ? form.screen : '', url: form.cta === 'url' ? form.url.trim() : '',
    send_at: form.schedule === 'later' ? istToIso(form.sendDate, form.sendTime) : null,
    expires_at: form.expires ? istToIso(form.expiresDate, form.expiresTime) : null,
    translations,
  };
}

/** What is wrong with the form before it is sent, in plain words (the server checks everything again). */
export function problemsIn(form: Form, meta: Meta): string[] {
  const problems: string[] = [];
  const limits = meta.limits;
  const english = form.texts.en;
  if (!english || english.title.trim() === '' || english.message.trim() === '') problems.push('Write the English title and message (other languages fall back to English).');
  for (const [code, text] of Object.entries(form.texts)) {
    const name = meta.languages.find((l) => l.code === code)?.name ?? code;
    if (text.title.length > limits.title) problems.push(`The ${name} title is over ${limits.title} characters.`);
    if (text.message.length > limits.message) problems.push(`The ${name} message is over ${limits.message} characters.`);
    if (text.cta_label.length > limits.cta_label) problems.push(`The ${name} button label is over ${limits.cta_label} characters.`);
    if (text.cta_label.trim() && form.cta === 'none') problems.push('A button label needs a screen or a link to open.');
  }
  if (form.audienceType === 'users' && parsePhones(form.phones).length === 0) problems.push('List at least one phone number.');
  if (form.audienceType === 'segment' && !form.segmentId && Object.keys(form.rules).length === 0) problems.push('Pick a saved group or add at least one filter.');
  if (form.cta === 'screen' && !form.screen) problems.push('Choose the screen the button opens.');
  if (form.cta === 'url' && !/^https:\/\//i.test(form.url.trim())) problems.push('The link must start with https://.');
  const send = form.schedule === 'later' ? istToIso(form.sendDate, form.sendTime) : null;
  if (form.schedule === 'later' && !send) problems.push('Choose the date and time to send it (India time).');
  if (form.expires) {
    const expiry = istToIso(form.expiresDate, form.expiresTime);
    if (!expiry) problems.push('Choose the date and time it should expire (India time).');
    else if (send && expiry <= send) problems.push('It must expire after it is sent.');
  }
  return [...new Set(problems)];
}

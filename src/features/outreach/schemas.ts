import { z } from 'zod';

const nullableText = z.string().nullable();

export const ruleDefSchema = z.object({
  key: z.string(), label: z.string(), type: z.enum(['choice', 'text', 'date', 'number', 'flag', 'version']),
  choices: z.array(z.object({ value: z.string(), label: z.string() })), help: z.string(),
});
export type RuleDef = z.infer<typeof ruleDefSchema>;
export type Rules = Record<string, string | number | boolean>;
const rules = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]));

export const segmentSchema = z.object({
  id: z.string(), name: z.string(), rules, count: z.number(), created_by: nullableText, created_at: z.string(), updated_at: z.string(),
});
export type Segment = z.infer<typeof segmentSchema>;
export const segmentListSchema = z.object({ results: z.array(segmentSchema) });

export const sampleUserSchema = z.object({ id: z.string(), phone_number: z.string(), name: nullableText, language: z.string() });
export const previewSchema = z.object({ rules, count: z.number(), sample: z.array(sampleUserSchema), warnings: z.array(z.string()) });
export type Preview = z.infer<typeof previewSchema>;

const text = z.object({ title: z.string(), message: z.string(), cta_label: z.string() });
export const statusSchema = z.enum(['draft', 'scheduled', 'sending', 'sent', 'retracted']);
export type AnnouncementStatus = z.infer<typeof statusSchema>;

export const announcementSchema = z.object({
  id: z.string(), kind: z.string(), priority: z.string(),
  audience: z.object({ type: z.string(), phones: z.array(z.string()), rules }),
  send_push: z.boolean(), show_on_home: z.boolean(), screen: z.string(), url: z.string(), send_at: nullableText, expires_at: nullableText,
  status: statusSchema, overdue: z.boolean(), translations: z.record(z.string(), text), missing_languages: z.array(z.string()), recipient_count: z.number().nullable(),
  created_by: z.unknown(), published_by: z.unknown(), created_at: z.string(), published_at: nullableText, sent_at: nullableText, retracted_at: nullableText,
});
export type Announcement = z.infer<typeof announcementSchema>;
export const announcementDetailSchema = announcementSchema.extend({
  stats: z.object({ recipients: z.number(), read: z.number(), dismissed: z.number(), hidden_by_mute: z.number() }),
});
export type AnnouncementDetail = z.infer<typeof announcementDetailSchema>;

export const announcementPageSchema = z.object({ count: z.number(), next: nullableText, previous: nullableText, results: z.array(announcementSchema) });

const choice = z.object({ key: z.string(), label: z.string() });
export const metaSchema = z.object({
  kinds: z.array(choice), priorities: z.array(choice), screens: z.array(choice), statuses: z.array(choice),
  audiences: z.array(z.object({ type: z.string(), label: z.string(), needs_phones: z.boolean() })),
  languages: z.array(z.object({ code: z.string(), name: z.string() })),
  limits: z.object({ title: z.number(), message: z.number(), cta_label: z.number(), url: z.number(), phones: z.number(), home_cards: z.number() }),
  segment_rules: z.array(ruleDefSchema),
});
export type Meta = z.infer<typeof metaSchema>;

export const audienceCountSchema = z.object({ count: z.number(), unknown_phones: z.array(z.string()), warnings: z.array(z.string()) });
export const publishSchema = z.object({ status: statusSchema, send_at: nullableText.optional() });
export const statusOnlySchema = z.object({ status: statusSchema });

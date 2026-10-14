import { z } from 'zod';

const nullableText = z.string().nullable();
const unit = z.enum(['count', 'kg', 'rupees']);

export const overviewSchema = z.object({
  as_of: z.string(), rollups_built_through: nullableText,
  cards: z.array(z.object({ key: z.string(), label: z.string(), unit, today: z.string(), yesterday: z.string(), avg_7d: z.string(), yesterday_vs_avg: nullableText })),
  alerts: z.array(z.object({ key: z.string(), severity: z.string(), link: nullableText, message: z.string() })),
});
export type Overview = z.infer<typeof overviewSchema>;

const metricMeta = z.object({ slug: z.string(), label: z.string(), unit });
const seriesRows = z.array(z.record(z.string(), z.string()));

export const growthSchema = z.object({
  from: z.string(), to: z.string(), built_through: nullableText, metrics: z.array(metricMeta), series: seriesRows, totals: z.record(z.string(), z.string()),
});
export type Growth = z.infer<typeof growthSchema>;

const step = z.object({ key: z.string(), label: z.string(), count: z.number(), rate: nullableText });
export const funnelSchema = z.object({ from: z.string(), to: z.string(), signup_from: z.string(), signup: z.array(step), activation: z.array(step) });

export const activeSchema = z.object({
  since: nullableText, as_of: z.string(), series: z.array(z.object({ day: z.string(), dau: z.number() })),
  latest: z.object({ dau: z.number(), wau: z.number(), mau: z.number(), stickiness: nullableText }),
});

export const retentionSchema = z.object({
  since: nullableText, weeks: z.number(), cohorts: z.array(z.object({ week: z.string(), size: z.number(), retained: z.array(nullableText) })),
});

const placeRow = z.object({ key: z.string(), label: z.string(), collections: z.number(), kg: z.string(), amount: z.string(), dairies: z.number() });
export const collectionsDaySchema = z.object({
  group: z.literal('day'), from: z.string(), to: z.string(), metrics: z.array(metricMeta), series: seriesRows, totals: z.record(z.string(), z.string().nullable()),
});
export const collectionsPlacesSchema = z.object({
  group: z.enum(['state', 'district', 'route']), from: z.string(), to: z.string(), rows: z.array(placeRow),
});

export const usageSchema = z.object({
  days: z.number(),
  workspaces: z.array(z.object({ workspace: z.string(), taps: z.number(), users: z.number() })),
  notifications: z.array(z.object({ category: z.string(), sent: z.number(), read: z.number(), read_rate: nullableText })),
});

export const versionsSchema = z.object({
  days: z.number(), minimum: nullableText, users: z.number(), unknown: z.number(), below_minimum: z.number(), below_minimum_share: nullableText,
  versions: z.array(z.object({ version: z.string(), users: z.number() })),
});

export const referralsSchema = z.object({
  redeemed: z.number(), rewards_paid: z.string(), referred_with_collection: z.number(), conversion: nullableText,
  top_referrers: z.array(z.object({ user_id: z.string(), phone_number: z.string(), name: nullableText, referred: z.number() })),
});

export const geoSchema = z.object({
  states: z.array(z.object({ state: z.string(), users: z.number(), dairies: z.number() })),
  districts: z.array(z.object({ district: z.string(), state: z.string(), dairies: z.number() })),
});

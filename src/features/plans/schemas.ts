import { z } from 'zod';

const nullableText = z.string().nullable();

/** The limits of a plan or of a subscription copy of it; `null` is "no limit". */
const limits = {
  cap_period: z.enum(['week', 'month', 'validity']),
  weight_cap_kg: nullableText,
  collections_cap: z.number().nullable(),
  suppliers_cap: z.number().nullable(),
  reports_cap: z.number().nullable(),
  unlimited: z.boolean(),
};

export const planSchema = z.object({
  id: z.string(), name: z.string(), description: z.string(), badge: z.string(),
  translations: z.record(z.string(), z.record(z.string(), z.string())),
  price: z.string(), duration_days: z.number(), sort_order: z.number(), is_active: z.boolean(),
  ...limits,
  created_at: z.string(), updated_at: z.string(),
  subscribers: z.object({ running: z.number(), waiting: z.number(), sold: z.number(), on_record: z.number() }).optional(),
});
export type Plan = z.infer<typeof planSchema>;
export const planListSchema = z.object({ results: z.array(planSchema) });

export const STATES = ['active', 'upcoming', 'expired', 'cancelled', 'pending', 'failed'] as const;

export const subscriptionRowSchema = z.object({
  id: z.string(), state: z.enum(STATES), status: z.enum(['pending', 'paid', 'failed', 'cancelled']), source: z.enum(['purchase', 'grant']),
  user: z.object({ id: z.string(), phone_number: z.string(), name: nullableText }),
  plan: z.object({ id: z.string(), name: z.string() }),
  price: z.string(), duration_days: z.number(),
  ...limits,
  starts_at: nullableText, ends_at: nullableText, paid_at: nullableText, created_at: z.string(), cancelled_at: nullableText,
  razorpay_order_id: nullableText, razorpay_payment_id: nullableText, reason: z.string(), granted_by: nullableText,
});
export type SubscriptionRow = z.infer<typeof subscriptionRowSchema>;

export const usageWindowSchema = z.object({
  index: z.number(), starts_at: z.string(), ends_at: z.string(), weight_kg: z.string(), collections: z.number(), reports: z.number(),
});
export const subscriptionDetailSchema = subscriptionRowSchema.extend({ usage: z.array(usageWindowSchema) });
export type SubscriptionDetail = z.infer<typeof subscriptionDetailSchema>;

export const overviewSchema = z.object({
  active: z.number(), active_granted: z.number(), upcoming: z.number(), ending_within_7_days: z.number(), bought_30_days: z.number(),
  revenue_30_days: z.string(), stuck_payments: z.number(),
  by_plan: z.array(z.object({ plan_id: z.string(), name: z.string(), is_active: z.boolean(), active: z.number(), upcoming: z.number(), sold: z.number() })),
});
export type SubscriptionOverview = z.infer<typeof overviewSchema>;

/** The plan block on a user's page: what runs now, what waits, and how many the dairy ever held. */
const userCardSchema = z.object({
  id: z.string(), name: z.string(), state: z.string(), source: z.string(), price: z.string(), duration_days: z.number(),
  starts_at: nullableText, ends_at: nullableText, days_left: z.number(), ...limits,
  usage: z.object({
    weight_kg: z.string(), collections: z.number(), reports: z.number(), suppliers: z.number().nullable(), volume_used_up: z.boolean(),
    resets_at: nullableText,
  }).optional(),
});
export const userSubscriptionSchema = z.object({ current: userCardSchema.nullable(), upcoming: z.array(userCardSchema), held: z.number() });
export type UserSubscription = z.infer<typeof userSubscriptionSchema>;

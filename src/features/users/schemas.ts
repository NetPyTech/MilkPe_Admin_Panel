import { z } from 'zod';

const nullableText = z.string().nullable();

export const userRowSchema = z.object({
  id: z.string(), phone_number: z.string(), universal_id: z.string(), name: nullableText, email: nullableText, language: z.string(),
  roles: z.array(z.enum(['buyer', 'seller'])), state: nullableText, district: nullableText, is_active: z.boolean(), has_logged_in: z.boolean(),
  date_joined: z.string(), wallet_balance: nullableText, last_active: nullableText,
});
export type UserRow = z.infer<typeof userRowSchema>;

export const userDetailSchema = z.object({
  user: userRowSchema,
  profile: z.object({ name: nullableText, email: nullableText, address: nullableText, state: nullableText, district: nullableText,
    tehsil: nullableText, village: nullableText, pincode: nullableText }).nullable(),
  buyer: z.object({ dairy_name: z.string(), state: nullableText, district: nullableText, rate_type: nullableText, payment_cycle: nullableText,
    created_at: z.string(), supplier_count: z.number(), collections_count: z.number(), last_collection_date: nullableText,
    trial_extra_days: z.number(), trial_granted_days: z.number(), trial_ends_at: nullableText, trial_days_remaining: z.number().nullable() }).nullable(),
  seller: z.object({ business_name: z.string(), state: nullableText, is_verified: z.boolean(), created_at: z.string(), collections_count: z.number() }).nullable(),
  wallet: z.object({ balance: nullableText, transactions: z.array(z.object({ id: z.string(), transaction_type: z.string(), status: z.string(),
    category: z.string(), amount: z.string(), description: z.string(), created_at: z.string() })) }),
  referral: z.object({ code: nullableText, referred_by: z.object({ id: z.string(), phone_number: z.string() }).nullable(), referred_count: z.number() }),
  devices: z.array(z.object({ platform: z.string(), is_active: z.boolean(), last_seen: z.string() })),
  notification_settings: z.array(z.object({ category: z.string(), in_app: z.boolean(), push: z.boolean() })),
  activity: z.array(z.object({ day: z.string(), first_seen_at: z.string(), last_seen_at: z.string(), app_version: z.string(), platform: z.string() })),
  audit: z.array(z.object({ action: z.string(), reason: z.string(), created_at: z.string() })),
});
export type UserDetail = z.infer<typeof userDetailSchema>;

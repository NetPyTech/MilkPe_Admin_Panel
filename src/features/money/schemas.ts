import { z } from 'zod';

export const paymentRowSchema = z.object({
  id: z.string(), created_at: z.string(), user: z.object({ id: z.string(), phone_number: z.string(), name: z.string().nullable() }),
  type: z.enum(['CREDIT', 'DEBIT']), status: z.enum(['PENDING', 'SUCCESS', 'FAILED']), category: z.string(), amount: z.string(),
  description: z.string(), razorpay_order_id: z.string().nullable(), razorpay_payment_id: z.string().nullable(),
  reason: z.string(), created_by: z.string().nullable(),
});
export type PaymentRow = z.infer<typeof paymentRowSchema>;

const amount = z.string();
export const revenueBucketSchema = z.object({
  recharge_count: z.number(), recharge_amount: amount, bonus_amount: amount, fee_amount: amount, referral_payout: amount,
  adjustment_credit: amount, adjustment_debit: amount,
});
export const revenueSchema = z.object({
  from: z.string(), to: z.string(), group: z.enum(['day', 'week', 'month']),
  buckets: z.array(revenueBucketSchema.extend({ period: z.string() })), totals: revenueBucketSchema,
});
export type Revenue = z.infer<typeof revenueSchema>;

export const balancesSchema = z.object({
  total_outstanding: amount, wallets: z.number(), below_low_balance: z.number(), zero_balance: z.number(), low_balance_threshold: amount,
});
export type Balances = z.infer<typeof balancesSchema>;

import { z } from 'zod';

const nullableText = z.string().nullable();

export const jobSchema = z.object({
  name: z.string(), label: z.string(), command: z.string(), expected_every_minutes: z.number(),
  last_started_at: nullableText, last_ok_at: nullableText, minutes_since_ok: z.number().nullable(), last_detail: z.string(),
  status: z.enum(['ok', 'late', 'failed', 'never']),
});
export type Job = z.infer<typeof jobSchema>;

export const healthSchema = z.object({
  checked_at: z.string(), status: z.enum(['ok', 'attention']), jobs: z.array(jobSchema),
  push: z.object({ owed: z.number(), announcements_sending: z.number(), announcements_stale: z.number() }),
  announcements: z.object({ overdue: z.array(z.object({ id: z.string(), title: z.string(), send_at: z.string() })) }),
  payments: z.object({ stuck: z.number(), oldest_stuck_at: nullableText }),
  nexus: z.object({ reachable: z.boolean(), latency_ms: z.number().nullable(), detail: z.string() }),
  alerts: z.array(z.object({ key: z.string(), severity: z.string(), link: nullableText, message: z.string() })),
});
export type Health = z.infer<typeof healthSchema>;

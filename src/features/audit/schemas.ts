import { z } from 'zod';

export const auditRowSchema = z.object({
  id: z.string(), actor: z.object({ id: z.string(), phone_number: z.string() }).nullable(), action: z.string(), target_type: z.string(),
  target_id: z.string(), reason: z.string(), before: z.record(z.string(), z.unknown()), after: z.record(z.string(), z.unknown()),
  ip: z.string(), created_at: z.string(),
});
export type AuditRow = z.infer<typeof auditRowSchema>;

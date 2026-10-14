import { z } from 'zod';

const nullableText = z.string().nullable();

export const fieldSchema = z.object({
  name: z.string(), label: z.string(), type: z.enum(['bool', 'int', 'decimal', 'number', 'text']),
  min: nullableText, max: nullableText, help: z.string(),
});
export type Field = z.infer<typeof fieldSchema>;

/** A saved value has the setting's own shape: a number, a piece of text, an object of fields or a list of such objects. */
export const configValueSchema: z.ZodType<ConfigValue> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.array(z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]))),
    z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]))]));
export type Scalar = string | number | boolean;
export type ConfigValue = Scalar | Record<string, Scalar> | Array<Record<string, Scalar>>;

export const configRowSchema = z.object({
  key: z.string(), label: z.string(), group: z.string(), description: z.string(),
  kind: z.enum(['int', 'decimal', 'text', 'object', 'list']), fields: z.array(fieldSchema),
  value: configValueSchema, default: configValueSchema, source: z.enum(['db', 'settings']),
  updated_at: nullableText, updated_by: nullableText,
});
export type ConfigRow = z.infer<typeof configRowSchema>;
export const configListSchema = z.object({ results: z.array(configRowSchema) });

export const configChangeSchema = z.object({
  id: z.string(), old: configValueSchema.nullable(), new: configValueSchema.nullable(), reason: z.string(), changed_by: nullableText, created_at: z.string(),
});
export type ConfigChange = z.infer<typeof configChangeSchema>;
export const configHistorySchema = z.object({ results: z.array(configChangeSchema) });

const person = z.object({ id: z.string(), phone_number: z.string(), name: nullableText });
export const deletionRequestSchema = z.object({
  id: z.string(), status: z.enum(['requested', 'approved', 'rejected', 'done']), reason: z.string(), note: z.string(),
  requested_at: z.string(), decided_at: nullableText, user: person, decided_by: nullableText,
});
export type DeletionRequest = z.infer<typeof deletionRequestSchema>;
export const deletionPageSchema = z.object({
  count: z.number(), next: nullableText, previous: nullableText, results: z.array(deletionRequestSchema),
});

export const trialExtensionSchema = z.object({ trial_extra_days: z.number(), trial_granted_days: z.number(), trial_ends_at: z.string(), trial_days_remaining: z.number() });
export type TrialExtension = z.infer<typeof trialExtensionSchema>;

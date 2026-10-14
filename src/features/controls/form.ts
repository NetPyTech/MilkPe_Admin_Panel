import type { ConfigRow, ConfigValue, Field, Scalar } from './schemas';

/** What the form holds while someone types: every number is the text in its box, a switch is a boolean. The server decides what is valid. */
export type Draft = string | Record<string, string | boolean> | Array<Record<string, string | boolean>>;

const cell = (field: Field, value: Scalar | undefined): string | boolean => (field.type === 'bool' ? value === true : value === undefined ? '' : String(value));

function objectDraft(fields: Field[], value: Record<string, Scalar>) {
  return Object.fromEntries(fields.map((field) => [field.name, cell(field, value[field.name])]));
}

export function draftOf(row: ConfigRow): Draft {
  if (row.kind === 'list') return (row.value as Array<Record<string, Scalar>>).map((item) => objectDraft(row.fields, item));
  if (row.kind === 'object') return objectDraft(row.fields, row.value as Record<string, Scalar>);
  return String(row.value);
}

export function blankRow(fields: Field[]): Record<string, string | boolean> {
  return Object.fromEntries(fields.map((field) => [field.name, field.type === 'bool' ? false : '']));
}

function send(field: Field, entered: string | boolean): Scalar {
  if (field.type === 'bool') return entered === true;
  const text = String(entered).trim();
  // A whole number or a plain number goes as a number; a decimal and anything unreadable go as typed, so the server's message names the problem.
  if ((field.type === 'int' || field.type === 'number') && text !== '' && Number.isFinite(Number(text))) return Number(text);
  return text;
}

function objectValue(fields: Field[], draft: Record<string, string | boolean>) {
  return Object.fromEntries(fields.map((field) => [field.name, send(field, draft[field.name])]));
}

/** The JSON the server expects for this draft. */
export function valueOf(row: ConfigRow, draft: Draft): ConfigValue {
  if (row.kind === 'list') return (draft as Array<Record<string, string | boolean>>).map((item) => objectValue(row.fields, item));
  if (row.kind === 'object') return objectValue(row.fields, draft as Record<string, string | boolean>);
  if (row.kind === 'int') { const text = String(draft).trim(); return text !== '' && Number.isFinite(Number(text)) ? Number(text) : text; }
  return String(draft).trim();
}

/** Compares what would be sent with what is in use, so Save stays off until something really changed. The server has the final say on equality. */
export function changed(row: ConfigRow, draft: Draft): boolean {
  return JSON.stringify(sortKeys(valueOf(row, draft))) !== JSON.stringify(sortKeys(normalise(row, row.value)));
}

function normalise(row: ConfigRow, value: ConfigValue): ConfigValue {
  return valueOf(row, draftOf({ ...row, value }));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, sortKeys(v)]));
  return value;
}

/** Hint under a field: its range and the server's own help. Only a hint, never a gate. */
export function hint(field: Field): string {
  const range = field.min !== null && field.max !== null ? `${field.min} to ${field.max}` : '';
  return [range, field.help].filter(Boolean).join(' · ');
}

/** How a setting's current value reads in one line, for the card header. */
export function summary(row: ConfigRow): string {
  const value = row.value;
  if (row.kind === 'list') return `${(value as unknown[]).length} tier${(value as unknown[]).length === 1 ? '' : 's'}`;
  if (row.kind === 'object') return Object.entries(value as Record<string, Scalar>).slice(0, 3).map(([k, v]) => `${k.toLowerCase().replace(/_/g, ' ')}: ${String(v)}`).join(', ');
  return String(value);
}

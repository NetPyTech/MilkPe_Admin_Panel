'use client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { blankRow, hint } from './form';
import type { Field } from './schemas';
import { Button } from '@/components/ui/button';

type Row = Record<string, string | boolean>;
type Errors = Record<string, string[]>;

export function FieldInput({ id, field, value, error, onChange }: {
  id: string; field: Field; value: string | boolean; error?: string[]; onChange: (value: string | boolean) => void;
}) {
  const note = error?.length ? error.join(' ') : hint(field);
  if (field.type === 'bool') {
    return (
      <div className="flex items-center gap-2 py-1">
        <input id={id} type="checkbox" className="size-4 accent-primary" checked={value === true} onChange={(e) => onChange(e.target.checked)} />
        <Label htmlFor={id}>{field.label}</Label>
        {error?.length ? <span role="alert" className="text-xs text-destructive">{note}</span> : null}
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{field.label}</Label>
      <Input id={id} value={String(value)} inputMode={field.type === 'text' ? 'text' : 'decimal'} aria-invalid={error?.length ? true : undefined}
        aria-describedby={note ? `${id}-note` : undefined} onValueChange={onChange} />
      {note ? <p id={`${id}-note`} role={error?.length ? 'alert' : undefined} className={error?.length ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>{note}</p> : null}
    </div>
  );
}

export function ObjectFields({ prefix, fields, draft, errors, onChange }: {
  prefix: string; fields: Field[]; draft: Row; errors: Errors; onChange: (next: Row) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map((field) => (
        <FieldInput key={field.name} id={`${prefix}-${field.name}`} field={field} value={draft[field.name]} error={errors[field.name]}
          onChange={(value) => onChange({ ...draft, [field.name]: value })} />
      ))}
    </div>
  );
}

export function ListFields({ prefix, fields, draft, errors, onChange }: {
  prefix: string; fields: Field[]; draft: Row[]; errors: Errors; onChange: (next: Row[]) => void;
}) {
  return (
    <div className="space-y-3">
      {draft.map((item, index) => (
        <div key={index} className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Row {index + 1}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(draft.filter((_, i) => i !== index))}>Remove</Button>
          </div>
          <ObjectFields prefix={`${prefix}-${index}`} fields={fields} draft={item} errors={{}} onChange={(next) => onChange(draft.map((old, i) => (i === index ? next : old)))} />
        </div>
      ))}
      {errors.value?.length ? <p role="alert" className="text-xs text-destructive">{errors.value.join(' ')}</p> : null}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...draft, blankRow(fields)])}>Add row</Button>
    </div>
  );
}

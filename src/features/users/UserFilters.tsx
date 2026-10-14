'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = { values: Record<string, string>; onChange: (changes: Record<string, string | undefined>) => void; onClear: () => void };

const SELECT = 'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

const OPTIONS = {
  role: [['', 'Any role'], ['buyer', 'Buyer'], ['seller', 'Seller'], ['both', 'Both'], ['none', 'No role yet']],
  language: [['', 'Any language'], ['en', 'English'], ['hi', 'Hindi'], ['pa', 'Punjabi'], ['kn', 'Kannada'], ['mr', 'Marathi'], ['gu', 'Gujarati']],
  is_active: [['', 'Active and deactivated'], ['true', 'Active'], ['false', 'Deactivated']],
  has_logged_in: [['', 'Real users'], ['any', 'Include placeholders'], ['false', 'Placeholders only']],
  trial: [['', 'Any'], ['active', 'Running'], ['ending', 'Ending within 7 days'], ['ended', 'Ended']],
} as const;

function Select({ id, label, value, options, onChange }: { id: string; label: string; value: string; options: readonly (readonly [string, string])[]; onChange: (value: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select id={id} className={SELECT} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([optionValue, text]) => <option key={optionValue} value={optionValue}>{text}</option>)}
      </select>
    </div>
  );
}

export function UserFilters({ values, onChange, onClear }: Props) {
  const [search, setSearch] = useState(values.search ?? '');
  useEffect(() => {
    if (search === (values.search ?? '')) return;
    const timer = setTimeout(() => onChange({ search: search.trim() || undefined }), 300);
    return () => clearTimeout(timer);
  }, [search, values.search, onChange]);

  return (
    <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1.5 lg:col-span-2">
        <Label htmlFor="f-search">Search</Label>
        <Input id="f-search" placeholder="Name, email, phone or ID" value={search} onValueChange={setSearch} />
      </div>
      <Select id="f-role" label="Role" value={values.role ?? ''} options={OPTIONS.role} onChange={(v) => onChange({ role: v || undefined })} />
      <Select id="f-language" label="Language" value={values.language ?? ''} options={OPTIONS.language} onChange={(v) => onChange({ language: v || undefined })} />
      <Select id="f-active" label="Status" value={values.is_active ?? ''} options={OPTIONS.is_active} onChange={(v) => onChange({ is_active: v || undefined })} />
      <Select id="f-logged" label="Accounts" value={values.has_logged_in ?? ''} options={OPTIONS.has_logged_in} onChange={(v) => onChange({ has_logged_in: v || undefined })} />
      <Select id="f-trial" label="Free trial" value={values.trial ?? ''} options={OPTIONS.trial} onChange={(v) => onChange({ trial: v || undefined })} />
      <div className="space-y-1.5">
        <Label htmlFor="f-from">Joined from</Label>
        <Input id="f-from" type="date" value={values.joined_from ?? ''} onValueChange={(v) => onChange({ joined_from: v || undefined })} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="f-to">Joined to</Label>
        <Input id="f-to" type="date" value={values.joined_to ?? ''} onValueChange={(v) => onChange({ joined_to: v || undefined })} />
      </div>
      <div className="flex items-end lg:col-span-4"><Button variant="ghost" size="sm" onClick={() => { setSearch(''); onClear(); }}>Clear filters</Button></div>
    </div>
  );
}

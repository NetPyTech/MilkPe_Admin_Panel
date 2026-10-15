'use client';
import Link from 'next/link';
import { PlanEditor } from '@/features/plans/PlanEditor';

export default function NewPlanPage() {
  return (
    <div className="space-y-4">
      <Link href="/plans" className="text-sm text-muted-foreground hover:underline">← Back to plans</Link>
      <PlanEditor plan={null} />
    </div>
  );
}

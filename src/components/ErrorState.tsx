import { Button } from '@/components/ui/button';

export function ErrorState({ message, retryAfter, onRetry }: { message: string; retryAfter?: number | null; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
      <p className="font-medium text-destructive">{message}</p>
      {retryAfter ? <p className="mt-1 text-muted-foreground">Too many requests. Try again in {retryAfter}s.</p> : null}
      {onRetry ? <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>Retry</Button> : null}
    </div>
  );
}

/** A fixed-window counter per key, in this process's memory. It slows guessing at the sign-in form; the backend's own limits stay the real ones. */
export function createLimiter({ limit, windowMs, now = Date.now, maxKeys = 10_000 }: { limit: number; windowMs: number; now?: () => number; maxKeys?: number }) {
  const windows = new Map<string, { start: number; used: number }>();

  function sweep(at: number) {
    for (const [key, entry] of windows) if (at - entry.start >= windowMs) windows.delete(key);
    // Still too many live keys (a flood of different addresses): drop the oldest, a counter is never worth more than the memory.
    while (windows.size >= maxKeys) windows.delete(windows.keys().next().value as string);
  }

  return {
    take(key: string): { allowed: boolean; retryAfterSeconds: number } {
      const at = now();
      let entry = windows.get(key);
      if (!entry || at - entry.start >= windowMs) {
        if (windows.size >= maxKeys) sweep(at);
        entry = { start: at, used: 0 };
        windows.set(key, entry);
      }
      entry.used += 1;
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.start + windowMs - at) / 1000));
      return { allowed: entry.used <= limit, retryAfterSeconds };
    },
    size: () => windows.size,
    reset: () => windows.clear(),
  };
}

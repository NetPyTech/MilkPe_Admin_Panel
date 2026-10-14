import { z } from 'zod';

const schema = z.object({
  DJANGO_API_URL: z.string().url('DJANGO_API_URL must be a URL like http://localhost:8000/api'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  // How many reverse proxies sit in front of this app and append the visitor's address to X-Forwarded-For (0 = none, the default: the header is not believed, because a visitor can send their own).
  TRUSTED_PROXY_HOPS: z.coerce.number().int('TRUSTED_PROXY_HOPS must be a whole number').min(0).max(5).default(0),
});

export function getConfig() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(`${String(issue.path[0])}: ${issue.message}`);
  }
  return { djangoApiUrl: parsed.data.DJANGO_API_URL.replace(/\/+$/, ''), sessionSecret: parsed.data.SESSION_SECRET, trustedProxyHops: parsed.data.TRUSTED_PROXY_HOPS };
}

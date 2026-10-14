import path from 'node:path';

export type SetupConfig = { backendDir: string; python: string; databaseUrl: string };

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/** The database the end-to-end run seeds and the backend it talks to must be on THIS machine: the run creates an administrator and test users.
 * Anything else (a shared or cloud database, a non-Postgres URL) is refused before a single row is written. */
export function assertLocalDatabase(url: string): void {
  const refuse = (why: string) => { throw new Error(`E2E_DATABASE_URL ${why}: the end-to-end tests only run against a Postgres database on this machine.`); };
  // Parsed by hand: `postgresql://user@/db?host=/socket/dir` (no host before the path) is valid for Postgres but not for the URL class.
  const match = /^([a-z][a-z0-9+.-]*):\/\/(?:[^@/]*@)?(\[[^\]]*\]|[^:/?#]*)(?::\d+)?(?:\/[^?#]*)?(?:\?([^#]*))?$/i.exec(url.trim());
  if (!match) return refuse('is not a database URL');
  const [, scheme, host, query] = match;
  if (scheme.toLowerCase() !== 'postgresql' && scheme.toLowerCase() !== 'postgres') return refuse(`uses ${scheme}`);
  const hosts = new URLSearchParams(query ?? '').get('host');
  if (hosts) {
    // libpq style: a socket directory (absolute path), or a comma list of them / of local names
    for (const name of hosts.split(',')) if (!name.startsWith('/') && !LOCAL_HOSTS.has(name)) return refuse(`names the host ${name}`);
    return;
  }
  if (host && !LOCAL_HOSTS.has(host)) refuse(`names the host ${host}`);
}

/** Where the backend is, which Python runs it and which local database it uses. Defaults: the backend checked out next to this app, its `.venv`, and a
 * local Postgres database `milkpe_local` reached over the socket as the current user. Each can be set (DJANGO_BACKEND_DIR, DJANGO_PYTHON, E2E_DATABASE_URL). */
export function resolveSetup(env: Record<string, string | undefined>, adminDir: string, user: string): SetupConfig {
  const backendDir = env.DJANGO_BACKEND_DIR || path.resolve(adminDir, '..', 'MilkPe_Backend');
  const python = env.DJANGO_PYTHON || path.join(backendDir, '.venv', 'bin', 'python');
  const databaseUrl = env.E2E_DATABASE_URL || `postgresql://${user}@/milkpe_local?host=/var/run/postgresql`;
  assertLocalDatabase(databaseUrl);
  return { backendDir, python, databaseUrl };
}

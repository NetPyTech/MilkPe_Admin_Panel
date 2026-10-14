import { describe, expect, it } from 'vitest';
import { resolveSetup } from '../../e2e/setupConfig';

const here = '/work/MilkPe_Admin';

describe('e2e setup configuration', () => {
  it('finds the backend next to the admin app and a local database by default, on any machine', () => {
    const config = resolveSetup({}, here, 'dev');
    expect(config.backendDir).toBe('/work/MilkPe_Backend');
    expect(config.python).toBe('/work/MilkPe_Backend/.venv/bin/python');
    expect(config.databaseUrl).toBe('postgresql://dev@/milkpe_local?host=/var/run/postgresql');
  });

  it('can be pointed at another checkout, interpreter and local database', () => {
    const config = resolveSetup({ DJANGO_BACKEND_DIR: '/ci/backend', DJANGO_PYTHON: '/usr/bin/python3', E2E_DATABASE_URL: 'postgres://ci:pw@localhost:5432/milkpe_e2e' }, here, 'ci');
    expect(config).toEqual({ backendDir: '/ci/backend', python: '/usr/bin/python3', databaseUrl: 'postgres://ci:pw@localhost:5432/milkpe_e2e' });
  });

  it.each([
    'postgresql://u:p@db.example.com:5432/milkpe',
    'postgresql://u:p@free-tier.cockroachlabs.cloud:26257/defaultdb',
    'cockroachdb://u:p@localhost:26257/milkpe',
    'postgresql://u@/milkpe?host=db.example.com',
    'postgresql://u@/milkpe?host=/var/run/postgresql,db.example.com',
    'not a url',
  ])('refuses a database that is not on this machine or not Postgres: %s', (url) => {
    expect(() => resolveSetup({ E2E_DATABASE_URL: url }, here, 'dev')).toThrow(/E2E_DATABASE_URL/);
  });

  it.each([
    'postgresql://u@localhost/milkpe', 'postgresql://u@127.0.0.1:5433/milkpe', 'postgresql://u@[::1]/milkpe', 'postgresql://u@/milkpe?host=/tmp',
  ])('accepts a local database: %s', (url) => {
    expect(resolveSetup({ E2E_DATABASE_URL: url }, here, 'dev').databaseUrl).toBe(url);
  });
});

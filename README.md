# MilkPe Admin

The owner's web panel for MilkPe: users, money, growth analytics, outreach, business settings (Controls), account-deletion requests and an audit log.
Next.js (App Router) + TypeScript. It only talks to `MilkPe_Backend`'s `/api/superadmin/*` routes.

## How it works

- The browser only calls this app's own routes. `/api/auth/*` signs in through the backend's login endpoints and keeps the backend
  token in an **encrypted httpOnly cookie** (`SameSite=Strict`, 12 h idle, 24 h in total); the token never reaches browser JavaScript.
- `/api/proxy/superadmin/...` forwards to the backend with that token. It only forwards paths under `superadmin/`, needs the header
  `X-Admin-Request: 1`, and for a change a same-origin `Origin`. A backend `401` ends the session; a `429` and its `Retry-After` pass through.
- Only an account the backend reports as `is_superadmin` can sign in; nobody else gets a cookie.
- No backend CORS change is needed.

## Run

```bash
cp .env.example .env.local     # set DJANGO_API_URL and a random SESSION_SECRET (openssl rand -hex 32)
npm install
npm run dev                    # http://localhost:3100
npm test                       # unit tests (Vitest)
npm run typecheck && npm run lint
npm run e2e                    # Playwright, see below
```

| variable | meaning |
|---|---|
| `DJANGO_API_URL` | the backend API root, e.g. `http://localhost:8000/api` |
| `SESSION_SECRET` | at least 32 characters; changing it signs everybody out |

### End-to-end tests

They sign in against a real backend on the **local** database (never the cloud one in the backend's `.env`):
start the backend with `DATABASE_URL='postgresql://elt@/milkpe_local?host=/var/run/postgresql' DJANGO_TESTING=True OTP_CONSOLE_MODE=True REDIS_URL=`
and every `THROTTLE_RATE_*` raised (see the backend's `CLAUDE.md`, including `THROTTLE_RATE_SUPERADMIN_ADMIN` and `..._WRITE`), then `npm run e2e`.
`e2e/global-setup.ts` seeds an administrator and a dairy owner through the backend's `manage.py shell`. It finds the backend checked out next to this
app (`../MilkPe_Backend`, with its `.venv`) and a Postgres database `milkpe_local` on a local socket as the current user; set `DJANGO_BACKEND_DIR`,
`DJANGO_PYTHON` or `E2E_DATABASE_URL` to use another checkout, interpreter or database. The setup refuses any database that is not on this machine
(a remote host, a cloud URL, a non-Postgres scheme) before it writes anything. Playwright's Chromium needs the usual
system libraries (`npx playwright install-deps chromium`) and fonts.

## Visitor address and sign-in limits

The backend's audit log and its per-address limits need the visitor's address, not this server's. Behind one reverse proxy (nginx, a load balancer) the
proxy appends the address it saw to `X-Forwarded-For`; `TRUSTED_PROXY_HOPS` says how many such proxies there are (default 0: the header is not believed, because a visitor can send their own; set 1 behind a single proxy), and this app believes only the
entry that many places from the right (a visitor can send their own header). It passes that address to the backend as the only `X-Forwarded-For` entry, so
the backend's `THROTTLE_NUM_PROXIES` must be `1` and this app must reach the backend directly (a private address). With `0`, or no header (local
development), no address is passed. The sign-in route also stops a visitor after 10 tries a minute (`429` with `Retry-After`); the backend's own limits
remain the real ones.

## Controls

`/controls` edits the nine business settings the backend lists at `GET /superadmin/config/` (trial length, collection fee, recharge bonus tiers,
low-balance levels, referral bonus, minimum app version, workspace ranking, collection editing). The form is built from the server's `fields`
(type, range, help); ranges are hints only, the backend's message is shown beside the field it names. Every save, reset and the trial extension on
a dairy owner's page needs a written reason and is audited. A change reaches every backend server within 30 seconds. The *Account deletion* tab
works the queue of requests people send from the app: approve or reject, then "Close account" when ready.

## Deploy

`docker build -t milkpe-admin .` then run with `DJANGO_API_URL` and `SESSION_SECRET`, port 3100. Serve it over **HTTPS** and keep it behind an
IP allowlist or a private network: this account can change money and message every user. Two-factor sign-in is the recommended next step.
To create the administrator account see the backend's `api_docs/superadmin_api.md`.

## Adding a screen

Add a line to `src/lib/nav.ts`, a page under `src/app/(admin)/`, and a feature folder under `src/features/<name>/` with its zod `schemas.ts`.
Capture a real backend response into `tests/fixtures/` and add it to `tests/unit/contract.test.ts` so the schema cannot drift from the API.

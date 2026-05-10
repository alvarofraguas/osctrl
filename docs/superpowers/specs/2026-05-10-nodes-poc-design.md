# osctrl Modern Frontend — v1 Nodes Page PoC

**Date:** 2026-05-10
**Status:** Awaiting user review of spec
**Fork:** https://github.com/alvarofraguas/osctrl
**Upstream:** https://github.com/jmpsec/osctrl @ `b9de7c03`

## Overview

Replace the legacy `osctrl-admin` HTML-template UI with a modern SvelteKit SPA, embedded into the Go binary, served by the same `osctrl-admin` service. v1 ships a single page — the **Nodes table** — running side-by-side with the legacy UI. v1 is a vertical slice that exercises every layer (build, embed, auth, session cookies, JSON endpoints, table state, polling) so the rest of the migration is mechanical.

## 1. Goals & Non-Goals

### Goals

- Prove the full SvelteKit + Go embed + session-auth stack on the hardest page (server-side paginated/sorted/filtered Nodes table).
- Ship as a single Go binary — no Node runtime in production.
- Zero changes to existing handlers, schema, auth providers, or other osctrl services.
- Layout designed so future `git merge upstream/main` against typical osctrl PRs causes zero conflicts in the new SPA tree.

### Non-Goals (v1)

- Replacing other admin pages (queries, carves, dashboard, environments, users, tags, settings, audit, etc.). They keep using the legacy templates.
- Modifying any Go handler logic. We only **add** a small static-file handler; existing JSON endpoints are reused as-is.
- Touching `osctrl-tls`, `osctrl-api`, `osctrl-cli`, database schema, or auth providers (local/OAuth/OIDC/SAML).
- New API design. The SPA adapts to the existing DataTables-shaped pagination payload.
- Real-time push (SSE/WebSockets). Polling + window-focus refetch only.
- Building a SvelteKit login page. Login stays on the legacy UI.
- Write actions / CSRF handling. v1 is read-only. CSRF will be designed in v2 when actions land.

### Success Criteria

1. `/ui/nodes` renders the SvelteKit SPA from the embedded form, behind the existing session-auth middleware.
2. Legacy `/environment/.../all` route still works untouched (no regression).
3. Nodes table supports server-side pagination, sort, search, status filter, manual refresh; refetches on `refetchInterval` (30s) and on window focus.
4. `make admin` (or equivalent) produces a single `osctrl-admin` binary that includes the SPA — no Node required at runtime.
5. Upstream `git merge upstream/main` for typical osctrl PRs results in zero merge conflicts in the new SPA tree.

## 2. Stack Decisions

| Concern | Decision | Reasoning |
|---|---|---|
| Frontend framework | **SvelteKit 2 + Svelte 5** (static adapter, SPA mode) | Smallest runtime (~3 KB), simple mental model, embeds cleanly into `embed.FS`. |
| Language | TypeScript (strict) | Type safety for API adapters; matches modern frontend norms. |
| Styling | Tailwind CSS v4 | First-class shadcn-svelte support; small production CSS via JIT. |
| Component library | shadcn-svelte | Best-in-class admin primitives (Table, Dialog, Command, Form, Sheet) ported from shadcn/ui. |
| Server state | TanStack Query for Svelte | `refetchInterval`, `refetchOnWindowFocus`, dedup, retries — exactly what the polling model needs. |
| Table headless logic | TanStack Table | Server-side pagination/sort/filter; pairs with shadcn-svelte `<Table>`. |
| Routing | SvelteKit file-based router | Built in. URL is source of truth for table state (sort/filter/search/page). |
| Build tool | Vite (via SvelteKit) | Fast HMR, hashed asset filenames for cache-busting. |
| Dev workflow | Vite dev proxy → Go on `:9001` (with `dev_no_embed` Go build tag) | HMR + cookie auth via same-origin proxy. |
| Production bundling | `//go:embed` of `web/build/` | Single binary, no extra processes. |
| Backend integration | Reuse osctrl-admin's existing `/json/*` handlers and session-cookie auth | Smallest backend diff, cleanest upstream merges. |

### Rejected alternatives

- **React + Vite + shadcn/ui** — biggest ecosystem and best alignment with installed Claude Code plugins (artifacts-builder, ui-ux-pro-max), but ~3× the bundle size of Svelte for an admin tool used by a small audience. User priority: lightweight + smooth Go integration.
- **Vue 3 + shadcn-vue** — middle ground on bundle size; rejected in favor of the lighter option.
- **Replace `cmd/admin/templates/` and `cmd/admin/static/` directly** — every upstream change to those would conflict. Too painful.
- **Separate repo for the SPA** — loses `//go:embed` simplicity, adds two-repo coordination.
- **SPA talks to `osctrl-api` directly** — would require browser-friendly auth on osctrl-api (not present today) and feature-parity audit. Out of scope for v1.

## 3. Architecture

### Runtime topology (production)

```
Browser ──► osctrl-admin (Go, :9001)
              ├─ GET /ui/*            → embedded SvelteKit SPA (static files)
              ├─ GET /json/*          → existing JSON handlers (reused, unchanged)
              ├─ POST /login          → existing session login (unchanged)
              ├─ GET  /environment/.. → legacy template UI (unchanged)
              └─ GET  /static/..      → legacy static assets (unchanged)
```

The SPA is a static bundle. Go's `http.FileServer` serves it from an `embed.FS`. A SPA fallback rule (`/ui/*` → `index.html`) handles client-side routing.

### Repo layout (additive)

```
cmd/admin/
├── handlers/                     (unchanged)
├── templates/                    (unchanged)
├── static/                       (unchanged)
├── main.go                       (small additions: 2 routes + embed wiring)
├── web_embed.go                  ← NEW. //go:embed web/build/*
└── web/                          ← NEW. SvelteKit project root.
    ├── package.json
    ├── package-lock.json
    ├── .nvmrc
    ├── svelte.config.js          (uses @sveltejs/adapter-static)
    ├── vite.config.ts            (dev proxy → :9001)
    ├── tailwind.config.ts
    ├── tsconfig.json
    ├── src/
    │   ├── routes/
    │   │   ├── +layout.svelte    (shell: top nav, env switcher, user menu)
    │   │   ├── +page.svelte      (redirect → /ui/nodes)
    │   │   └── nodes/+page.svelte
    │   ├── lib/
    │   │   ├── api/              (typed fetch wrappers around /json/*)
    │   │   │   ├── client.ts     (apiClient: fetch wrapper, 401 handling)
    │   │   │   ├── nodes.ts      (DataTables ↔ clean-shape adapter)
    │   │   │   ├── envs.ts       (environment list)
    │   │   │   └── types.ts      (hand-written TS types from Go structs)
    │   │   ├── components/ui/    (shadcn-svelte primitives)
    │   │   ├── components/nodes/ (NodesTable, NodeStatusBadge, etc.)
    │   │   └── stores/           (env selection, query client config)
    │   └── app.html
    ├── static/                   (favicons, fonts — SvelteKit's static dir)
    └── build/                    (gitignored; Vite output, embedded by Go)
```

### Build-tag pattern

Two build modes, switched by Go build tags:

| Mode | Build tag | Behavior | When |
|---|---|---|---|
| **Embedded** (default) | none | `//go:embed all:web/build` baked into binary | Production, CI release builds, smoke tests |
| **No-embed** | `dev_no_embed` | Empty handler; `/ui/*` returns 404 in Go. SPA runs on Vite dev server. | Daily dev when not rebuilding SvelteKit |

The build tag prevents Go from failing to compile when `web/build/` doesn't exist on a fresh clone.

### `main.go` additions

Two new routes, both wrapped by the existing `handlerAuthCheck`:

```go
adminMux.Handle("GET /ui/", handlerAuthCheck(newWebHandler(), flagParams.Service.Auth))
adminMux.Handle("GET /ui",  handlerAuthCheck(newWebHandler(), flagParams.Service.Auth))
```

Unauthenticated visits to `/ui/*` redirect to `/login` exactly as today (same middleware).

## 4. Data Flow & Auth

### Auth model — zero changes to Go

osctrl-admin uses session cookies set by the existing `LoginHandler`. The cookie is the only credential the browser carries.

```
1. User hits /ui/nodes (no cookie)
   → handlerAuthCheck redirects to /login (legacy HTML page)

2. User logs in via legacy /login form
   → cookie set, redirect to original /ui/nodes target

3. SPA boots, calls /json/node/{env}?...
   → cookie sent automatically (same-origin), handlerAuthCheck passes
   → JSON returned

4. Session expires → /json/* call returns 401 or 302
   → SPA detects, hard-redirects to /login
```

### Auth implications for the SPA

- All `fetch()` calls use `credentials: 'include'` (same-origin, but explicit). No tokens, no Authorization header, no JWT.
- A single `apiClient` wrapper handles 401/403: clears any client cache, calls `window.location.href = '/login?next=' + currentPath`.
- **CSRF.** v1 is read-only (Nodes table = GET-only), so CSRF doesn't apply yet. Will be addressed in v2 when actions land — likely by adding a `GET /ui/api/csrf` endpoint that returns the token from the session.

### Data flow — Nodes table

```
NodesPage (Svelte)
  └─ <NodesTable env={selectedEnv}>
        │
        ├─ TanStack Query: useQuery(['nodes', env, params])
        │     ├─ refetchInterval: 30_000
        │     ├─ refetchOnWindowFocus: true
        │     └─ staleTime: 10_000
        │
        ├─ queryFn → api.nodes.search(env, params)
        │              POST /json/node/{env}/active|inactive|all
        │              body: { draw, start, length, search, order, columns }
        │
        └─ renders → shadcn-svelte <Table> + TanStack Table for headless logic
```

### Existing JSON endpoint — DataTables shape (unchanged)

```json
{ "draw": 1, "recordsTotal": 1234, "recordsFiltered": 567, "data": [ {...} ] }
```

`api/nodes.ts` is the **only** code that touches this shape. Internally normalizes to:

```ts
{ rows: Node[], totalRows: number, filteredRows: number }
```

If the backend payload is ever cleaned up, only `api/nodes.ts` changes.

### Type definitions

TypeScript types live in `web/src/lib/api/types.ts`, hand-written for v1. Source of truth is the existing Go `cmd/admin/handlers/types-templates.go` and `cmd/admin/handlers/types-requests.go`. Risk: types drift from Go. Mitigation in v2: generate types from a Go OpenAPI spec or `tygo`. Acceptable for v1 PoC.

### Environment switching

osctrl is multi-tenant by environment. The legacy URL path carries it: `/environment/{env}/all`. The new SPA mirrors this with a query param: `/ui/nodes?env={env}` (so the layout can switch envs without re-routing). Selected env lives in a Svelte store, persisted to `localStorage`, defaulted to the first environment the user has access to (fetched once on mount via the existing `JSONEnvironmentPagingHandler`).

### Error handling

| Case | UI response |
|---|---|
| 401 / 302 to login | Hard redirect to `/login?next=...` |
| 403 (no env access) | Toast: "You don't have access to {env}", auto-switch to first allowed env |
| 5xx | Toast with retry button; TanStack Query auto-retries with backoff |
| Network failure | Stale data stays visible with a "reconnecting…" pill in the header |

No global error boundary catches everything silently — failures are surfaced explicitly.

### State boundaries

Three layers, each with one job:

- **Server state** → TanStack Query. Nodes list, environments, user profile. Cached, refetched, deduped.
- **URL state** → SvelteKit URL params. Page, sort, filters, search, env. Bookmarkable; back/forward works.
- **Local UI state** → Svelte runes (`$state`). Modal open, selected rows, dropdown open.

No global mutable store outside of env selection.

## 5. Build Pipeline & Dev Workflow

### Daily dev (Vite proxy)

Two terminals:

```bash
# Terminal 1 — Go backend, no SPA embed required
make dev-admin
# runs: go run -tags dev_no_embed ./cmd/admin
# listens on :9001

# Terminal 2 — SvelteKit dev server with HMR
cd cmd/admin/web && npm run dev
# listens on :5173
```

Browser → `http://localhost:5173/ui/nodes`. Vite proxies `/json/*`, `/login`, `/logout`, `/environment/*` to `:9001`. Cookies flow because both look same-origin to the browser via the proxy.

`vite.config.ts` proxy:

```ts
server: {
  port: 5173,
  proxy: {
    '/json':        { target: 'http://localhost:9001', changeOrigin: false },
    '/login':       { target: 'http://localhost:9001', changeOrigin: false },
    '/logout':      { target: 'http://localhost:9001', changeOrigin: false },
    '/environment': { target: 'http://localhost:9001', changeOrigin: false },
  },
}
```

### Production build

```bash
make admin
# 1. cd cmd/admin/web && npm ci && npm run build
# 2. (Vite produces cmd/admin/web/build/)
# 3. cd cmd/admin && go build -o bin/osctrl-admin .
#    (no build tag → embeds web/build via //go:embed)
```

Single binary. Run it, hit `/ui/nodes`, embedded SPA serves.

### Makefile additions (additive)

```make
.PHONY: web-install web-build web-dev dev-admin admin

web-install:
	cd cmd/admin/web && npm ci

web-build: web-install
	cd cmd/admin/web && npm run build

web-dev:
	cd cmd/admin/web && npm run dev

dev-admin:
	go run -tags dev_no_embed ./cmd/admin

admin: web-build
	go build -o bin/osctrl-admin ./cmd/admin
```

Existing `make build` / `make all` get a one-line addition to depend on `web-build`. CI workflows get one extra step: install Node 20 + run `npm ci && npm run build` before the Go build.

### Node version pinning

- `cmd/admin/web/.nvmrc` pins Node 20.
- `package.json` declares `"engines": { "node": ">=20.0.0" }`.
- CI uses `actions/setup-node` with `cache: npm` and `npm ci` (not `npm install`) for reproducible builds.
- `package-lock.json` is committed.

### Caching & compression

- Vite emits hashed asset filenames (`app-a3f9c2.js`) for long-cache `Cache-Control: public, max-age=31536000, immutable`.
- `index.html` is served with `Cache-Control: no-cache` so updates land immediately.
- Embedded assets are uncompressed; rely on the reverse proxy (nginx/Caddy/cloud LB) for gzip/brotli. Documented in deployment notes.

### Bundle target

v1 budget: <100 KB gzipped for SvelteKit + Tailwind v4 + shadcn-svelte components used by the Nodes page. `npm run build:analyze` (with `rollup-plugin-visualizer`) tracks size over time.

## 6. Testing

Sized to v1 scope: one page, read-only.

### Failure modes addressed

1. Embed handler serves wrong file or 404s on SPA deep-links.
2. Auth middleware behaves differently for `/ui/*` than for templates.
3. DataTables-shape adapter mis-maps columns or breaks on edge payloads.
4. TanStack Query polling fights URL state (refetch wipes user's sort).
5. Build pipeline fails on a fresh clone or in CI.

### Layer 1 — Go: handler tests for the embed mount (~5 tests)

`cmd/admin/web_embed_test.go`:

- `TestUIRoute_ServesIndexHtml` — GET `/ui/` returns `index.html` with 200.
- `TestUIRoute_ServesHashedAsset` — GET `/ui/_app/immutable/app-xxx.js` returns JS, `Cache-Control` set.
- `TestUIRoute_DeepLinkFallback` — GET `/ui/nodes/abc` returns `index.html` (SPA fallback).
- `TestUIRoute_UnauthRedirectsToLogin` — no cookie → 302 `/login` (matches template behavior).
- `TestUIRoute_BuildTagNoEmbed` — with `-tags dev_no_embed`, `/ui/*` returns 404.

### Layer 2 — TS: API adapter unit tests (~6 tests, Vitest)

`web/src/lib/api/nodes.test.ts`:

- Adapts DataTables payload → `{ rows, totalRows, filteredRows }`.
- Handles empty result set.
- Handles `recordsFiltered: 0`.
- Preserves column order from request.
- Maps null/undefined fields to safe defaults.
- 401 response throws `AuthError` (caught by client).

### Layer 3 — Component tests for `NodesTable` (~4 tests, Vitest + `@testing-library/svelte`)

- Renders rows from `queryFn` data.
- Shows loading skeleton on initial fetch.
- Sort click updates URL search params.
- Search input debounces and updates URL.

We do not test TanStack Query's caching, refetch interval, or focus refetch — that's the library's job.

### Layer 4 — One end-to-end smoke test (Playwright)

`web/tests/e2e/nodes.spec.ts`:

- Launch built `osctrl-admin` (binary, embed mode).
- Seed: a test user + two nodes in the test DB.
- Visit `/ui/nodes` (no cookie) → lands on `/login`.
- Login via legacy form.
- Redirected back to `/ui/nodes`.
- Table shows 2 rows.
- Type in search → row count drops.
- Click column header → URL `?sort=...` updates, rows reorder.
- Wait 30s → table refetched (intercept `/json/node/*` call).

### Layer 5 — CI build verification

Existing CI gets one new job: `web-build`. Runs on every PR; fails the PR if `npm ci && npm run build` errors.

### Explicitly NOT in v1

- Visual regression / screenshot tests.
- Load testing.
- Accessibility test suite (manual `impeccable:audit` pre-ship; codify into CI in v2).
- Type-coverage gating, mutation testing, chaos.

### Test commands

```
make test-admin       # existing Go tests + new web_embed_test.go
make test-web         # vitest run (Layers 2+3)
make test-e2e         # playwright (Layer 4)
make test             # all of the above
```

Total v1 test count: ~15 unit + 1 e2e. <30s locally; CI +60s for npm install + build + e2e.

## 7. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Type drift between Go structs and hand-written TS types. | v1: code review when touching types. v2: generate types via `tygo` or OpenAPI. |
| Node added to CI surface. | Pin Node 20 via `.nvmrc` + `engines`; `actions/setup-node` with `cache: npm`. |
| Bundle size creeping up as more pages are added. | `npm run build:analyze` + bundle-size budget in CI (warn at 100 KB gzipped, fail at 200 KB). |
| Upstream changes to `JSONNodeSearchHandler` payload break adapter. | Layer 2 tests fail loudly. Adapter is the only place the shape is touched. |
| Session cookie semantics differ between dev (Vite proxy) and prod (embed). | `credentials: 'include'` is explicit; same-origin in both modes. Layer 4 e2e covers prod path. |
| `embed.FS` doesn't gzip-compress assets. | Documented dependency on reverse-proxy compression. v2 can add a small Go middleware if needed. |
| CSRF for write actions in v2 may require revisiting layout. | v1 is read-only; CSRF design deferred to v2 spec, with a known landing spot (`GET /ui/api/csrf`). |

## 8. Out of Scope (v1) → Future Work

- Other admin pages (queries, carves, dashboard, environments, users, tags, settings, audit, conf, enroll, profile, saved).
- Write actions + CSRF.
- Real-time push (SSE) for status changes.
- Auto-generated TS types from Go.
- A SvelteKit-native login page replacing the legacy `/login`.
- Replacing the legacy templates entirely (deletion deferred until full feature parity).
- Visual regression and accessibility CI gates.

## 9. References

- Upstream osctrl: https://github.com/jmpsec/osctrl
- Fork: https://github.com/alvarofraguas/osctrl
- SvelteKit static adapter: https://svelte.dev/docs/kit/adapter-static
- shadcn-svelte: https://www.shadcn-svelte.com/
- TanStack Query for Svelte: https://tanstack.com/query/latest/docs/framework/svelte/overview
- Go `embed` package: https://pkg.go.dev/embed

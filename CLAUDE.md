# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

VendorHub is a B2B vendor management platform: PO approval workflows, invoice matching, contract tracking, and reporting across five roles (ADMIN, FINANCE, PROCUREMENT, MANAGER, VENDOR). Monorepo with two independent Node/TypeScript apps — `client/` (React) and `server/` (Express) — plus PostgreSQL and Redis.

Tech stack: React + TypeScript + Tailwind v4 + Zustand + TanStack Query (client); Express + Prisma + Socket.io + Bull/Redis + Zod (server); PostgreSQL 15, Redis 7; Docker Compose for containerized deploys.

## Commands

All commands are run from within `client/` or `server/` respectively — there is no root-level script runner (the root `package.json` only holds a `glob` devDependency used by `migrate.js`, a one-off Tailwind dark-mode codemod script, not a database migration tool).

### Server (`server/`)
```
npm run dev              # nodemon + tsx, watches src/**, hot-reloads on save
npm run build             # tsc compile to dist/
npm start                 # run compiled dist/index.js
npm run seed              # reset + reseed demo data (prisma/seed.ts) — destructive, wipes existing rows
npm run seed:bulk         # additional bulk/volume seed data
npm test                  # vitest run (tests/**/*.test.ts)
npm run test:coverage     # vitest run --coverage
npx vitest run tests/pos.test.ts        # run a single test file
npx prisma migrate dev    # apply schema changes (schema: prisma/schema.prisma; datasource URL comes from prisma.config.ts, not schema.prisma)
npx prisma studio         # inspect DB visually
```

### Client (`client/`)
```
npm run dev               # vite dev server, default port 5173
npm run build              # tsc -b && vite build
npm run lint                # eslint .
npm run typecheck            # tsc -b --pretty false
npm test                    # vitest run — only picks up src/test/**/*.{test,spec}.{ts,tsx}
npm run test:watch
npm run coverage
npm run e2e                 # playwright test (tests/e2e/**, excluded from vitest)
npm run check                # lint + typecheck + test, run this before considering a change done
npx vitest run src/test/App.test.tsx    # run a single test file
```

**Test folder naming gotcha:** vitest's `include` glob (in `client/vite.config.ts`) only matches `src/test/**` (singular). Some test files live under `src/tests/**` (plural) — those are never picked up by `npm test`/`npm run check` and silently don't run. Check which directory a new test file lands in, or fix the glob, before assuming coverage.

### Local dev environment (no Docker)
`start-local.ps1` at the repo root boots the whole stack on Windows without Docker: starts a local PostgreSQL 17 instance on port 5433 (data dir `.local-postgres/`, binaries expected at `C:\Program Files\PostgreSQL\17\bin`), creates the `vendordb` database if missing, then launches the server (port 5000) and client (port 5173, `--strictPort`) in separate windows. Demo login: `admin@demo.com` / `Admin123` (see `server/prisma/seed.ts` for the full set of demo accounts, one per role, all password pattern `<Role>123`).

`.local-postgres/` contains live Postgres data files and is tracked in git (not in `.gitignore`) — its contents churn on every server start/stop. Don't try to reconcile or clean up diffs under that path; it's binary DB state, not source.

### Docker Compose path
`docker-compose.yml` + `docker-compose.override.yml` bring up the full stack (Postgres, Redis, server, client, nginx) containerized — the alternative to `start-local.ps1`.

## Architecture

### Auth & rate limiting
JWT-based auth (`server/src/middlewares/authenticate.ts` decodes `{userId, role}` onto `req.user`). Two rate limiters exist in `server/src/index.ts`/`server/src/routes/auth.ts`: a generous general limiter (200 req/15min) applied globally, and a strict credential limiter (10 req/15min) applied *only* to `/auth/login`, `/auth/register`, and `/auth/verify-otp` — never to `/auth/me`, since that endpoint is polled on every page load by the client's `hydrate()` and would otherwise get rate-limited during normal use. Keep this split when touching auth routes.

Client-side, `client/src/store/authStore.ts`'s `hydrate()` only clears the session on a genuine 401/403 from `/auth/me` — not on 429s or network errors, which are treated as transient. The store's `isLoading` starts `true` whenever a token exists in `localStorage`, and `App.tsx` blocks rendering the router until it resolves; this exists specifically so role-gated route guards (`ProtectedRoute`, `VendorOnlyRoute`) never evaluate `user` before `hydrate()` has had a chance to populate it.

### Two parallel app shells
Staff roles (ADMIN/FINANCE/PROCUREMENT/MANAGER) and VENDOR use **separate layout components and separate route trees** in `client/src/App.tsx`: `AppLayout` (staff sidebar/topbar) vs `VendorLayout` (vendor portal chrome), gated by `ProtectedRoute` + `VendorOnlyRoute` respectively. Some pages are deliberately duplicated across both trees (e.g. `PODetail` is mounted at both `/pos/:id` and `/vendor/pos/:id`) rather than shared via a single route, because the two shells need different back-navigation targets and nav visibility. When adding a page a vendor should be able to reach, mount it under the `/vendor` route tree with `VendorLayout` — don't just link a vendor to a staff route.

Each layout wraps only its own `<Outlet />` in an `<ErrorBoundary key={location.pathname}>` (not the whole layout) — a crash in one page must not take down the sidebar, and keying on pathname makes the boundary self-heal on navigation instead of showing a stale error after the user clicks away.

### Role scoping pattern (Vendor ↔ User is by email, not FK)
There is no foreign key between a `User` (role=VENDOR) and its `Vendor` record — they're linked by matching `email`. Every backend controller that needs to scope data to "the vendor currently logged in" follows the same pattern: look up the `User` by `req.user.id` to get their email, then filter `where: { vendor: { email } }` (see `listPOs`, `listInvoices`, `listContracts` in `server/src/controllers/`). When adding a new vendor-facing list/detail endpoint, follow this exact pattern — a missed scope here means one vendor can see another vendor's data.

### PO approval chains
Approval chains are dynamic and amount-tiered (`server/src/services/approvalService.ts`, `getApprovalRoles`): POs over ₹500k require MANAGER → FINANCE → ADMIN sign-off, over ₹50k require MANAGER → FINANCE, otherwise just MANAGER. The chain is stored as a JSON blob on the `PurchaseOrder` row (`approvalChain` + `currentApproverIndex`), not as separate relational rows — `approveState`/`rejectState` in the same file are the only functions that should mutate it.

### Vendor performance score scale
`Vendor.performanceScore` is 0–5 everywhere in the product (displayed as e.g. "4.6" or "4.6 / 5") — never 0–100. Both the backend validator (`server/src/controllers/vendors.ts`, `updateVendorPerformanceScore`) and the client's color/bar-width math (`client/src/pages/Vendors/VendorPerformancePage.tsx`) must stay on this scale.

### Background jobs & realtime
Bull queues (`server/src/queues/`) handle email and notification delivery; `redisAvailability.ts` probes Redis with a raw TCP connect and lets queue initialization degrade gracefully if Redis is unreachable, rather than crashing the server. Socket.io (`server/src/utils/socket.ts`) authenticates each connection via the same JWT and joins a room named after the user's id, for targeted realtime push (used by the notification bell).

### Known non-blocking gap
`ActivityFeed` (`client/src/components/ActivityFeed.tsx`), embedded on PO/Invoice/Vendor/Contract detail pages across both app shells, calls `GET /api/v1/audit-logs`, which is restricted to `Role.ADMIN` only (`server/src/routes/auditLogs.ts`). Any non-Admin viewer gets a silent 403 and the feed just shows "No activity recorded yet" — it fails gracefully rather than crashing, but it means Finance/Procurement/Manager/Vendor never see real activity history on these pages.

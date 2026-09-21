# ঔষধওয়ালা → Next.js 16 App Router + MySQL Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor ঔষধওয়ালা into a full-stack **Next.js 16 App Router** app on **MySQL** (local **XAMPP**), while **keeping all existing frontend UI, CSS, tokens, layouts, and visual design pixel-identical**.

**Architecture:** Replace Vite + TanStack Start/Router with Next.js 16 (`app/`) + Turbopack. Keep React components, Tailwind v4 (`src/styles.css`), and shadcn/ui as-is. Map `createServerFn` → Server Actions. Map public APIs → Route Handlers. **Replace Supabase entirely** (Postgres, Auth, Storage, RLS, RPCs) with **XAMPP MySQL/MariaDB** + **Drizzle ORM** + **Auth.js (Credentials)** + **local/filesystem (or disk) storage**. Enforce authorization in Server Actions / services (former RLS). Port Postgres RPCs to TypeScript domain services (and optional MySQL procedures only where performance demands). Use `proxy.ts` for session cookie refresh.

**Tech Stack:** Next.js 16 · React 19 · App Router · Server Actions · Route Handlers · `proxy.ts` · Tailwind CSS v4 · shadcn/ui · TanStack Query · **MySQL (XAMPP MariaDB/MySQL)** · **Drizzle ORM** · **Auth.js (NextAuth v5)** · bcrypt · local file storage · Vercel AI SDK · Playwright · Bun · local Apache optional (PHPMyAdmin) · later Vercel + managed MySQL (PlanetScale/RDS/etc.) for prod

## Global Constraints

1. **UI freeze:** Do not redesign. Preserve classNames, CSS variables in `src/styles.css`, fonts (Epilogue / Urbanist / Hind Siliguri), brand gradient, shadows, AdminShell navy sidebar, storefront Layout, BN/EN copy strings, Lucide icons, spacing/radius.
2. **No visual refactors** in `src/components/ui/**` except `"use client"` directives and router import swaps.
3. **Database migration (required):** Leave Supabase. Target **MySQL 8+ / MariaDB** via local XAMPP (`/opt/lampp`). Source of truth for schema becomes `drizzle/` + `mysql/migrations/` (ported from `supabase/migrations/**` and `src/integrations/supabase/types.ts`). Do **not** keep runtime `@supabase/*` after cutover.
4. **Next.js 16 floors:** Node.js ≥ 20.9 · TypeScript ≥ 5.1 · Turbopack default · async `params` / `searchParams` / `cookies()` / `headers()` · `proxy.ts` (not `middleware.ts`) · two-arg `revalidateTag` when used.
5. **Secrets:** Never commit DB passwords, `AUTH_SECRET`, or AI keys. Local `.env.local` only. **Do not write machine sudo passwords into this repo or this plan.**
6. **Lovable coupling:** Remove `@lovable.dev/vite-tanstack-config`, Start/Nitro. Hosting for prod can be Vercel + external MySQL; local default is XAMPP MySQL on `127.0.0.1:3306`.
7. **Package manager:** Prefer Bun; npm OK if needed.
8. **Branch:** `feat/nextjs-16-mysql` (or worktree). Do not force-push / rewrite published history.
9. **Local XAMPP:** Apache optional (phpMyAdmin). App runs on `next dev :3000`. MySQL must be running before DB tasks.
10. **Parity:** Feature behavior (roles, RPCs, storage buckets) must match; implementation moves to MySQL + Node services.

---

## Local environment — XAMPP MySQL

**Observed on this machine (2026-09-21):**

| Item | Value |
|------|--------|
| XAMPP path | `/opt/lampp` |
| Version | XAMPP for Linux 8.2.12-0 |
| MySQL client | `/opt/lampp/bin/mysql` |
| Default socket | `/opt/lampp/var/mysql/mysql.sock` |
| Default port | `3306` |
| Status at plan update | Apache/MySQL were **not** running — start before DB work |

### Start / stop MySQL (agent or human)

```bash
# Start MySQL only (preferred for this app)
sudo /opt/lampp/lampp startmysql

# Or full stack (Apache + MySQL) if you want phpMyAdmin at http://localhost/phpmyadmin
sudo /opt/lampp/lampp start

# Status / stop
sudo /opt/lampp/lampp status
sudo /opt/lampp/lampp stopmysql
```

> Operators: use your local sudo credentials when prompted. **Never store sudo passwords in git, `.env`, or this markdown file.**

### Create app database (once MySQL is up)

```bash
/opt/lampp/bin/mysql -u root -e "
  CREATE DATABASE IF NOT EXISTS oushodhwala
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
  CREATE USER IF NOT EXISTS 'oushodhwala'@'localhost' IDENTIFIED BY 'CHANGE_ME_LOCAL_ONLY';
  GRANT ALL PRIVILEGES ON oushodhwala.* TO 'oushodhwala'@'localhost';
  FLUSH PRIVILEGES;
"
```

XAMPP root often has an empty password locally; if root has a password, add `-p`. Prefer a dedicated app user (not root) for the Next.js app.

### Connection string for `.env.local`

```bash
DATABASE_URL="mysql://oushodhwala:CHANGE_ME_LOCAL_ONLY@127.0.0.1:3306/oushodhwala"
# Optional socket form if TCP fails:
# DATABASE_URL="mysql://oushodhwala:CHANGE_ME_LOCAL_ONLY@localhost/oushodhwala?socket=/opt/lampp/var/mysql/mysql.sock"

AUTH_SECRET="generate-with-openssl-rand-base64-32"
LOVABLE_API_KEY=   # or AI gateway key — server only
PUBLIC_ORIGIN=http://localhost:3000
UPLOAD_DIR=./storage/uploads
UPLOAD_PUBLIC_BASE=/uploads
```

---

## Agent toolchain (skills · MCP · plugins)

| Tool | When |
|------|------|
| **Skill:** `nextjs` | App Router, Server Actions, async params, caching |
| **Skill:** `next-upgrade` | Codemods / Next 16 breaking changes |
| **Skill:** `routing-middleware` | `proxy.ts` |
| **Skill:** `react-best-practices` | After bulk TSX edits |
| **Skill:** `shadcn` | Only if re-adding a ui primitive |
| **Skill:** `auth` (Vercel plugin, if present) | Auth.js Credentials + session cookies |
| **MCP:** `plugin-vercel-vercel` → `search_vercel_documentation` | Deploy, Route Handlers, env (prod) |
| **Skill:** `deploy-to-vercel` / `vercel-cli` | Preview/prod when MySQL is reachable remotely |
| **Docs:** `npx @next/codemod@canary agents-md` | Version-matched Next 16 rules in `AGENTS.md` |
| **Browser MCP / Playwright** | Visual regression |
| **Supabase artifacts (read-only)** | Use `supabase/migrations/**` + `types.ts` as **schema/behavior reference only** — not runtime |

Do **not** use Supabase MCP for the new runtime. Optional: export reference data once for seed scripts.

Before Phase 0 coding:

```bash
npx @next/codemod@canary agents-md
sudo /opt/lampp/lampp startmysql
/opt/lampp/bin/mysql -u root -e "SELECT VERSION();"
```

---

## Current → Target mapping

### Framework + data platform

| Today | Target |
|-------|--------|
| Vite + Lovable TanStack Start | Next.js 16 App Router |
| Supabase Postgres | **XAMPP MySQL** (`oushodhwala` DB) |
| Supabase Auth | **Auth.js v5** Credentials (+ later OAuth if needed) |
| Supabase Storage buckets | **Local disk** `storage/uploads/{media,prescriptions,...}` served via `/uploads` or Route Handler |
| RLS policies | **Server-side authz** (`requireUser`, `requireRole`, scoped queries) |
| Postgres RPCs (`place_order`, `admin_*`, …) | **TypeScript services** in `src/server/services/*` (transactions via Drizzle) |
| `supabase-js` / `@supabase/ssr` | **Drizzle** + `mysql2` |
| `src/integrations/supabase/types.ts` | Generated **Drizzle schema** + `src/server/db/types.ts` |
| Cloudflare/Nitro | Node (local) / Vercel (prod) + managed MySQL |

### Framework routing (unchanged URLs)

| Today (TanStack Start) | Next.js 16 |
|------------------------|------------|
| `src/routes/*.tsx` | `src/app/**/page.tsx` |
| `src/routes/__root.tsx` | `src/app/layout.tsx` + `providers.tsx` |
| `createServerFn` | `"use server"` in `src/server/actions/*` |
| `useServerFn` | call Server Action / React Query `mutationFn` |
| `src/routes/api/public/*` | `src/app/api/public/**/route.ts` |
| `@tanstack/react-router` | `next/link` · `next/navigation` |
| `VITE_*` | `NEXT_PUBLIC_*` + server env (`DATABASE_URL`, `AUTH_SECRET`) |

### Route map (URL-stable)

| URL | New file |
|-----|----------|
| `/` | `src/app/page.tsx` |
| `/products` | `src/app/products/page.tsx` |
| `/product/[id]` | `src/app/product/[id]/page.tsx` |
| `/medicines` | `src/app/medicines/page.tsx` |
| `/medicine/[id]` | `src/app/medicine/[id]/page.tsx` |
| `/categories` · `/category/[slug]` | matching `page.tsx` |
| `/offers` · `/lab-test` · `/home-diagnostics` · `/home-services` | matching |
| `/doctor-consultation` · `/book-doctor/[id]` | matching |
| `/cart` · `/checkout` · `/wishlist` | matching |
| `/orders` · `/appointments` · `/notifications` | matching |
| `/delivery` · `/track/[no]` · `/t/[token]` | matching |
| `/prescription` · `/prescription/[id]` · `/rx/[id]` · `/rx-share/[token]` · `/consultation/[id]` | matching |
| `/help` · `/contact` · `/about` · `/privacy` · `/terms` · `/refund-policy` | static pages |
| `/auth` · `/reset-password` | auth pages (Auth.js) |
| `/account/**` | nested account routes |
| `/admin` | `src/app/admin/page.tsx` (`dynamic = "force-dynamic"`) |
| `/api/public/health` · `sitemap.xml` · `img/[...path]` | Route Handlers |
| `/shared/product` | `src/app/shared/product/page.tsx` |
| `/uploads/[...path]` | static file serve or `src/app/uploads/[...path]/route.ts` |

### Server function modules → actions + services

| Source | Target |
|--------|--------|
| `src/lib/*.functions.ts` | `src/server/actions/*.ts` (thin) calling `src/server/services/*.ts` |
| Postgres RPCs in migrations/`types.ts` | `src/server/services/{orders,delivery,erp,finance,authz,...}.ts` |
| `src/lib/*.server.ts` (AI, etc.) | `src/server/ai/*`, `src/server/storage/*` |
| Supabase Storage helpers | `src/server/storage/local.ts` |

### Supabase → MySQL domain replacements

| Supabase capability | MySQL-era replacement |
|---------------------|------------------------|
| `auth.users` + session | `users` table + Auth.js JWT/session cookie |
| `profiles` | `profiles` (FK → `users.id`) |
| `user_roles` + `has_role()` | `user_roles` + `src/server/services/authz.ts` |
| Storage buckets (`media`, `prescriptions`, `consultations`, `pod`, `reports`, `product-images`) | folders under `UPLOAD_DIR` with same names |
| Realtime (if any) | Polling / optional later Socket — YAGNI unless used |
| `security definer` RPCs | Drizzle transactions in Node |

---

## Target directory layout (after migration)

```text
src/
  app/
    layout.tsx
    providers.tsx
    page.tsx
    (shop)/layout.tsx          # existing Layout chrome
    admin/page.tsx
    api/auth/[...nextauth]/route.ts
    api/public/.../route.ts
    uploads/[...path]/route.ts # optional secure file serve
    not-found.tsx · error.tsx
  components/                  # UI freeze — copy-as-is + "use client"
  hooks/                       # useAuth → Auth.js session
  lib/                         # client-safe utils
  server/
    db/
      index.ts                 # drizzle client (mysql2)
      schema/                  # drizzle table defs
      migrate.ts
    services/                  # former RPCs + business logic
    actions/                   # "use server"
    auth/                      # Auth.js config, password hashing
    storage/                   # local disk adapters
    ai/                        # gateway
  styles.css                   # KEEP
drizzle.config.ts
mysql/                         # optional SQL dumps / seeds
storage/uploads/               # gitignored
proxy.ts
next.config.ts
supabase/migrations/           # ARCHIVE reference only (do not run against MySQL)
```

---

## Postgres → MySQL type / SQL translation cheat sheet

Use when porting migrations / writing Drizzle schema:

| Postgres | MySQL |
|----------|--------|
| `uuid` (gen_random_uuid) | `CHAR(36)` / `BINARY(16)` — app generates UUIDs (`crypto.randomUUID()`) |
| `timestamptz` | `DATETIME(3)` store UTC; or `TIMESTAMP` carefully |
| `jsonb` | `JSON` |
| `text[]` | `JSON` array or child table |
| `boolean` | `BOOLEAN` / `TINYINT(1)` |
| `numeric` / `money` | `DECIMAL(12,2)` (money) · `DECIMAL(18,6)` where needed |
| Enums (`app_role`) | MySQL `ENUM(...)` or lookup table — prefer **VARCHAR + CHECK** or app enum for flexibility |
| `SECURITY DEFINER` functions | TypeScript transactions |
| RLS | `WHERE user_id = ?` in services after `auth()` |
| Partial indexes / GIN | Approximate with BTREE / FULLTEXT for search (`bn-search` may stay in app) |

Inventory **71 tables + `medicine_directory` view** from `types.ts`; recreate as tables + SQL `VIEW` or Drizzle query helper named `medicineDirectory`.

---

## UI preservation checklist (every PR)

- [ ] No intentional className/token/color/font changes in presentational components.
- [ ] Screenshots: home, product detail, cart, checkout, admin, Rx upload vs Lovable.
- [ ] BN/EN strings unchanged unless wiring fix.
- [ ] `src/styles.css` tokens unmodified except Tailwind `@source` paths for `app/`.

---

## Phase 0 — Next.js 16 scaffolding (UI shell)

### Task 0: Branch + Next skeleton

**Files:** `next.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `proxy.ts` (stub), `.env.example`, `package.json`, `tsconfig.json`, `AGENTS.md`

- [ ] **Step 1: Branch**

```bash
git checkout -b feat/nextjs-16-mysql
```

- [ ] **Step 2: Install Next 16 + MySQL stack (not Supabase)**

```bash
bun add next@latest react@latest react-dom@latest
bun add drizzle-orm mysql2
bun add next-auth@beta bcryptjs zod
bun add -d drizzle-kit @types/bcryptjs @types/react@latest @types/react-dom@latest eslint-config-next
# Later remove: @supabase/supabase-js @tanstack/react-router @tanstack/react-start \
#   @tanstack/router-plugin @lovable.dev/vite-tanstack-config nitro vite ...
```

Keep: `@tanstack/react-query`, Radix/shadcn, `ai`, `@ai-sdk/openai-compatible`, `recharts`, etc.

- [ ] **Step 3: Agent docs**

```bash
npx @next/codemod@canary agents-md
```

- [ ] **Step 4: `next.config.ts`**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "oushodhwala.lovable.app" },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 5: `tsconfig` paths `@/*` → `./src/*` + Next plugin** (same as prior plan).

- [ ] **Step 6: Scripts**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "test:e2e": "playwright test"
  }
}
```

- [ ] **Step 7: Root layout imports `@/styles.css`** — UI freeze.

- [ ] **Step 8: Verify `bun run build`**.

- [ ] **Step 9: Commit** `chore: scaffold Next.js 16 App Router for MySQL migration`

---

## Phase 1 — XAMPP MySQL + Drizzle schema

### Task 1: Bring up XAMPP MySQL and app database

**Interfaces:** Produces reachable `DATABASE_URL` for Drizzle.

- [ ] **Step 1: Start MySQL**

```bash
sudo /opt/lampp/lampp startmysql
sudo /opt/lampp/lampp status
```

Expected: MySQL running.

- [ ] **Step 2: Create DB + user** (see Local environment section). Put credentials only in `.env.local`.

- [ ] **Step 3: Smoke query**

```bash
/opt/lampp/bin/mysql -u oushodhwala -p -e "USE oushodhwala; SELECT 1;"
```

- [ ] **Step 4: Commit** `.env.example` (placeholders only) — never `.env.local`.

### Task 2: Drizzle config + schema port from Supabase types

**Files:**
- Create: `drizzle.config.ts`, `src/server/db/index.ts`, `src/server/db/schema/*.ts`
- Reference (read-only): `src/integrations/supabase/types.ts`, `supabase/migrations/*.sql`

```ts
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/server/db/schema/index.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

```ts
// src/server/db/index.ts
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

const pool = mysql.createPool(process.env.DATABASE_URL!);
export const db = drizzle(pool, { schema, mode: "default" });
```

Schema port order (FK-safe):

1. `users` (Auth.js) · `profiles` · `user_roles` · `app_settings`
2. Catalog: `categories` · `products` · `offers` · `generic_info` · `lab_tests` · `doctors` …
3. Commerce: `orders` · `order_items` · `order_events` · `order_returns` · `pos_*` · loyalty
4. Rx / consult: `prescriptions` · shares · audit · `consultation_*` · appointments
5. Delivery: `riders` · `deliveries` · zones · events
6. ERP / stock / PO / suppliers / branches / transfers
7. Finance: CoA · journal · expenses
8. Media / image audit tables (paths as VARCHAR URLs)
9. Support · API hub · notifications · audit logs
10. View/helper: `medicine_directory`

- [ ] **Step 1: Write core schema files** (start with users/roles/products/orders).

- [ ] **Step 2: `bun run db:generate && bun run db:migrate`** (or `db:push` in local only).

- [ ] **Step 3: Verify table count**

```bash
/opt/lampp/bin/mysql -u oushodhwala -p -e "USE oushodhwala; SHOW TABLES;"
```

- [ ] **Step 4: Commit** `feat: add Drizzle MySQL schema and initial migrations`

### Task 3: Seed / optional data import

**Files:** `src/server/db/seed.ts`, `mysql/seeds/*`

- [ ] Seed admin user + roles, sample categories/products for UI.
- [ ] Optional: one-off script reading exported Supabase JSON/CSV → MySQL (not required for greenfield local).
- [ ] Commit: `chore: add MySQL seed for local XAMPP`

---

## Phase 2 — Auth.js + authz (replace Supabase Auth)

### Task 4: Auth.js Credentials provider

**Files:**
- Create: `src/server/auth/config.ts`, `src/app/api/auth/[...nextauth]/route.ts`
- Modify: `src/hooks/useAuth.tsx` to use `useSession` / server `auth()` — **keep same UI gates** (`RequireAuth`, role checks)
- Create: `src/server/services/authz.ts` (`hasRole`, `requireStaff`, port `ROLE_TABS`)

```ts
// Conceptual — verify against current Auth.js v5 docs before coding
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/server/db";
// ... lookup users + user_roles

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (credentials) => {
        /* verify bcrypt hash; return { id, email, roles } */
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) { /* attach roles */ return token; },
    async session({ session, token }) { /* expose roles */ return session; },
  },
});
```

- [ ] **Step 1: Implement register/login Server Actions** matching `/auth` UX (same forms/classes).

- [ ] **Step 2: Password reset** — store hashed tokens in `password_reset_tokens` table; email can be stub/log in local.

- [ ] **Step 3: `proxy.ts`** — refresh/session edge checks if needed; protect `/admin` redirect to `/auth` optional.

- [ ] **Step 4: Port `allowedTabs` / `STAFF_ROLES`** unchanged from `src/lib/roles.ts`.

- [ ] **Step 5: Commit** `feat: replace Supabase Auth with Auth.js + MySQL users`

### Task 5: Providers without Supabase

**Files:** `src/app/providers.tsx`

- [ ] Wrap `SessionProvider` (Auth.js) + Query + Lang + Store + Toaster — **no** Supabase client.
- [ ] Commit: `feat: wire App Router providers to Auth.js session`

---

## Phase 3 — Storage + RPC service ports

### Task 6: Local file storage (replace buckets)

**Files:** `src/server/storage/local.ts`, `src/app/api/upload/route.ts` (or Server Action), gitignore `storage/`

Bucket → folder map:

| Bucket | Folder |
|--------|--------|
| `media` | `storage/uploads/media` |
| `prescriptions` | `storage/uploads/prescriptions` |
| `consultations` | `storage/uploads/consultations` |
| `pod` | `storage/uploads/pod` |
| `reports` | `storage/uploads/reports` |
| `product-images` | `storage/uploads/product-images` |

Public URL shape: `${PUBLIC_ORIGIN}/uploads/...` via rewrite or Route Handler with auth for private Rx/POD.

- [ ] Port `media.ts` / `storage.ts` callers to local adapter — **UI upload widgets unchanged**.
- [ ] Commit: `feat: local disk storage replacing Supabase Storage`

### Task 7: Port Postgres RPCs → services

**Priority order** (match product critical path):

1. `authz` helpers (`has_role`, `my_roles`, …)
2. Catalog reads (replace `getCatalog` / directory)
3. `place_order` · `cancel_my_order` · POS · loyalty
4. Appointments · home diagnostic/service booking
5. Delivery · `public_track` · rider pings
6. Admin setters (`admin_set_order_status`, stock, PO, …)
7. Finance (`post_journal`, summaries)
8. Support chat helpers
9. Rx share open/hit
10. Image map apply / stock alerts

Each RPC becomes an exported async function using `db.transaction(async (tx) => { ... })`. Keep **return JSON shapes** identical so UI stays untouched.

- [ ] For each domain: implement service → wire Server Action → delete Supabase `.rpc` / `from` calls.
- [ ] Commit per domain: `feat: port order RPCs to MySQL services`

### Task 8: AI gateway (unchanged provider, new persistence)

- [ ] Keep Lovable/OpenAI-compatible gateway in `src/server/ai/`.
- [ ] Persist OCR results to MySQL `prescriptions` tables instead of Supabase.
- [ ] Commit: `feat: persist Rx AI results to MySQL`

---

## Phase 4 — Mechanical router migration (UI freeze)

### Task 9: TanStack Router → Next navigation

Same mechanical replacements as before (`Link href`, `useRouter`, `"use client"`). Remove all `@supabase/*` imports as pages are touched.

- [ ] Grep clean:

```bash
rg -n '@supabase|createServerFn|@tanstack/react-router|useServerFn' src
```

Expected after cutover: **zero** matches (except comments in archive).

- [ ] Commit: `refactor: swap router imports; remove supabase-js from UI`

### Task 10: Storefront + admin layouts

- [ ] `(shop)/layout.tsx` → existing `Layout`
- [ ] `/admin` → `AdminShell` client page, `force-dynamic`
- [ ] Commit: `feat: port Layout and AdminShell to App Router`

---

## Phase 5 — Page migration waves

Same waves as before; each page uses MySQL-backed actions/services:

| Task | Wave | Routes |
|------|------|--------|
| 11 | A | home, marketing, offers, categories |
| 12 | B | catalog, medicines, wishlist |
| 13 | C | cart, checkout, orders, auth, account |
| 14 | D | lab, doctors, Rx, consultation, delivery/track |
| 15 | E | admin ERP tabs |

- [ ] After each wave: `bun run build` + visual spot-check.
- [ ] Commits: `feat: migrate <wave> routes to Next+MySQL`

### Task 16: Public Route Handlers

- [ ] Health, sitemap (query MySQL catalog), image proxy reading **local** product images.
- [ ] Commit: `feat: public API routes on MySQL`

---

## Phase 6 — Remove Supabase + TanStack Start

### Task 17: Delete obsolete stacks

**Delete / stop using:**

- `@supabase/supabase-js`, any `@supabase/ssr`
- `src/integrations/supabase/client*.ts` (keep `types.ts` only if still used as archive — prefer move to `docs/archive/supabase-types.ts`)
- `vite.config.ts`, `src/start.ts`, `src/server.ts`, `src/routeTree.gen.ts`, `src/routes/**`
- `src/lib/*.functions.ts` after actions exist
- Runtime dependency on Lovable Cloud Supabase project

**Keep for reference (do not execute on MySQL):** `supabase/migrations/**` under `docs/archive/` or leave with README “Postgres legacy”.

- [ ] `bun run build` + `bunx tsc --noEmit`
- [ ] Commit: `chore: remove Supabase and TanStack Start runtimes`

---

## Phase 7 — QA, e2e, deploy notes

### Task 18: Playwright

- [ ] `baseURL=http://localhost:3000`
- [ ] Ensure XAMPP MySQL running in CI/local before tests; use seed DB.
- [ ] `bun run test:e2e`

### Task 19: Visual regression (UI freeze gate)

Compare to `https://oushodhwala.lovable.app` for home, product, cart, checkout, admin, Rx.

### Task 20: Production MySQL (later)

Local = XAMPP. Production options:

- Managed MySQL (RDS, PlanetScale, Railway, etc.) + Vercel
- Or VPS with MySQL + `next start`

Set `DATABASE_URL` in host env. **Do not** assume XAMPP in production.

- [ ] Document in README: local XAMPP steps + prod `DATABASE_URL`.
- [ ] Commit: `docs: Next.js 16 + XAMPP MySQL runbook`

---

## Parallelism guidance

After Phase 2 (Auth + DB core schema):

| Track | Focus | Depends on |
|-------|--------|------------|
| A | Catalog schema/services + Wave B | Phase 1–2 |
| B | Orders/checkout services + Wave C | Phase 1–2 |
| C | Rx/AI/storage + Wave D | Phase 1–3 (storage) |
| D | ERP/admin services + Wave E | Phase 1–2 |
| E | Delivery/track | Phase 1–2 |

Do not delete `src/routes` until all tracks merge.

---

## Risk register

| Risk | Mitigation |
|------|------------|
| XAMPP MySQL not running | Plan Task 1; document `lampp startmysql`; fail fast on boot if `SELECT 1` fails |
| Postgres-only SQL in migrations | Use cheat sheet; regenerate via Drizzle — do not run `.sql` migrations as-is |
| RLS gaps → data leaks | Central `authz.ts`; code review every service; no direct DB from client |
| UUID / enum mismatches | App-level UUIDs; map `app_role` strings identically |
| File storage not durable on Vercel | Local disk OK for XAMPP; prod use S3/R2 later — abstract behind `storage` interface now |
| Auth UX drift | Keep `/auth` markup; only swap submit handlers |
| UUID vs INT FKs slow port | Stick to CHAR(36) UUIDs for 1:1 port from Supabase IDs |
| Fulltext Bangla search | Keep existing `bn-search` app logic before investing in MySQL FULLTEXT |
| Lovable sync | Stop Lovable edits on this branch; MySQL won’t sync to Lovable Cloud |
| Sudo / permissions on Linux | Human starts XAMPP; agents request elevated shell only when needed — **never commit passwords** |

---

## Definition of Done

- [ ] All mapped URLs work on Next.js 16 against **local XAMPP MySQL**.
- [ ] Zero runtime Supabase / TanStack Start / Vite Lovable config.
- [ ] Auth (login/logout/roles/admin gates) works via Auth.js + MySQL.
- [ ] Uploads work via local storage folders.
- [ ] Former critical RPCs behave equivalently (orders, track, admin status, Rx save).
- [ ] UI freeze checklist passed.
- [ ] `bun run build` green; Playwright smoke green.
- [ ] README documents XAMPP start, `DATABASE_URL`, seed, and Next scripts.

---

## Execution handoff

Plan updated at `docs/superpowers/plans/2026-09-21-nextjs-16-app-router-migration.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task/wave (`superpowers:subagent-driven-development`).
2. **Inline Execution** — this session with checkpoints (`superpowers:executing-plans`).

**Which approach?**

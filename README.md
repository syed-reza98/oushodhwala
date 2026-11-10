# ঔষধওয়ালা (Oushodhwala)

Next.js 16 App Router storefront + admin on **local XAMPP MySQL**, Auth.js, Drizzle ORM, and local disk uploads.

Legacy Lovable/Supabase UI reference: https://oushodhwala.lovable.app  
Postgres migrations under `supabase/` are **reference only** — do not run them against MySQL.

## Requirements

- Node.js ≥ 20.9
- XAMPP MySQL/MariaDB (`/opt/lampp` on this machine)
- npm (or Bun)

## Local MySQL (XAMPP)

```bash
# Start MySQL only
sudo /opt/lampp/lampp startmysql

# Or full stack (Apache + phpMyAdmin at http://localhost/phpmyadmin)
# sudo /opt/lampp/lampp start

# Status / stop
sudo /opt/lampp/lampp status
sudo /opt/lampp/lampp stopmysql
```

Create DB + user once (replace the password):

```bash
/opt/lampp/bin/mysql -u root -e "
  CREATE DATABASE IF NOT EXISTS oushodhwala
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER IF NOT EXISTS 'oushodhwala'@'localhost' IDENTIFIED BY 'CHANGE_ME_LOCAL_ONLY';
  GRANT ALL PRIVILEGES ON oushodhwala.* TO 'oushodhwala'@'localhost';
  FLUSH PRIVILEGES;
"
```

## Environment

```bash
cp .env.example .env.local
# edit DATABASE_URL, AUTH_SECRET, AUTH_URL, PUBLIC_ORIGIN
```

Example:

```bash
DATABASE_URL="mysql://oushodhwala:CHANGE_ME_LOCAL_ONLY@127.0.0.1:3306/oushodhwala"
# Optional socket form if TCP fails:
# DATABASE_URL="mysql://oushodhwala:CHANGE_ME_LOCAL_ONLY@localhost/oushodhwala?socket=/opt/lampp/var/mysql/mysql.sock"

AUTH_SECRET="$(openssl rand -base64 32)"
AUTH_URL="http://localhost:3000"
PUBLIC_ORIGIN="http://localhost:3000"
UPLOAD_DIR="./storage/uploads"
UPLOAD_PUBLIC_BASE="/uploads"
# Optional Rx AI (OpenAI-compatible). Leave empty for note-only OCR fallback.
LOVABLE_API_KEY=
```

Never commit `.env.local` or passwords.

## Install, migrate, seed

```bash
npm install
npm run db:push          # or: npm run db:generate && npm run db:migrate
npm run db:seed          # admin@oushodhwala.local / Admin@12345
```

## Run

```bash
npm run dev              # http://localhost:3000 (webpack; use npm run dev:turbo for Turbopack)
npm run build && npm start
```

Health: `GET /api/public/health`

## E2E

```bash
npm run build
npx playwright install chromium   # once
E2E_BASE_URL=http://127.0.0.1:3000 npm run test:e2e
# Or omit E2E_BASE_URL — Playwright starts `npm start` on :3000 (needs a prior build).
```

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Next.js 16 dev (webpack) |
| `npm run build` / `start` | Production build / serve |
| `npm run db:push` | Push Drizzle schema to MySQL |
| `npm run db:seed` | Seed admin + sample catalog |
| `npm run test:e2e` | Playwright smoke (`E2E_BASE_URL`) |

## Production

Local default is XAMPP MySQL + disk uploads. For production:

### Managed MySQL

1. Provision MySQL 8+ (RDS, PlanetScale, Railway, Neon MySQL-compatible, etc.).
2. Set host env (never commit secrets):

```bash
DATABASE_URL="mysql://USER:PASS@HOST:3306/oushodhwala"
AUTH_SECRET="$(openssl rand -base64 32)"
AUTH_URL="https://your.domain"
PUBLIC_ORIGIN="https://your.domain"
```

3. Run schema + seed against that DB from a one-off job or CI:

```bash
npm run db:push   # or db:generate && db:migrate
npm run db:seed   # optional bootstrap admin
```

4. Deploy the Next app (`npm run build` + `npm start`, or Vercel). Ensure the host can reach MySQL (allowlist / VPC / SSL as required).

### Object storage (uploads)

Ephemeral hosts (e.g. Vercel) should not use local disk. Set:

```bash
STORAGE_DRIVER=s3   # or r2
S3_BUCKET=oushodhwala-uploads
S3_REGION=auto
S3_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com   # R2 / path-style providers
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_FORCE_PATH_STYLE=true
S3_PUBLIC_BASE_URL=https://cdn.your.domain   # optional CDN base; else /uploads proxy
UPLOAD_PUBLIC_BASE=/uploads
```

`saveUpload` / `removeUpload` / `/api/uploads` go through `src/server/storage` (`local` or `s3`). Keep the same bucket folder names: `media`, `prescriptions`, `consultations`, `pod`, `reports`, `product-images`.

### Email (password reset)

```bash
EMAIL_FROM="Oushodhwala <noreply@your.domain>"
RESEND_API_KEY=re_...
```

Without `RESEND_API_KEY`, reset links are logged to the server console (dev-friendly).

### Cutover checklist

- [ ] Managed `DATABASE_URL` set; migrate/seed done
- [ ] `AUTH_SECRET` / `AUTH_URL` / `PUBLIC_ORIGIN` production values
- [ ] `STORAGE_DRIVER=s3|r2` + credentials (if not a persistent VPS disk)
- [ ] Resend or SMTP configured for password reset
- [ ] Smoke: login, place order, upload Rx, admin gate, `/api/public/health`


## UI freeze

Storefront/admin visuals must stay pixel-aligned with https://oushodhwala.lovable.app (home, product, cart, checkout, admin, Rx). Spot-check BN/EN copy and `src/styles.css` tokens before merge.

## Archive

- `_legacy/` — TanStack routes, Supabase-era admin ERP panels, stub clients
- `docs/archive/` — pointers to Postgres legacy artifacts
- `supabase/migrations/` — schema/behavior reference only

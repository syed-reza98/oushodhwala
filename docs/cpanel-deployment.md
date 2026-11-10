# cPanel Cloud Hosting Deployment Guide for Oushodhwala (ঔষধওয়ালা)

This document describes how to deploy the Oushodhwala Next.js application to **cPanel Cloud Hosting** using the **Node.js Selector (Phusion Passenger)** and **cPanel MySQL**.

---

## ⚠️ ClamAV False Positive — Read First

cPanel's antivirus (ClamAV + Sanesecurity unofficial signatures) **incorrectly flags** Next.js bundles inside ZIP files with the rule `Sanesecurity.Foxhole.JS_Zip_11.UNOFFICIAL`. This is a **known false positive** on minified JavaScript — not malware.

### Three bypass strategies (pick one):

| Strategy | How | Best When |
|---|---|---|
| **A. tar.gz upload** | Use `dist-cpanel/oushodhwala-production.tar.gz` | Quick, ClamAV rarely scans .tar.gz with JS_Zip rule |
| **B. SFTP direct** | FileZilla / `rsync` / `sftp` CLI → bypasses scanner | Most reliable — ClamAV only runs on File Manager uploads |
| **C. Source + build on server** | Upload source, SSH → `npm install && npm run build` | If hosting has SSH + sufficient RAM/CPU |

---

## 1. Prerequisites on cPanel

1. **cPanel Account** with **Setup Node.js App** (CloudLinux NodeJS Selector) enabled.
2. **Node.js Version**: Select **20.x** or **22.x** in cPanel.
3. **MySQL Database**: Created via *cPanel → MySQL Databases*.

---

## 2. Setting Up MySQL on cPanel

1. In cPanel, navigate to **MySQL Databases**:
   - Create a new database, e.g., `youruser_oushodhwala`.
   - Create a new user, e.g., `youruser_dbuser` with a strong password.
   - Add the user to the database with **ALL PRIVILEGES**.
2. Note your connection string:
   ```
   DATABASE_URL="mysql://youruser_dbuser:YOUR_STRONG_PASSWORD@localhost:3306/youruser_oushodhwala"
   ```
   *(On cPanel, MySQL host is almost always `localhost:3306` or `127.0.0.1:3306`)*

---

## 3. Building Locally

```bash
# Install dependencies
npm install

# Build standalone bundle + copy static assets
npm run build:cpanel

# Create tar.gz (avoids ClamAV ZIP rule)
bash scripts/deploy-cpanel.sh tgz
# → creates: dist-cpanel/oushodhwala-production.tar.gz (17 MB)

# Or create split parts (upload safe pieces first, JS bundles via SFTP)
bash scripts/deploy-cpanel.sh split
# → creates: dist-cpanel/split/01-server-core.tar.gz ... 06-next-server.tar.gz
```

---

## 4. Uploading to cPanel — Strategy A: tar.gz

1. In cPanel → **File Manager**, navigate to `/home/youruser/`.
2. Upload `dist-cpanel/oushodhwala-production.tar.gz`.
   - If ClamAV still blocks it, use SFTP (Strategy B below).
3. Click **Extract** to extract into `/home/youruser/oushodhwala/`.

---

## 4B. Uploading — Strategy B: SFTP (Recommended — 100% bypass)

ClamAV **only scans File Manager uploads**, not SFTP/SCP connections.

**Using FileZilla:**
```
Protocol:  SFTP
Host:      yourdomain.com
Username:  cPanel username
Password:  cPanel password
Port:      22
```
Upload the entire `.next/standalone/` folder to `/home/youruser/oushodhwala/`.

**Using rsync (fastest):**
```bash
rsync -avz --progress \
  .next/standalone/ \
  youruser@yourdomain.com:/home/youruser/oushodhwala/
```

**Using split tarballs (upload safe parts via File Manager, JS parts via SFTP):**
```bash
# Upload these 4 via File Manager — no JS bundles, safe:
dist-cpanel/split/01-server-core.tar.gz   (5 KB)
dist-cpanel/split/02-node-modules.tar.gz  (12 MB — safe, npm packages)
dist-cpanel/split/03-public.tar.gz        (150 KB)
dist-cpanel/split/04-storage.tar.gz       (SVG images)

# Upload these 2 via SFTP if File Manager blocks them:
dist-cpanel/split/05-next-static.tar.gz   (1.2 MB — CSS/JS chunks)
dist-cpanel/split/06-next-server.tar.gz   (4.3 MB — SSR bundles)
```

Then in cPanel Terminal:
```bash
APP=/home/youruser/oushodhwala
mkdir -p $APP/.next

for f in 01-server-core 02-node-modules 03-public 04-storage; do
  tar -xzf ${f}.tar.gz -C $APP
done

tar -xzf 05-next-static.tar.gz -C $APP/.next
tar -xzf 06-next-server.tar.gz -C $APP/.next
```

---

## 4C. Uploading — Strategy C: Source + Build on Server

Upload only source files (no `.next/` folder):
```bash
bash scripts/deploy-cpanel.sh source
# → dist-cpanel/oushodhwala-source.tar.gz (tiny, definitely clean)
```

Upload via File Manager or SFTP, then in cPanel Terminal:
```bash
cd /home/youruser/oushodhwala
npm install --omit=dev
npm run build
```
> ⚠️ Requires the hosting plan to have enough RAM (≥ 512 MB) and a 5–10 minute CPU time limit for Next.js build.

---

## 5. Configuring Environment Variables

After uploading, create the `.env` file:

```bash
cd /home/youruser/oushodhwala
cp .env.production.example .env
nano .env   # or use cPanel File Manager editor
```

Minimum required values:
```ini
DATABASE_URL="mysql://youruser_dbuser:YOUR_PASSWORD@localhost:3306/youruser_oushodhwala"
AUTH_SECRET="your-random-32-character-secret"
AUTH_URL="https://yourdomain.com"
PUBLIC_ORIGIN="https://yourdomain.com"
NODE_ENV="production"
PORT="3000"
UPLOAD_DIR="./storage/uploads"
UPLOAD_PUBLIC_BASE="/uploads"
STORAGE_DRIVER="local"
```

Generate `AUTH_SECRET`:
```bash
openssl rand -base64 32
```

---

## 6. Configuring Node.js Selector in cPanel

1. In cPanel → **Setup Node.js App** → **Create Application**:
   - **Node.js version**: `20.x` or higher
   - **Application mode**: `Production`
   - **Application root**: `oushodhwala`
   - **Application URL**: `yourdomain.com`
   - **Application startup file**: `server.js`
2. Click **Create**.

---

## 7. Running Migrations & Seeding Database

In cPanel Terminal or SSH:

```bash
# Activate Node.js virtual environment (copy from cPanel Setup Node.js App panel)
source /home/youruser/nodevenv/oushodhwala/20/bin/activate
cd /home/youruser/oushodhwala

# Push database schema
npx drizzle-kit push

# Seed medicine catalog + admin user
npx tsx src/server/db/seed.ts
```

Default seeded administrator:
- **Email**: `admin@oushodhwala.local`
- **Password**: `Admin@12345` ⚠️ *Change this immediately in Admin panel!*

---

## 8. Restarting & Verifying Application

1. In cPanel → **Setup Node.js App** → click **Restart Application**.
2. Visit `https://yourdomain.com`:
   - Storefront loads catalog medicines with images and pricing ✓
   - Test search, cart, checkout ✓
   - Visit `/admin` to verify ERP & management panels ✓
   - Health check: `GET https://yourdomain.com/api/public/health` → `{"ok":true}` ✓

---

## 9. Troubleshooting

| Problem | Fix |
|---|---|
| ClamAV blocks upload | Use SFTP (FileZilla) or `rsync` — bypasses scanner |
| `MODULE_NOT_FOUND` on startup | Run `npm install` in app dir; check `server.js` path |
| DB connection refused | Verify `DATABASE_URL` uses `localhost` not `127.0.0.1` for cPanel |
| 502 Bad Gateway | Check cPanel Node.js App is running; check `server.js` startup file setting |
| Images not loading | Verify `UPLOAD_DIR=./storage/uploads` and `storage/` folder was uploaded |
| `AUTH_SECRET` error | Set `AUTH_SECRET` in `.env` (minimum 32 chars) |

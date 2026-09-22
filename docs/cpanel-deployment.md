# cPanel Cloud Hosting Deployment Guide for Oushodhwala (ঔষধওয়ালা)

This document describes how to deploy the Oushodhwala Next.js application to **cPanel Cloud Hosting** using the **Node.js Selector (Phusion Passenger)** and **cPanel MySQL**.

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
2. Note your database connection string:
   ```
   DATABASE_URL="mysql://youruser_dbuser:YOUR_STRONG_PASSWORD@localhost:3306/youruser_oushodhwala"
   ```
   *(On cPanel, MySQL host is almost always `localhost:3306` or `127.0.0.1:3306`).*

---

## 3. Preparing the Build Locally (Fastest & Safest Method)

Running `next build` on shared or cloud hosting can sometimes exceed cPanel CPU/RAM limits. The recommended practice is to generate the standalone bundle locally:

```bash
# 1. Install dependencies
npm install

# 2. Build for production and bundle standalone files with static assets
npm run build:cpanel
```

This generates a ready-to-deploy standalone bundle in `.next/standalone/`:
- `.next/standalone/.next/static`
- `.next/standalone/public`
- `.next/standalone/storage/uploads`
- `.next/standalone/server.js`
- `.next/standalone/.htaccess`
- `.next/standalone/.env.production.example`

### Create Deployment Zip:
```bash
cd .next/standalone
zip -r ../../oushodhwala-production.zip .
cd ../..
```

---

## 4. Uploading to cPanel

1. In cPanel, open **File Manager**.
2. Create a folder for your application (outside `public_html` or directly inside the domain root, e.g., `/home/youruser/oushodhwala`).
3. Upload `oushodhwala-production.zip` and extract it into that folder.
4. Copy `.env.production.example` to `.env`:
   ```bash
   cp .env.production.example .env
   ```
   Edit `.env` with your production values:
   ```ini
   DATABASE_URL="mysql://youruser_dbuser:YOUR_PASSWORD@localhost:3306/youruser_oushodhwala"
   AUTH_SECRET="generated-32-character-random-secret"
   AUTH_URL="https://yourdomain.com"
   PUBLIC_ORIGIN="https://yourdomain.com"
   NODE_ENV="production"
   PORT="3000"
   UPLOAD_DIR="./storage/uploads"
   UPLOAD_PUBLIC_BASE="/uploads"
   STORAGE_DRIVER="local"
   ```

---

## 5. Configuring Node.js Selector in cPanel

1. In cPanel, open **Setup Node.js App**.
2. Click **Create Application**:
   - **Node.js version**: `20.x` or higher
   - **Application mode**: `Production`
   - **Application root**: `oushodhwala` (the folder where files were uploaded)
   - **Application URL**: `yourdomain.com`
   - **Application startup file**: `server.js`
3. Click **Create**.
4. In the Application detail view, copy the command to enter the virtual environment:
   ```bash
   source /home/youruser/nodevenv/oushodhwala/20/bin/activate && cd /home/youruser/oushodhwala
   ```

---

## 6. Running Migrations & Seeding Database

Connect via cPanel Terminal or SSH:

```bash
# 1. Activate environment
source /home/youruser/nodevenv/oushodhwala/20/bin/activate && cd /home/youruser/oushodhwala

# 2. Push database schema to cPanel MySQL
npx drizzle-kit push

# 3. Seed initial admin and medicine catalog
npx tsx src/server/db/seed.ts
```

Default seeded administrator:
- **Email**: `admin@oushodhwala.local`
- **Password**: `Admin@12345` *(Please change immediately in the Admin panel!)*

---

## 7. Restarting & Verifying Application

1. In cPanel → **Setup Node.js App**, click **Restart Application**.
2. Visit `https://yourdomain.com`:
   - Storefront should load catalog medicines with images and pricing.
   - Test search, cart, and checkout.
   - Visit `https://yourdomain.com/admin` to verify ERP & management panels.
   - Check health endpoint: `GET https://yourdomain.com/api/public/health`.

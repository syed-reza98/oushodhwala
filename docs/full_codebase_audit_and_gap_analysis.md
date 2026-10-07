# Oushodhwala Complete Codebase Review & Gap Analysis Report
**Audit Date:** 2026-10-07  
**Scope:** `oushodhwala-main-legacy` (TanStack Start + Vite + Supabase/PostgreSQL) vs. Root Project & `src/` (Next.js 16 + Drizzle ORM + MySQL + NextAuth v5)  
**Status:** Audit & Gap Report Only (Zero Code Modifications)

---

## Executive Summary

The **Oushodhwala** platform underwent a full-scale architectural migration:
- **Legacy Stack:** TanStack Start (TypeScript), Nitro server runtime, Vite, `@tanstack/react-router`, `@tanstack/react-query`, and **Supabase (PostgreSQL)** featuring 71 relational tables, 64 SQL stored procedures (RPCs), 55 SQL migration files, PostgreSQL Row-Level Security (RLS) policies, and Realtime WebSocket event streaming.
- **Current Stack:** **Next.js 16 (App Router)** with Node.js runtime, Drizzle ORM, **MySQL 8 / MariaDB** (`mysql2` driver), NextAuth v5 (beta Credentials provider), and dual-driver storage (Local filesystem / AWS S3 & Cloudflare R2).

While the migration has successfully reproduced the visual storefront layout and translated core CRUD operations, our exhaustive audit reveals **major architectural divergences, database schema anomalies, dropped capabilities, security regressions, and UX gaps**.

---

## 1. System Architecture & Infrastructure Comparison

| Architectural Pillar | Legacy Platform (`oushodhwala-main-legacy`) | Next.js Platform (`oushodhwala` / `src`) | Gap & Impact |
| :--- | :--- | :--- | :--- |
| **Framework & Engine** | TanStack Start + Nitro + Vite + `@tanstack/react-router` | Next.js 16 App Router + Webpack/Turbopack | Complete shift from file-route tree generation (`routeTree.gen.ts`) to Next.js App Router conventions. |
| **Database Engine** | PostgreSQL 15+ (Supabase hosted) | MySQL 8.0+ / MariaDB (`mysql2`) | Loss of Postgres-specific features: JSONB indexing, array columns, text search vectors, UUID defaults, and PostgreSQL triggers. |
| **Data Access Layer** | Supabase JS Client (`@supabase/supabase-js`) & PostgREST RPCs | Drizzle ORM (`drizzle-orm` + `drizzle-kit`) | Drizzle models in `src/server/db/schema/core.ts` replace Supabase client queries. |
| **Database Business Logic** | 64 Stored Procedures / RPC Functions (`Database["public"]["Functions"]`) | Hand-rolled TypeScript Server Actions & API Route handlers | All transactional triggers, audit triggers, and complex database procedures were ported into application code; several were dropped. |
| **Security & Access Control** | PostgreSQL Row-Level Security (RLS) enforced at the database engine level | Application-level checks (`requireStaff()`, `hasStaffAccess()`) | No database-level row isolation. If an API route misses authorization, data is exposed. |
| **Authentication** | Supabase Auth (JWT, magic links, recovery tokens, `auth.users`) | NextAuth v5 (`credentials` provider, bcryptjs) | Custom `users` table created; magic links and native Supabase OAuth dropped. |
| **Realtime Sync** | Supabase Realtime Channels (`postgres_changes` via WebSockets) | HTTP Polling (`setInterval` every 8s, 15s, 60s) | No native WebSockets. Significantly higher network overhead and slower UI reaction time for live chat, rider tracking, and admin orders. |
| **File Storage** | Supabase Storage Buckets (`media`, `prescriptions`, `pod`, `reports`, etc.) with RLS | `src/server/storage/` (Local disk `./storage/uploads` or S3/R2) | Uploads served via custom Next.js route `/api/uploads/[...path]`. |
| **AI Integration** | Lovable AI Gateway (`ai-gateway.server.ts`, OpenAI-compatible AI SDK) | Direct Google Gemini REST API (`gemini-2.5-flash`) + fallback proxy | Implemented in `src/server/ai/gateway.ts` with multimodal vision support. |

---

## 2. Database Schema & Data Modeling Gaps

### 2.1 Table Inventory
- **Legacy Supabase Tables:** 71 tables.
- **Next.js MySQL Tables:** 74 tables (Added `users`, `password_reset_tokens`, `campaign_sends`).
- While table names largely correspond 1:1, **field-level discrepancies and omitted columns cause runtime workarounds**.

### 2.2 Critical Table Column Discrepancies

#### A. `deliveries` Table
- **Missing Columns in Next.js MySQL:** `otp`, `pod_photo_url`, `pod_signature_url`, `pod_receiver_name`, `delivered_at`, `picked_at`, `pod_at`, `public_token`, `token_expires_at`, `token_revoked`, `token_scope`.
- **Workaround Hack Identified in Code:**
  In [`src/app/api/admin/delivery/route.ts`](file:///home/syed/Workspace/oushodhwala/src/app/api/admin/delivery/route.ts#L121-L130), because the MySQL schema does not have POD and OTP columns, the backend parses and writes JSON into the text column `note`:
  ```ts
  const deliveryMeta = (d.note ? (d.note.startsWith("{") ? JSON.parse(d.note) : null) : null);
  const otp = deliveryMeta?.otp || (d.id ? String(parseInt(d.id.replace(/\D/g, ""), 10) % 9000 + 1000) : "1234");
  ```
  This is a fragile regression: non-JSON notes break parsing, and fallback OTP defaults to pseudo-random numbers or `"1234"`.

#### B. `orders` Table
- **Missing Columns in Next.js MySQL:** `address`, `area`, `city_zone`, `district`, `thana`, `lat`, `lng`, `slot`, `payment_ref`.
- **Next.js Mapping:** Mapped into unstructured columns `deliveryAddress`, `customerPhone`, `notes` (storing slot), and a generic `meta` JSON column. Geographic coordinates (`lat`, `lng`) and administrative areas (`area`, `thana`, `district`) are lost as structured queryable attributes.

#### C. `prescriptions` Table
- **Missing Columns in Next.js MySQL:** `guest_token`, `parsed`, `parsed_at`, `parse_note`, `notified_expiry`, `notified_parsed`, `file_urls`.
- **Next.js Replacement:** Uses `file_paths`, `ocr_text`, `ocr_json`.
- **Consequence:** Guest users cannot own or claim prescriptions; prescription expiration notifications cannot be tracked.

#### D. `user_favorites` & `account.medicines`
- **Missing Columns in Next.js MySQL:** `reminder_config`, `sync_meta`.
- **Consequence:** Detailed reminder schedules (frequency, time of day, timezone) cannot be persisted on favorites.

#### E. `generic_info` Table
- **Missing Columns in Next.js MySQL:** `overdose`, `overdose_en`, `special_populations`, `special_populations_en`.
- Furthermore, legacy queried generic info using fuzzy `ilike name`, whereas Next.js queries `eq(genericInfo.key, genericKey)`. Unnormalized product generic strings (e.g., `"Paracetamol 500mg"`) fail to match `"paracetamol"`.

---

## 3. Stored Procedures (RPC) vs. Application Logic Gaps

In legacy, 64 business-critical PostgreSQL functions handled atomic operations:

| Legacy Stored Procedure | Next.js Implementation | Gap / Status |
| :--- | :--- | :--- |
| `pos_create_sale` | [`src/app/api/admin/pos/route.ts`](file:///home/syed/Workspace/oushodhwala/src/app/api/admin/pos/route.ts) | Ported to TypeScript; lacks multi-branch accounting and offline sync ref resolution. |
| `apply_stock_adjustment` | [`src/app/api/admin/stock/route.ts`](file:///home/syed/Workspace/oushodhwala/src/app/api/admin/stock/route.ts) | Ported to TypeScript. |
| `apply_stock_count` | [`src/app/api/admin/stock-counts/route.ts`](file:///home/syed/Workspace/oushodhwala/src/app/api/admin/stock-counts/route.ts) | Ported to TypeScript. |
| `post_journal` | [`src/app/api/admin/coa/route.ts`](file:///home/syed/Workspace/oushodhwala/src/app/api/admin/coa/route.ts) | Ported to TypeScript. |
| `day_book`, `finance_summary`, `party_statement` | [`src/app/api/admin/finance-extra/route.ts`](file:///home/syed/Workspace/oushodhwala/src/app/api/admin/finance-extra/route.ts) | Ported to TypeScript queries. |
| `public_track` | [`src/app/api/public/track/route.ts`](file:///home/syed/Workspace/oushodhwala/src/app/api/public/track/route.ts) & `track-token/route.ts` | Ported to TypeScript, but stripped route coordinates and live rider path. |
| `place_order` | [`src/server/actions/orders.ts`](file:///home/syed/Workspace/oushodhwala/src/server/actions/orders.ts) | Ported with transaction, but blocks guest checkout (`AUTH_REQUIRED`). |
| `rider_ping_location` | **Omitted** | Riders cannot broadcast GPS location pings to MySQL. |
| `pos-offline` sync queue | **Omitted** | Offline counter sales queue is completely absent. |
| `rx_share_hit`, `rx_share_open` | [`src/server/actions/rx-share.ts`](file:///home/syed/Workspace/oushodhwala/src/server/actions/rx-share.ts) | Partially ported; lacks view limits and token revocation logic. |
| `support_add_message`, `support_set_agent` | [`src/server/actions/support.ts`](file:///home/syed/Workspace/oushodhwala/src/server/actions/support.ts) & `/api/support` | Ported to TypeScript; relies on 8s polling instead of instant push. |
| `medicine_directory_facets` | Hand-rolled in [`src/server/actions/catalog.ts`](file:///home/syed/Workspace/oushodhwala/src/server/actions/catalog.ts) | Ported using distinct queries. |
| `demo_seed_delivery`, `demo_seed_bulk`, `demo_reset_deliveries` | Partial mock buttons in admin delivery | Omitted full simulation suite. |

---

## 4. Frontend Routes & Pages Comparison (Route-by-Route)

There are 42 customer-facing and system routes. Below is the detailed audit:

### 4.1 Home Page (`/`)
- **Legacy:** `src/routes/index.tsx` (340 lines).
- **Next.js:** `src/app/(shop)/page.tsx` + `HomeClient.tsx` (433 lines).
- **Parity:** High visual fidelity. Hero banner, search trigger, popular medicines, offer cards, lab tests carousel, features, and footer are preserved.

### 4.2 Prescription Upload (`/prescription`)
- **Legacy:** `src/routes/prescription.index.tsx` (907 lines).
- **Next.js:** `src/app/(shop)/prescription/page.tsx` (350 lines).
- **Major Gaps:**
  1. **Guest Upload Blocked:** Next.js throws an error and redirects to `/auth` if the user is unauthenticated:
     ```ts
     if (!user) {
       toast.error(t("আপলোডের জন্য লগইন করুন", "Please log in to upload"));
       router.push("/auth");
       return;
     }
     ```
     Legacy allowed instant guest uploads via `guestToken` stored in localStorage.
  2. **Image Quality Analysis Removed:** Legacy ran client-side canvas checks (`checkRxImage`) measuring blur, contrast, and resolution before upload. Next.js uploads raw files without pre-validation.
  3. **Progress Phase Pipeline Missing:** Legacy displayed multi-stage indicators (`upload` -> `save` -> `read`). Next.js has a basic loading spinner.
  4. **Retention Settings & Housekeeping Removed:** Legacy allowed patients to configure automated prescription data deletion after 30/60/90 days (`rxHousekeeping`).

### 4.3 Prescription Reading & Line Item Order (`/prescription/[id]`)
- **Legacy:** `src/routes/prescription.$id.tsx` (1,939 lines).
- **Next.js:** `src/app/(shop)/prescription/[id]/page.tsx` (359 lines) — **Reduction of 1,580 lines**.
- **Major Gaps:**
  1. **Alternative Medicine Picker Omitted:** Legacy allowed users to click any extracted medication and open `MedicinePicker` to select cheaper generic alternatives or substitute brands. Next.js only shows what OCR matched.
  2. **Interactive Quantity & Dosage Selector Omitted:** Legacy allowed editing dosage cycles (days, frequency) with automatic box calculation and 10% prescription discount (`RX_DISCOUNT`).
  3. **Metadata Editing Removed:** Legacy allowed patients to correct doctor name, hospital, advice, and date.
  4. **Rx Versions & Audit Trail Removed:** Legacy tracked edit revisions (`RxVersions`) and change history (`listRxAudit`).
  5. **Print Summary View Removed:** Legacy provided a print-optimized medical summary (`printRxSummary`).
  6. **Share Manager Omitted:** Legacy had `RxShareManager` to generate expiring secure links.

### 4.4 Account & My Medicines (`/account`, `/account/medicines`)
- **Legacy:** `src/routes/account.medicines.tsx` (1,228 lines).
- **Next.js:** `src/app/(shop)/account/medicines/page.tsx` (369 lines) — **Reduction of 859 lines**.
- **Major Gaps:**
  1. **Drag-and-Drop Reordering Dropped:** Legacy used `@hello-pangea/dnd` allowing users to prioritize medications.
  2. **Intake Calendar View Dropped:** Legacy had a calendar visualization of daily medicine schedules.
  3. **Drug-Drug Interaction Health Checker Dropped:** Legacy had an active interaction analysis tab for patient medications.
  4. **Bulk Operations & Undo Dropped:** Legacy supported multi-select deletion with an "Undo" restore toast.
  5. **Simplified Refill Reminders:** Legacy allowed granular reminders (time of day, timezone, daily/weekly frequency). Next.js only provides a single integer input for "every X days".
  6. **Loyalty Card on Overview:** Legacy showed `LoyaltyCard` directly on `/account`. Next.js moved it to a separate subpage `/account/loyalty`.

### 4.5 Delivery & Rider Portal (`/delivery`)
- **Legacy:** `src/routes/delivery.tsx` (722 lines).
- **Next.js:** `src/app/(shop)/delivery/page.tsx` (322 lines) — **Reduction of 400 lines**.
- **Critical Regressions:**
  1. **Rider Access Blocked by Role Filter:**
     In [`src/server/auth/roles.ts`](file:///home/syed/Workspace/oushodhwala/src/server/auth/roles.ts#L11-L18), `STAFF_ROLES` lists:
     `["super_admin", "admin", "erp_manager", "support_agent", "accountant", "pharmacist"]`.
     Notice **`"rider"` is NOT in `STAFF_ROLES`**.
     In [`src/app/(shop)/delivery/page.tsx`](file:///home/syed/Workspace/oushodhwala/src/app/(shop)/delivery/page.tsx#L41), the delivery query has `enabled: !!user && isStaff`.
     Therefore, **actual riders cannot access or load the delivery panel**.
  2. **Live GPS Geolocation Removed:** Legacy monitored `navigator.geolocation` and transmitted live coordinates. Next.js has zero geolocation tracking.
  3. **WhatsApp / SMS Quick Dispatch Removed:** Quick communication links for riders were stripped.

### 4.6 Public Tracking & Map (`/track/[no]`, `/t/[token]`)
- **Legacy:** `src/routes/t.$token.tsx` (294 lines) & `track.$no.tsx` (279 lines).
- **Next.js:** `src/app/(shop)/t/[token]/page.tsx` (109 lines) & `track/[no]/page.tsx` (224 lines).
- **Major Gaps:**
  1. **Interactive Route Map Omitted:** `RouteMap.tsx` and `LiveMap.tsx` exist in `src/components/` but are **never imported or rendered anywhere in the application** (dead code).
  2. **Rider Live Location Dropped:** Vehicle coordinates, rider marker, and delivery route polyline are not displayed.
  3. **Push Notifications Dropped:** WebPush status notifications (`webpush.ts`) were omitted from the tracking page.
  4. **PDF / Printable Delivery Slip Dropped:** `printTrackReport` was removed.

### 4.7 Doctor Consultation Room (`/consultation/[id]`)
- **Legacy:** `src/routes/consultation.$id.tsx` (659 lines).
- **Next.js:** `src/app/(shop)/consultation/[id]/ConsultationClient.tsx` (571 lines).
- **Major Gaps:**
  1. **Voice Notes / Audio Recording Removed:** The `Mic` audio recording tool from legacy was omitted.
  2. **Report Attachment UX Regression:** Instead of selecting a file from the device (`uploadConsultFile`), users must manually enter a URL string into a text input.
  3. **Prescription Generation & Print:** In legacy, doctors could generate a digital prescription directly inside the consultation room.

### 4.8 Home Services (`/home-services`)
- **Legacy:** `src/routes/home-services.tsx` (462 lines).
- **Next.js:** `src/app/(shop)/home-services/HomeServicesClient.tsx` (198 lines).
- **Major Gaps:**
  1. **Address Validation Omitted:** `AddressPicker` with BD area/thana validation was replaced with a plain unstructured text input.
  2. **Service Request History & Status Tracker Removed:** Legacy displayed past requests with a multi-step timeline (`requested` -> `confirmed` -> `assigned` -> `in_progress` -> `completed`). Next.js only shows a static confirmation screen.

### 4.9 Legal Pages (`/privacy`, `/terms`, `/refund-policy`)
- **Legacy:** Full legal content covering DGDA drug compliance, prescription privacy, HIPAA-style healthcare guidelines, and patient data retention.
- **Next.js:**
  - `/privacy` is truncated to 23 lines.
  - `/terms` is truncated to 23 lines.
  - While [`src/components/LegalPage.tsx`](file:///home/syed/Workspace/oushodhwala/src/components/LegalPage.tsx) exists, it is not utilized on `/privacy` and `/terms`.

### 4.10 Search & Bengali Transliteration (`/medicines`, `SearchBox.tsx`)
- **Legacy:** Integrated `bn-search.ts` into database queries (`expandQuery`), expanding terms phonetically (e.g. `napa` <-> `নাপা`, `seclo` <-> `সেকলো`).
- **Next.js:** [`src/server/actions/catalog.ts`](file:///home/syed/Workspace/oushodhwala/src/server/actions/catalog.ts#L43-L54) executes direct SQL `like '%q%'` without phonetic expansion. Users searching in Bengali for an English-indexed product or vice versa receive empty results.

---

## 5. UI & Component Architecture Comparison

### 5.1 Monolithic Consolidation of Admin Panels
In the legacy codebase, administrative features were clean, modular components:
`AccountsAdmin.tsx`, `BranchesAdmin.tsx`, `FinanceAdmin.tsx`, `ProcurementAdmin.tsx`, `StaffRoles.tsx`, `PermissionMatrix.tsx`, `PosTerminal.tsx`, `StockOpsAdmin.tsx`, `ImageAudit.tsx`, `ImageRevisions.tsx`, `SupportInbox.tsx`, `SystemMonitor.tsx`, etc.

In Next.js:
- **34 legacy component files were removed** from `src/components/`.
- All logic was merged into **a single 7,183-line file: [`src/app/admin/AdminClient.tsx`](file:///home/syed/Workspace/oushodhwala/src/app/admin/AdminClient.tsx)**, with 8 auxiliary panels in [`src/components/admin/RemainingErpPanels.tsx`](file:///home/syed/Workspace/oushodhwala/src/components/admin/RemainingErpPanels.tsx) (618 lines).
- **Impact:** Extreme file size, high re-render overhead, difficult maintenance, and high coupling.

### 5.2 Dropped & Dead Components
- **`src/lib/pos-offline.ts`:** Completely deleted. The offline POS queue with indexed storage and idempotent `#ref` sync is missing.
- **`src/components/RouteMap.tsx` & `LiveMap.tsx`:** Left in the codebase but never imported or used.
- **`src/components/RequireAuth.tsx`:** Left in the codebase but never imported.
- **`src/components/LoyaltyCard.tsx`:** Deleted; replaced by an isolated page route.
- **`src/components/MedicinePicker.tsx`:** Deleted; leaves prescription review without interactive substitution.
- **`src/components/ProductPreview.tsx`:** Deleted.
- **`src/components/TestReportView.tsx`:** Inlined into `RemainingErpPanels.tsx`.

---

## 6. SEO, Rendering & Metadata Gaps

| Metric | Legacy Project | Next.js Project |
| :--- | :--- | :--- |
| **Server-Side Metadata** | Almost all routes defined `head: () => ({ meta, links, scripts })`. | **Only 2 files** define metadata (`src/app/layout.tsx` and `src/app/(shop)/page.tsx`). |
| **`"use client"` Usage** | Modular SSR where appropriate. | **All 40+ shop pages** are marked `"use client"`. |
| **OpenGraph & Social Sharing** | Dynamic `og:title`, `og:image`, and `og:description` on products, categories, and prescriptions. | None on product/category pages. Sharing links generates generic homepage cards. |
| **Schema.org Structured Data** | JSON-LD Breadcrumbs, `Product`, `CollectionPage`, and `Service` schemas. | Completely missing in Next.js pages. |
| **Sitemap Generation** | Static & dynamic sitemap routes. | [`src/app/sitemap.xml/route.ts`](file:///home/syed/Workspace/oushodhwala/src/app/sitemap.xml/route.ts) misses `/medicines` and dynamic `/medicine/[id]` routes. |

---

## 7. Security, Environment & Operational Findings

As cross-referenced with [`SECURITY_ENVIRONMENT_SECRETS_AUDIT.md`](file:///home/syed/Workspace/oushodhwala/SECURITY_ENVIRONMENT_SECRETS_AUDIT.md):
1. **Tracked Credentials in Git Index:**
   `.env` and compiled Python files (`scripts/__pycache__/`) are tracked in the Git repository index, exposing database credentials, `AUTH_SECRET`, and cPanel credentials.
2. **Hardcoded Server Credentials:**
   Plaintext cPanel SSH and FTP credentials remain hardcoded in [`scripts/deploy-all-to-cpanel.py`](file:///home/syed/Workspace/oushodhwala/scripts/deploy-all-to-cpanel.py#L8-L10) and [`scripts/upload-images.py`](file:///home/syed/Workspace/oushodhwala/scripts/upload-images.py#L17-L18).
3. **Database Security Model Regression:**
   PostgreSQL RLS was completely discarded during the MySQL migration. If an API route does not explicitly call `requireStaff()`, any authenticated or public user can access internal endpoints.

---

## 8. Summary Checklist of Mismatches

- [x] **Database:** 64 Supabase RPCs replaced by partial Node.js handlers; loss of triggers and RLS.
- [x] **Database Schema:** `deliveries` table stripped of OTP and POD columns (JSON hack in `note`).
- [x] **Database Schema:** `orders` stripped of structured geographic fields (`lat`, `lng`, `thana`, `district`).
- [x] **Auth & Roles:** `rider` omitted from `STAFF_ROLES`, locking riders out of the delivery portal.
- [x] **Prescriptions:** Guest uploads blocked; image quality pre-check removed; alternative medicine picker removed; Rx versioning & audit log removed.
- [x] **POS:** Offline sync queue (`pos-offline.ts`) completely deleted.
- [x] **Delivery & Maps:** `RouteMap` and `LiveMap` are dead code; real-time rider tracking and push alerts removed.
- [x] **Customer Portal:** Drag-and-drop medicine reordering, calendar intake, and interaction checker removed from `account.medicines`.
- [x] **Consultation:** Audio recording (`Mic`) removed; file attachment replaced with manual URL input.
- [x] **Admin Architecture:** 34 modular components collapsed into monolithic 7,183-line `AdminClient.tsx`.
- [x] **Admin Modules:** Dedicated Home Services panel omitted from navigation.
- [x] **SEO:** 40+ pages marked `"use client"` without server-rendered metadata or JSON-LD.
- [x] **Legal:** Privacy policy and terms pages reduced to 23-line stubs.
- [x] **Search:** Phonetic Bengali transliteration (`bn-search.ts`) bypassed in SQL catalog search.

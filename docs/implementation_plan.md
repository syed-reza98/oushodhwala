# Oushodhwala Full Parity Implementation Plan (Legacy to Next.js 16)

This implementation plan details the exact engineering strategy to resolve all gaps identified in the [Full Codebase Audit & Gap Analysis Report](file:///home/syed/.gemini/antigravity/brain/802a137f-f0a5-4a22-b128-b890200236fd/full_codebase_audit_and_gap_analysis.md). The objective is to restore **100% functional, architectural, and visual parity** with the legacy system ([`oushodhwala-main-legacy`](file:///home/syed/Workspace/oushodhwala/oushodhwala-main-legacy)) on top of **Next.js 16, Drizzle ORM, MySQL, and NextAuth v5**.

---

## User Review Required

> [!IMPORTANT]
> - **Local MySQL Execution:** All database schema changes will be executed safely via `ALTER TABLE` statements against the running local MySQL server (`yessban2_oushodhwala` / `oushodhwala`) to ensure zero loss of the existing **25,359 products** and static seeds.
> - **Zero Code Modification in Planning Phase:** No files or database records will be modified until you review and approve this plan.
> - **Admin Panel Modularization:** The monolithic 7,183-line `AdminClient.tsx` will be broken down into clean, modular domain components under `src/components/admin/`, mirroring the legacy codebase.

---

## Architecture & Phased Roadmap

```mermaid
flowchart TD
    subgraph Phase 1: Core Foundation & Database
        P1_DB["1.1 Safe MySQL Schema Migration\n(deliveries, prescriptions, orders)"]
        P1_AUTH["1.2 Auth & Role Access Fixes\n(Rider role, useAuth profile phone, Guest tokens)"]
    end

    subgraph Phase 2: Prescription Parity & Intelligent Search
        P2_RX_UP["2.1 /prescription Guest Upload & Canvas Quality Check"]
        P2_RX_DET["2.2 /prescription/[id] Full Parity (1900-line Restoration)\n(Alt Picker, Dosage/Qty Calculator, Versions, Audit)"]
        P2_SEARCH["2.3 Phonetic Bengali Search (bn-search.ts) & Drug Monographs"]
    end

    subgraph Phase 3: Delivery, Rider Portal, Maps & Tracking
        P3_DEL["3.1 /delivery Portal Fix\n(Rider Access, Live Geolocation, POD Signature & Camera)"]
        P3_MAP["3.2 Map & Route Activation (RouteMap.tsx, LiveMap.tsx)\non /track/[no] and /t/[token]"]
    end

    subgraph Phase 4: Modular Admin Architecture & ERP
        P4_MOD["4.1 Decompose AdminClient.tsx into modular domain panels"]
        P4_SVC["4.2 Restore Dedicated Home Services Admin Panel"]
        P4_POS["4.3 Restore Offline POS Sync Engine (pos-offline.ts)"]
    end

    subgraph Phase 5: Customer Portal, Healthcare Services, SEO & Legal
        P5_MEDS["5.1 /account/medicines Drag & Drop + Calendar Intake"]
        P5_CONSULT["5.2 Consultation Room File Attachments & Audio Notes"]
        P5_LEGAL["5.3 Restore Full Legal Compliance (privacy, terms, refund)"]
        P5_SEO["5.4 Server-Side Metadata, OpenGraph & JSON-LD across all routes"]
    end

    P1_DB --> P1_AUTH
    P1_AUTH --> P2_RX_UP
    P2_RX_UP --> P2_RX_DET
    P2_RX_DET --> P2_SEARCH
    P2_SEARCH --> P3_DEL
    P3_DEL --> P3_MAP
    P3_MAP --> P4_MOD
    P4_MOD --> P4_SVC
    P4_SVC --> P4_POS
    P4_POS --> P5_MEDS
    P5_MEDS --> P5_CONSULT
    P5_CONSULT --> P5_LEGAL
    P5_LEGAL --> P5_SEO
```

---

## Proposed Changes

---

### Phase 1: Database Schema Migration & Auth/Role Fixes

#### 1.1 Database Schema Migration
Update [`src/server/db/schema/core.ts`](file:///home/syed/Workspace/oushodhwala/src/server/db/schema/core.ts) and run safe `ALTER TABLE` SQL commands against MySQL:

##### [MODIFY] `src/server/db/schema/core.ts`
- **`deliveries` table:** Add formal columns:
  - `otp`: `varchar("otp", { length: 8 })`
  - `podPhotoUrl`: `varchar("pod_photo_url", { length: 1024 })`
  - `podSignatureUrl`: `varchar("pod_signature_url", { length: 1024 })`
  - `podReceiverName`: `varchar("pod_receiver_name", { length: 255 })`
  - `podAt`: `datetime("pod_at", { mode: "string", fsp: 3 })`
  - `pickedAt`: `datetime("picked_at", { mode: "string", fsp: 3 })`
  - `deliveredAt`: `datetime("delivered_at", { mode: "string", fsp: 3 })`
  - `publicToken`: `varchar("public_token", { length: 64 })`
  - `tokenExpiresAt`: `datetime("token_expires_at", { mode: "string", fsp: 3 })`
- **`prescriptions` table:** Add columns:
  - `guestToken`: `varchar("guest_token", { length: 64 })`
  - `parsedAt`: `datetime("parsed_at", { mode: "string", fsp: 3 })`
  - `parseNote`: `text("parse_note")`
  - `notifiedExpiry`: `boolean("notified_expiry").notNull().default(false)`
- **`orders` table:** Add structured columns for geospatial/address parity:
  - `area`: `varchar("area", { length: 128 })`
  - `thana`: `varchar("thana", { length: 128 })`
  - `district`: `varchar("district", { length: 128 })`
  - `lat`: `decimal("lat", { precision: 10, scale: 7 })`
  - `lng`: `decimal("lng", { precision: 10, scale: 7 })`
  - `slot`: `varchar("slot", { length: 128 })`
  - `paymentRef`: `varchar("payment_ref", { length: 128 })`

##### [NEW] `scripts/migrations/20261007_schema_parity.sql`
Safe, idempotent migration script to execute on local MySQL:
```sql
ALTER TABLE deliveries
  ADD COLUMN IF NOT EXISTS otp VARCHAR(8) NULL,
  ADD COLUMN IF NOT EXISTS pod_photo_url VARCHAR(1024) NULL,
  ADD COLUMN IF NOT EXISTS pod_signature_url VARCHAR(1024) NULL,
  ADD COLUMN IF NOT EXISTS pod_receiver_name VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS pod_at DATETIME(3) NULL,
  ADD COLUMN IF NOT EXISTS picked_at DATETIME(3) NULL,
  ADD COLUMN IF NOT EXISTS delivered_at DATETIME(3) NULL,
  ADD COLUMN IF NOT EXISTS public_token VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS token_expires_at DATETIME(3) NULL;

ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS guest_token VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS parsed_at DATETIME(3) NULL,
  ADD COLUMN IF NOT EXISTS parse_note TEXT NULL,
  ADD COLUMN IF NOT EXISTS notified_expiry TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS area VARCHAR(128) NULL,
  ADD COLUMN IF NOT EXISTS thana VARCHAR(128) NULL,
  ADD COLUMN IF NOT EXISTS district VARCHAR(128) NULL,
  ADD COLUMN IF NOT EXISTS lat DECIMAL(10, 7) NULL,
  ADD COLUMN IF NOT EXISTS lng DECIMAL(10, 7) NULL,
  ADD COLUMN IF NOT EXISTS slot VARCHAR(128) NULL,
  ADD COLUMN IF NOT EXISTS payment_ref VARCHAR(128) NULL;
```

#### 1.2 Auth & Role Gating Fixes

##### [MODIFY] `src/server/auth/roles.ts`
Add `"rider"` into `STAFF_ROLES` or define explicit `DELIVERY_ROLES` so riders can access `/delivery` and delivery endpoints:
```ts
export const STAFF_ROLES: AppRole[] = [
  "super_admin",
  "admin",
  "erp_manager",
  "support_agent",
  "accountant",
  "pharmacist",
  "rider", // <-- Add rider to enable staff/rider delivery portal access
];
```

##### [MODIFY] `src/hooks/useAuth.tsx`
Fix the hardcoded empty `phone: ""` on profile:
- Fetch user profile phone number directly from `/api/account` or include `phone` in NextAuth session callbacks.

---

### Phase 2: Prescription System Full Parity & Intelligent Search

#### 2.1 Prescription Upload (`/prescription`) Parity

##### [MODIFY] `src/app/(shop)/prescription/page.tsx`
- **Restore Guest Prescription Upload:** Integrate `getGuestToken()` from [`src/lib/rx-guest.ts`](file:///home/syed/Workspace/oushodhwala/src/lib/rx-guest.ts). Allow unauthenticated users to upload prescriptions; store and link the `guestToken`.
- **Restore Client-Side Image Quality Pre-Check:** Integrate `checkRxImage()` from [`src/lib/rx-image-quality.ts`](file:///home/syed/Workspace/oushodhwala/src/lib/rx-image-quality.ts) measuring image blur, brightness, and resolution before submitting. Show warning badge if image is blurry or unreadable.
- **Restore Multi-Phase Upload Flow:** Implement visual progress indicators: `Uploading Files` -> `Saving Record` -> `AI Optical Reading`.
- **Restore Guest Prescription Claiming:** When a guest registers or signs in, automatically associate their pending `guestToken` prescriptions with their user ID.

#### 2.2 Prescription Reading & Ordering (`/prescription/[id]`) Full Restoration

##### [MODIFY] `src/app/(shop)/prescription/[id]/page.tsx`
Restore from legacy `prescription.$id.tsx` (1,939 lines):
- **Alternative Medicine Picker Modal (`MedicinePicker`):** Restore [`MedicinePicker.tsx`](file:///home/syed/Workspace/oushodhwala/src/components/MedicinePicker.tsx) allowing patients to view and swap equivalent or cheaper generic alternatives for each parsed medication.
- **Interactive Dosage & Duration Calculator:** Interactive day count, dosage calculation (`1+0+1`, `2 times daily`), total box quantity calculation, and apply the 10% prescription discount (`RX_DISCOUNT = 0.1`).
- **Editable Prescription Metadata:** Enable editing for Doctor Name, Hospital, Advice, Patient Age, and Date.
- **Prescription Share Manager Modal:** Restore [`RxShareManager.tsx`](file:///home/syed/Workspace/oushodhwala/src/components/RxShareManager.tsx) to generate and manage expiring secure links.
- **Printable Medical Summary:** Restore `printRxSummary()` from [`src/lib/rx-summary.ts`](file:///home/syed/Workspace/oushodhwala/src/lib/rx-summary.ts).
- **Rx Change Audit & Version History:** Track modifications in `prescription_audit`.

#### 2.3 Phonetic Bengali Search & Medicine Directory Parity

##### [MODIFY] `src/server/actions/catalog.ts`
- Integrate `expandQuery` from [`src/lib/bn-search.ts`](file:///home/syed/Workspace/oushodhwala/src/lib/bn-search.ts).
- When a user searches for `"napa"` or `"নাপা"`, expand search terms across English transliterations and Bengali spellings.
- Query against brand, name, English name, and generic fields simultaneously using expanded tokens.

##### [MODIFY] `src/app/(shop)/medicine/[id]/MedicineDetailClient.tsx`
- Restore alternative generic brands list sorted by price.
- Fetch and display the generic medical monograph (`generic_info`: indications, pharmacology, dosage, contraindications, pregnancy warnings).
- Display other products from the same pharmaceutical manufacturer.

---

### Phase 3: Delivery, Rider Portal, Maps & Tracking

#### 3.1 Rider Delivery Portal (`/delivery`)

##### [MODIFY] `src/app/(shop)/delivery/page.tsx`
- Enable access for users with role `"rider"`.
- **Restore HTML5 Geolocation Tracking:** Use `navigator.geolocation.watchPosition` to periodically transmit rider GPS coordinates (`last_lat`, `last_lng`) to the server.
- **Restore Digital Proof of Delivery (POD):** Integrate [`SignaturePad.tsx`](file:///home/syed/Workspace/oushodhwala/src/components/SignaturePad.tsx) and camera capture directly into the order delivery confirmation flow, saving POD photo and customer signature to `/api/upload`.
- **Restore OTP Delivery Handshake:** Validate the 4-digit OTP from the customer before completing delivery.

#### 3.2 Live Tracking & Route Maps

##### [MODIFY] `src/app/(shop)/track/[no]/page.tsx` & `src/app/(shop)/t/[token]/page.tsx`
- **Re-activate Map Visualizations:** Import and render [`RouteMap.tsx`](file:///home/syed/Workspace/oushodhwala/src/components/RouteMap.tsx) and [`LiveMap.tsx`](file:///home/syed/Workspace/oushodhwala/src/components/LiveMap.tsx).
- Display customer destination coordinates, rider's current location pin, vehicle icon (bike/van), and route polyline.
- **Adaptive Polling / SSE:** Poll delivery updates every 4 seconds when in transit, slowing to 15 seconds once delivered.
- **Printable Delivery Report:** Re-enable `printTrackReport` from [`src/lib/track-report.ts`](file:///home/syed/Workspace/oushodhwala/src/lib/track-report.ts).

---

### Phase 4: Modular Admin Architecture & ERP System

#### 4.1 Decompose Monolithic `AdminClient.tsx` into Domain Panels

##### [NEW] Modular Panels under `src/components/admin/`
Extract domain modules out of `AdminClient.tsx`:
- [`src/components/admin/OrdersAdmin.tsx`](file:///home/syed/Workspace/oushodhwala/src/components/admin/OrdersAdmin.tsx): Order management, status updates, invoice generation, customer communication.
- [`src/components/admin/PosTerminal.tsx`](file:///home/syed/Workspace/oushodhwala/src/components/admin/PosTerminal.tsx): Counter sales, barcode scanning, receipt printing, customer selection.
- [`src/components/admin/DeliveryAdmin.tsx`](file:///home/syed/Workspace/oushodhwala/src/components/admin/DeliveryAdmin.tsx): Rider dispatch, live map, delivery zones.
- [`src/components/admin/ProcurementAdmin.tsx`](file:///home/syed/Workspace/oushodhwala/src/components/admin/ProcurementAdmin.tsx): Suppliers, purchase orders, batch receiving, expiry tracking.
- [`src/components/admin/FinanceAdmin.tsx`](file:///home/syed/Workspace/oushodhwala/src/components/admin/FinanceAdmin.tsx): Chart of accounts, journal entries, expenses, day book, financials.
- [`src/components/admin/BranchesAdmin.tsx`](file:///home/syed/Workspace/oushodhwala/src/components/admin/BranchesAdmin.tsx): Multi-branch inventory, inter-branch stock transfers.
- [`src/components/admin/StaffRolesAdmin.tsx`](file:///home/syed/Workspace/oushodhwala/src/components/admin/StaffRolesAdmin.tsx): Staff directory, role assignments, permission matrix.
- [`src/components/admin/ServiceRequestsAdmin.tsx`](file:///home/syed/Workspace/oushodhwala/src/components/admin/ServiceRequestsAdmin.tsx): Dedicated home healthcare service request management.
- [`src/components/admin/ImageAuditAdmin.tsx`](file:///home/syed/Workspace/oushodhwala/src/components/admin/ImageAuditAdmin.tsx): Image moderation, revisions, rollback comparisons.
- [`src/components/admin/SupportAdmin.tsx`](file:///home/syed/Workspace/oushodhwala/src/components/admin/SupportAdmin.tsx): Live customer support desk.

##### [MODIFY] `src/app/admin/AdminClient.tsx`
Refactor into a clean router shell that imports the modular panels based on active tab, reducing line count from 7,183 to ~300 lines.

#### 4.2 Offline POS Sync Engine

##### [NEW] `src/lib/pos-offline.ts`
Restore the offline POS queue engine from legacy:
- LocalStorage queue caching (`ow.pos.queue.v1`).
- Offline sales recording with idempotent `#ref:<id>` keys.
- Automatic online detection and synchronization via `syncQueue()`.
- Stock conflict resolution.

---

### Phase 5: Customer Portal, Healthcare Services, SEO & Legal Compliance

#### 5.1 Account & Medicines Parity

##### [MODIFY] `src/app/(shop)/account/medicines/page.tsx`
- Restore `@hello-pangea/dnd` drag-and-drop medicine reordering.
- Restore daily medicine intake calendar schedule.
- Restore multi-select bulk operations (delete, mark inactive) with "Undo" restoration.
- Restore comprehensive refill reminder settings (frequency, time of day, timezone).

##### [MODIFY] `src/app/(shop)/account/page.tsx`
- Re-introduce [`LoyaltyCard`](file:///home/syed/Workspace/oushodhwala/src/components/LoyaltyCard.tsx) directly on the account overview page.

#### 5.2 Consultation Room & Home Services Parity

##### [MODIFY] `src/app/(shop)/consultation/[id]/ConsultationClient.tsx`
- Replace raw URL text input with proper file/photo picker connected to `/api/upload`.
- Re-integrate voice note audio recording tool (`Mic`).

##### [MODIFY] `src/app/(shop)/home-services/HomeServicesClient.tsx`
- Integrate `AddressPicker` with BD area/thana selection.
- Restore request lifecycle timeline and cancellation options.

#### 5.3 Full Legal Content Restoration

##### [MODIFY] `src/app/(shop)/privacy/page.tsx` & `src/app/(shop)/terms/page.tsx`
- Re-integrate [`LegalPage.tsx`](file:///home/syed/Workspace/oushodhwala/src/components/LegalPage.tsx).
- Restore the full Bengali and English legal text covering DGDA regulations, medical records privacy, data retention, and terms of service.

#### 5.4 Server-Side Metadata, OpenGraph & Structured Data (SEO)

##### [MODIFY] Dynamic & Static Shop Pages
- Add `generateMetadata` exports to:
  - `src/app/(shop)/product/[id]/page.tsx` (Dynamic product title, generic, price, image, OpenGraph card).
  - `src/app/(shop)/category/[slug]/page.tsx` (Category title, description, OpenGraph).
  - `src/app/(shop)/medicine/[id]/page.tsx` (Medicine details, drug group).
- Add Schema.org JSON-LD structured data:
  - `BreadcrumbList` on all pages.
  - `Product` schema with price, availability, and brand on product detail pages.
  - `MedicalEntity` on medicine detail pages.
- Add `/medicines` and dynamic `/medicine/[id]` to [`src/app/sitemap.xml/route.ts`](file:///home/syed/Workspace/oushodhwala/src/app/sitemap.xml/route.ts).

---

## Verification Plan

### 1. Automated Tests & Type Checking
- Run TypeScript static analysis to ensure zero type errors across all refactored components:
  ```bash
  npx tsc --noEmit
  ```
- Run ESLint to verify code quality and rule adherence:
  ```bash
  npm run lint
  ```
- Execute Playwright E2E test suite:
  ```bash
  npm run test:e2e
  ```

### 2. Manual Verification Workflows
- **Database & Data Integrity:**
  - Verify `SELECT count(*) FROM products` remains exactly **25,359**.
  - Verify new columns in `deliveries`, `orders`, and `prescriptions` accept and persist records.
- **Prescription Workflow:**
  - Open `/prescription` as an unauthenticated guest user; upload a prescription image.
  - Verify client-side image blur/quality checker operates on canvas.
  - Open `/prescription/[id]`; verify `MedicinePicker` allows swapping alternative medications.
  - Verify quantity/dosage editing and 10% prescription discount calculations.
- **Rider & Delivery Portal:**
  - Log in with a `rider` account; verify `/delivery` opens successfully without access denied.
  - Test order status change to "Delivered"; verify digital signature pad and photo capture upload properly.
  - Open `/track/[no]` and `/t/[token]`; verify `RouteMap` and `LiveMap` render customer destination and rider marker.
- **Search & Transliteration:**
  - Search `"napa"` in English -> verify "নাপা" products appear.
  - Search `"প্যারাসিটামল"` in Bengali -> verify Paracetamol products appear.
- **Admin Panel Refactor:**
  - Navigate between all 54 tabs in `/admin`; verify modular components mount cleanly without runtime crashes.
  - Test dedicated Home Services management panel.
  - Test offline POS capability in `/admin` (disconnect network -> record sale -> reconnect -> verify sync).
- **SEO & Legal:**
  - Inspect page sources for `<title>`, `<meta property="og:title">`, and `<script type="application/ld+json">`.
  - Verify `/privacy` and `/terms` display full structured legal documents.

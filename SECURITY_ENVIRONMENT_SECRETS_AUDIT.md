# Security & Environment Variable Secrets Audit Report

**Date:** 2026-10-05  
**Project:** Oushodhwala (`med.yessbangla.top`)  
**Branch:** `review`  
**Auditor:** Antigravity AI Security Audit Engine  

---

## 1. Executive Summary

This security audit conducted a full-scope review across the repository (`src/`, `scripts/`, environment configuration files, and Git tracking indexes) to identify exposed secrets, hardcoded infrastructure credentials, and environment variable configuration hygiene.

### Severity Summary Table

| Severity | Issue | Affected Files / Locations | Risk |
| :--- | :--- | :--- | :--- |
| 🚨 **CRITICAL** | **Hardcoded Plaintext cPanel SSH / FTP Credentials** | [`scripts/deploy-all-to-cpanel.py`](file:///home/syed/Workspace/oushodhwala/scripts/deploy-all-to-cpanel.py#L8-L10)<br>[`scripts/deploy-app.py`](file:///home/syed/Workspace/oushodhwala/scripts/deploy-app.py#L8-L10)<br>[`scripts/upload-images.py`](file:///home/syed/Workspace/oushodhwala/scripts/upload-images.py#L17-L18) | Root cPanel account host, username, and password are hardcoded directly in tracked Python scripts. |
| 🚨 **CRITICAL** | **Live Production Database & Auth Secrets Tracked in Git** | [`.env`](file:///home/syed/Workspace/oushodhwala/.env#L2-L5) | Even though `.env` is listed in `.gitignore`, it is currently tracked in the Git index (`git ls-files .env`). Anyone with repository access has the live MySQL production credentials and auth signing secret. |
| ⚠️ **MEDIUM** | **Compiled Python Bytecode Tracked in Git** | [`scripts/__pycache__/deploy-app.cpython-314.pyc`](file:///home/syed/Workspace/oushodhwala/scripts/__pycache__/deploy-app.cpython-314.pyc) | Compiled `.pyc` file is tracked in git; strings in the bytecode contain the deployment passwords. |
| ℹ️ **INFO** | **Gitignore Missing Python Artifacts** | [`.gitignore`](file:///home/syed/Workspace/oushodhwala/.gitignore) | Missing rules for `__pycache__/` and `*.pyc`. |

---

## 2. Detailed Findings

### Finding 1: Plaintext cPanel Infrastructure Credentials (Critical)
In the deployment automation scripts, production server credentials are hardcoded as plaintext constants:

- **[`scripts/deploy-all-to-cpanel.py`](file:///home/syed/Workspace/oushodhwala/scripts/deploy-all-to-cpanel.py#L8-L10)**:
  ```python
  HOST = "192.250.235.43"
  USER = "yessban2"
  PASS = "O5qe6bUi1:@WC8"
  ```
- **[`scripts/deploy-app.py`](file:///home/syed/Workspace/oushodhwala/scripts/deploy-app.py#L8-L10)**:
  ```python
  HOST = "192.250.235.43"
  USER = "yessban2"
  PASS = "O5qe6bUi1:@WC8"
  ```
- **[`scripts/upload-images.py`](file:///home/syed/Workspace/oushodhwala/scripts/upload-images.py#L17-L18)**:
  ```python
  ftp.connect("192.250.235.43", 21)
  ftp.login("yessban2", "O5qe6bUi1:@WC8")
  ```

---

### Finding 2: Live Production Credentials in Tracked `.env` (Critical)
The project `.env` file is tracked by git:
```bash
$ git ls-files .env
.env
```
Inside [`.env`](file:///home/syed/Workspace/oushodhwala/.env):
- **Database Connection String**:
  ```ini
  DATABASE_URL="mysql://yessban2_syed:oushodhwala2026@localhost:3306/yessban2_oushodhwala"
  ```
  Exposes the live MySQL database user (`yessban2_syed`) and password (`oushodhwala2026`).
- **Auth Session Encryption Key**:
  ```ini
  AUTH_SECRET="75y+K65wyLC1k2MvZ5KchR19zpab2QWRRzyHYmp+f9c="
  ```
  Exposes the secret key used by Auth.js to sign session JWTs and encrypt cookies.

---

### Finding 3: Compiled Python Bytecode in Git Tracking (Medium)
The directory `scripts/__pycache__/` was committed to the repository index:
- `scripts/__pycache__/deploy-app.cpython-314.pyc`
Compiled Python bytecode contains static string constants, including the server password.

---

## 3. Application Environment Variable Inventory

| Variable | Referenced In | Purpose | Status in Codebase |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | [`src/server/db/index.ts`](file:///home/syed/Workspace/oushodhwala/src/server/db/index.ts), [`drizzle.config.ts`](file:///home/syed/Workspace/oushodhwala/drizzle.config.ts) | MySQL connection string for Drizzle ORM | Configured in `.env` |
| `AUTH_SECRET` | [`src/server/auth/config.ts`](file:///home/syed/Workspace/oushodhwala/src/server/auth/config.ts) | JWT signature / cookie encryption secret | Configured in `.env` |
| `AUTH_URL` | [`src/server/auth/config.ts`](file:///home/syed/Workspace/oushodhwala/src/server/auth/config.ts) | Canonical authentication endpoint | Configured in `.env` |
| `PUBLIC_ORIGIN` | [`src/server/storage/s3.ts`](file:///home/syed/Workspace/oushodhwala/src/server/storage/s3.ts) | Base URL for absolute links & fallback upload prefix | Configured in `.env` |
| `STORAGE_DRIVER` | [`src/server/storage/s3.ts`](file:///home/syed/Workspace/oushodhwala/src/server/storage/s3.ts) | `local` vs `s3` (R2 / AWS) | Defaults to `local` |
| `UPLOAD_DIR` | [`src/server/storage/index.ts`](file:///home/syed/Workspace/oushodhwala/src/server/storage/index.ts) | Path where uploaded prescriptions and product images are stored | Configured in `.env` (`./storage/uploads`) |
| `UPLOAD_PUBLIC_BASE` | [`src/server/storage/s3.ts`](file:///home/syed/Workspace/oushodhwala/src/server/storage/s3.ts) | Public URL prefix for uploaded media | Configured in `.env` (`/uploads`) |
| `GEMINI_API_KEY` / `GOOGLE_AI_API_KEY` | [`src/server/ai/gateway.ts`](file:///home/syed/Workspace/oushodhwala/src/server/ai/gateway.ts) | Google Gemini OCR & AI Gateway API key | Optional / empty |
| `LOVABLE_API_KEY` / `AI_GATEWAY_API_KEY` | [`src/server/ai/gateway.ts`](file:///home/syed/Workspace/oushodhwala/src/server/ai/gateway.ts) | Alternative AI gateway provider key | Optional / empty |
| `AI_GATEWAY_BASE_URL` | [`src/server/ai/gateway.ts`](file:///home/syed/Workspace/oushodhwala/src/server/ai/gateway.ts) | Endpoint override for AI proxy | Optional |
| `AI_MODEL` | [`src/server/ai/gateway.ts`](file:///home/syed/Workspace/oushodhwala/src/server/ai/gateway.ts) | Custom AI model override | Defaults to `gemini-2.5-flash` |
| `RESEND_API_KEY` | [`src/server/email/send.ts`](file:///home/syed/Workspace/oushodhwala/src/server/email/send.ts) | Resend API token for transactional emails | Optional / mocked if unset |
| `EMAIL_FROM` / `SMTP_FROM` | [`src/server/email/send.ts`](file:///home/syed/Workspace/oushodhwala/src/server/email/send.ts) | From address for notifications | Optional / fallback in place |
| `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | [`src/server/storage/s3.ts`](file:///home/syed/Workspace/oushodhwala/src/server/storage/s3.ts) | Cloudflare R2 / AWS S3 credentials | Optional (only when `STORAGE_DRIVER=s3`) |

---

## 4. Recommended Remediation Plan

### Remediation 1: Untrack `.env` and `__pycache__` from Git Index
Execute the following to stop tracking `.env` without deleting the local file:
```bash
git rm --cached .env
git rm -r --cached scripts/__pycache__
```

### Remediation 2: Update `.gitignore`
Append Python bytecache ignores to [`.gitignore`](file:///home/syed/Workspace/oushodhwala/.gitignore):
```gitignore
# Python cache
__pycache__/
*.py[cod]
*$py.class
```

### Remediation 3: Parameterize Python Deployment Scripts
Refactor scripts to read credentials from environment variables (`os.environ.get("CPANEL_PASS")`) or a local untracked `.env.deploy` file rather than hardcoding.

### Remediation 4: Credential Rotation
Because `O5qe6bUi1:@WC8` and `oushodhwala2026` exist in previous git commits:
1. Rotate the cPanel hosting account password.
2. Update the MySQL database user password in cPanel.
3. Generate a fresh `AUTH_SECRET` via `openssl rand -base64 32`.

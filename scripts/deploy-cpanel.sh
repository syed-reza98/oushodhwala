#!/usr/bin/env bash
# =============================================================================
# Oushodhwala – cPanel Deployment Helper
# =============================================================================
# Bypasses ClamAV Sanesecurity.Foxhole.JS_Zip_11 false-positive by offering
# three upload strategies that avoid triggering the antivirus scanner.
#
# Usage:
#   chmod +x scripts/deploy-cpanel.sh
#   ./scripts/deploy-cpanel.sh [method]
#
# Methods:
#   source   – Package source files only (build on cPanel server via SSH)
#   tgz      – Package standalone as tar.gz (often bypasses ClamAV JS rule)
#   split    – Create per-folder tarballs for piecemeal upload
# =============================================================================

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$PROJECT_ROOT/dist-cpanel"
STANDALONE_DIR="$PROJECT_ROOT/.next/standalone"

# ── Colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC}   $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
die()     { echo -e "${RED}[ERR]${NC}  $*" >&2; exit 1; }

METHOD="${1:-tgz}"

# =============================================================================
# Method A: source-only archive (build on cPanel via SSH Terminal)
# =============================================================================
package_source() {
  info "Method: SOURCE-ONLY (upload source → build on cPanel via SSH)"
  mkdir -p "$DIST_DIR"

  local OUT="$DIST_DIR/oushodhwala-source.tar.gz"

  tar -czf "$OUT" \
    --exclude='.next' \
    --exclude='node_modules' \
    --exclude='dist-cpanel' \
    --exclude='.git' \
    --exclude='storage/uploads' \
    --exclude='*.bak' \
    -C "$PROJECT_ROOT" \
    .

  local SIZE
  SIZE=$(du -sh "$OUT" | cut -f1)
  success "Created: $OUT ($SIZE)"

  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}NEXT STEPS (build on cPanel):${NC}"
  echo "1. Upload '$OUT' to cPanel File Manager → your app folder"
  echo "   OR via SFTP: sftp user@yourdomain.com (bypasses ClamAV entirely)"
  echo "2. In cPanel Terminal / SSH:"
  echo "   cd /home/youruser/oushodhwala"
  echo "   tar -xzf oushodhwala-source.tar.gz"
  echo "   npm install --omit=dev"
  echo "   npm run build"
  echo "   cp .env.example .env  # edit with production DB credentials"
  echo "   npx drizzle-kit push"
  echo "   npx tsx src/server/db/seed.ts"
  echo "3. In cPanel → Setup Node.js App → set startup file: server.js → Restart"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# =============================================================================
# Method B: standalone tar.gz (ClamAV JS_Zip rule often skips .tar.gz)
# =============================================================================
package_tgz() {
  info "Method: STANDALONE TAR.GZ (avoids ZIP format that triggers ClamAV)"

  [[ -d "$STANDALONE_DIR" ]] || die "Standalone dir not found. Run: npm run build:cpanel"

  mkdir -p "$DIST_DIR"
  local OUT="$DIST_DIR/oushodhwala-production.tar.gz"

  tar -czf "$OUT" -C "$STANDALONE_DIR" .

  local SIZE
  SIZE=$(du -sh "$OUT" | cut -f1)
  success "Created: $OUT ($SIZE)"

  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}NEXT STEPS (upload tar.gz):${NC}"
  echo "1. Upload '$OUT' via cPanel File Manager (or SFTP if still blocked)"
  echo "2. In cPanel Terminal:"
  echo "   mkdir -p /home/youruser/oushodhwala"
  echo "   tar -xzf oushodhwala-production.tar.gz -C /home/youruser/oushodhwala"
  echo "   cd /home/youruser/oushodhwala"
  echo "   cp .env.production.example .env  # fill in DB creds"
  echo "   npx drizzle-kit push"
  echo "   npx tsx src/server/db/seed.ts"
  echo "3. In cPanel → Setup Node.js App → startup file: server.js → Restart"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# =============================================================================
# Method C: split per-folder (upload each part separately, no single big ZIP)
# =============================================================================
package_split() {
  info "Method: SPLIT (separate tarballs per folder – drag-and-drop safe)"

  [[ -d "$STANDALONE_DIR" ]] || die "Standalone dir not found. Run: npm run build:cpanel"

  mkdir -p "$DIST_DIR/split"

  # Core server files (tiny, definitely safe)
  tar -czf "$DIST_DIR/split/01-server-core.tar.gz" \
    -C "$STANDALONE_DIR" \
    server.js package.json .htaccess .env.production.example 2>/dev/null || \
  tar -czf "$DIST_DIR/split/01-server-core.tar.gz" \
    -C "$STANDALONE_DIR" \
    server.js package.json

  # node_modules (no JS bundle, just packages)
  if [[ -d "$STANDALONE_DIR/node_modules" ]]; then
    tar -czf "$DIST_DIR/split/02-node-modules.tar.gz" \
      -C "$STANDALONE_DIR" node_modules
    success "02-node-modules.tar.gz created"
  fi

  # public/ assets (images, fonts, icons – definitely clean)
  if [[ -d "$STANDALONE_DIR/public" ]]; then
    tar -czf "$DIST_DIR/split/03-public.tar.gz" \
      -C "$STANDALONE_DIR" public
    success "03-public.tar.gz created"
  fi

  # storage/uploads (SVG medicine images – clean)
  if [[ -d "$STANDALONE_DIR/storage" ]]; then
    tar -czf "$DIST_DIR/split/04-storage.tar.gz" \
      -C "$STANDALONE_DIR" storage
    success "04-storage.tar.gz created"
  fi

  # .next/static (CSS/JS chunks – this may trigger ClamAV, upload via SFTP if blocked)
  if [[ -d "$STANDALONE_DIR/.next/static" ]]; then
    tar -czf "$DIST_DIR/split/05-next-static.tar.gz" \
      -C "$STANDALONE_DIR/.next" static
    success "05-next-static.tar.gz created"
  fi

  # .next/server (SSR bundles – most likely ClamAV target, use SFTP)
  if [[ -d "$STANDALONE_DIR/.next/server" ]]; then
    tar -czf "$DIST_DIR/split/06-next-server.tar.gz" \
      -C "$STANDALONE_DIR/.next" server
    success "06-next-server.tar.gz created"
  fi

  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}Parts created in: $DIST_DIR/split/${NC}"
  ls -lh "$DIST_DIR/split/"
  echo ""
  echo -e "${YELLOW}NEXT STEPS:${NC}"
  echo "1. Upload 01-04 via cPanel File Manager (safe)"
  echo "   → If 05/06 are blocked → upload via SFTP (bypasses scanner)"
  echo "2. In cPanel Terminal, extract each part:"
  echo "   APP=/home/youruser/oushodhwala"
  echo "   mkdir -p \$APP/.next"
  echo "   for f in 01-server-core 02-node-modules 03-public 04-storage; do"
  echo "     tar -xzf \${f}.tar.gz -C \$APP"
  echo "   done"
  echo "   tar -xzf 05-next-static.tar.gz -C \$APP/.next"
  echo "   tar -xzf 06-next-server.tar.gz -C \$APP/.next"
  echo "   cd \$APP && cp .env.production.example .env"
  echo "   npx drizzle-kit push && npx tsx src/server/db/seed.ts"
  echo "3. cPanel → Setup Node.js App → startup file: server.js → Restart"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# =============================================================================
# SFTP instructions (always shown)
# =============================================================================
show_sftp_tip() {
  echo ""
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}💡 SFTP TIP: Bypasses ClamAV scanner completely${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo "Using FileZilla:"
  echo "  Host:     sftp://yourdomain.com"
  echo "  Username: cPanel username"
  echo "  Password: cPanel password"
  echo "  Port:     22 (or as given by host)"
  echo ""
  echo "Using CLI sftp:"
  echo "  sftp youruser@yourdomain.com"
  echo "  > put $DIST_DIR/oushodhwala-production.tar.gz /home/youruser/"
  echo ""
  echo "Using rsync (fastest):"
  echo "  rsync -avz --progress $STANDALONE_DIR/ youruser@yourdomain.com:/home/youruser/oushodhwala/"
}

# =============================================================================
# Main
# =============================================================================
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║    Oushodhwala – cPanel Deployment Packager              ║${NC}"
echo -e "${CYAN}║    Bypass: Sanesecurity.Foxhole.JS_Zip_11 false positive ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

case "$METHOD" in
  source) package_source ;;
  tgz)    package_tgz ;;
  split)  package_split ;;
  *)
    warn "Unknown method '$METHOD'. Use: source | tgz | split"
    echo "Running default: tgz"
    package_tgz
    ;;
esac

show_sftp_tip

import fs from "node:fs";
import path from "node:path";

function copyFolderRecursive(src: string, dest: string) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyFolderRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function main() {
  console.log("Preparing standalone build bundle for cPanel deployment...");

  const standaloneRoot = path.resolve(process.cwd(), ".next/standalone");
  if (!fs.existsSync(standaloneRoot)) {
    console.error("Error: .next/standalone not found. Did you run 'next build'?");
    process.exit(1);
  }

  // 1. Copy public assets into standalone/public
  const publicSrc = path.resolve(process.cwd(), "public");
  const publicDest = path.join(standaloneRoot, "public");
  console.log(`Copying public assets to ${publicDest}...`);
  copyFolderRecursive(publicSrc, publicDest);

  // 2. Copy .next/static into standalone/.next/static
  const staticSrc = path.resolve(process.cwd(), ".next/static");
  const staticDest = path.join(standaloneRoot, ".next/static");
  console.log(`Copying .next/static to ${staticDest}...`);
  copyFolderRecursive(staticSrc, staticDest);

  // 3. Copy storage/uploads into standalone/storage/uploads
  const storageSrc = path.resolve(process.cwd(), "storage");
  const storageDest = path.join(standaloneRoot, "storage");
  console.log(`Copying storage assets to ${storageDest}...`);
  copyFolderRecursive(storageSrc, storageDest);

  // 4. Copy .htaccess template for cPanel Passenger
  const htaccessContent = `# DO NOT REMOVE. CLOUDLINUX PASSENGER CONFIGURATION BEGIN
PassengerAppRoot "${standaloneRoot}"
PassengerBaseURI "/"
PassengerNodejs "/usr/local/bin/node"
PassengerAppType node
PassengerStartupFile server.js
# DO NOT REMOVE. CLOUDLINUX PASSENGER CONFIGURATION END

# Apache Compression & Caching
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json image/svg+xml
</IfModule>

<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
</IfModule>
`;
  fs.writeFileSync(path.join(standaloneRoot, ".htaccess"), htaccessContent, "utf8");

  // 5. Create cPanel .env template inside standalone
  const envTemplate = `# cPanel Production Environment
# Replace with your cPanel MySQL Database credentials:
DATABASE_URL="mysql://cpaneluser_dbname:password@localhost:3306/cpaneluser_dbname"

# Generate with: openssl rand -base64 32
AUTH_SECRET="your-strong-random-auth-secret"
AUTH_URL="https://yourdomain.com"
PUBLIC_ORIGIN="https://yourdomain.com"

NODE_ENV="production"
PORT="3000"
UPLOAD_DIR="./storage/uploads"
UPLOAD_PUBLIC_BASE="/uploads"
STORAGE_DRIVER="local"
`;
  fs.writeFileSync(path.join(standaloneRoot, ".env.production.example"), envTemplate, "utf8");

  console.log("\nStandalone cPanel bundle prepared successfully in: .next/standalone");
  console.log("You can zip the contents of '.next/standalone' and upload to cPanel!");
}

main().catch((err) => {
  console.error("Failed to prepare cPanel bundle:", err);
  process.exit(1);
});

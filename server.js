/**
 * Production server entry point for cPanel Node.js Selector (CloudLinux / Phusion Passenger).
 * Also works with direct `node server.js` execution.
 */

import path from "node:path";
import fs from "node:fs";
import http from "node:http";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.production, .env.local, and .env
const envFiles = [".env.production", ".env.local", ".env"];
for (const file of envFiles) {
  const full = path.resolve(__dirname, file);
  if (fs.existsSync(full)) {
    try {
      dotenv.config({ path: full });
    } catch {
      // ignore
    }
  }
}

const port = parseInt(process.env.PORT || "3000", 10);
const hostname = process.env.HOSTNAME || "0.0.0.0";
const dev = process.env.NODE_ENV !== "production";

// If Next.js standalone build is present, delegate to it directly
const standaloneServerPath = path.resolve(__dirname, ".next/standalone/server.js");

if (fs.existsSync(standaloneServerPath) && !dev) {
  console.log("[server.js] Starting Next.js standalone server for cPanel...");
  process.env.PORT = String(port);
  process.env.HOSTNAME = hostname;
  await import(standaloneServerPath);
} else {
  console.log(`[server.js] Booting Next.js server (dev=${dev}) on http://${hostname}:${port}...`);
  const { default: next } = await import("next");
  const app = next({ dev, dir: __dirname, hostname, port });
  const handle = app.getRequestHandler();

  await app.prepare();
  const server = http.createServer(async (req, res) => {
    try {
      await handle(req, res);
    } catch (err) {
      console.error("[server error]", err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
}

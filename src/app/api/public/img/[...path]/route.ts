import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { absoluteUploadPath } from "@/server/storage/local";

export const dynamic = "force-dynamic";

/**
 * Public product-image proxy (replaces Supabase storage product-images bucket).
 * GET /api/public/img/<rel-path> → storage/uploads/product-images/<rel-path>
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await ctx.params;
  const relParts = parts.map(decodeURIComponent);
  if (!relParts.length || relParts.some((p) => !p || p.includes(".."))) {
    return new NextResponse("Bad path", { status: 400 });
  }

  const rel = ["product-images", ...relParts].join("/");
  try {
    const abs = absoluteUploadPath(rel);
    const root = path.resolve(
      /*turbopackIgnore: true*/ process.cwd(),
      process.env.UPLOAD_DIR ?? "storage/uploads",
    );
    if (!abs.startsWith(root)) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    const buf = await readFile(abs);
    const ext = path.extname(abs).toLowerCase();
    const type =
      ext === ".png"
        ? "image/png"
        : ext === ".webp"
          ? "image/webp"
          : ext === ".gif"
            ? "image/gif"
            : "image/jpeg";
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}

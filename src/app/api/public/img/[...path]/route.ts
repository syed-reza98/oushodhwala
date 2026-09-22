import { NextRequest, NextResponse } from "next/server";
import { readUpload } from "@/server/storage";

export const dynamic = "force-dynamic";

/**
 * Public product-image proxy (replaces Supabase storage product-images bucket).
 * GET /api/public/img/<rel-path> → product-images/<rel-path>
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
  const file = await readUpload(rel);
  if (!file) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(file.buffer), {
    status: 200,
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

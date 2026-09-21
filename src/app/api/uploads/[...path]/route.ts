import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { absoluteUploadPath } from "@/server/storage/local";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await ctx.params;
  const rel = parts.map(decodeURIComponent).join("/");
  if (!rel || rel.includes("..")) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  try {
    const abs = absoluteUploadPath(rel);
    const root = path.resolve(
      /*turbopackIgnore: true*/ process.cwd(),
      process.env.UPLOAD_DIR ?? "storage/uploads",
    );
    if (!abs.startsWith(root)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const buf = await readFile(abs);
    const ext = path.extname(abs).toLowerCase();
    const type =
      ext === ".png"
        ? "image/png"
        : ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : ext === ".webp"
            ? "image/webp"
            : ext === ".pdf"
              ? "application/pdf"
              : "application/octet-stream";
    return new NextResponse(buf, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}

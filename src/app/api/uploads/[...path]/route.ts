import { NextRequest, NextResponse } from "next/server";
import { readUpload } from "@/server/storage";

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
  const file = await readUpload(rel);
  if (!file) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(file.buffer), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "public, max-age=86400",
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { and, desc, eq, like } from "drizzle-orm";
import { db } from "@/server/db";
import { mediaAssets } from "@/server/db/schema";
import { requireStaff } from "@/server/services/authz";
import { removeUpload, saveUpload } from "@/server/storage/local";

export const dynamic = "force-dynamic";

const KINDS = new Set(["box", "medicine", "banner", "category", "site", "other"]);

function mapAsset(a: typeof mediaAssets.$inferSelect) {
  let tags: string[] = [];
  const raw = a.tags as unknown;
  if (Array.isArray(raw)) tags = raw as string[];
  else if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) tags = parsed as string[];
    } catch {
      tags = [];
    }
  }
  return {
    id: a.id,
    url: a.url,
    path: a.path,
    name: a.name,
    kind: a.kind,
    tags,
    size: a.size,
    createdAt: a.createdAt,
  };
}

export async function GET(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const kind = (req.nextUrl.searchParams.get("kind") ?? "all").trim();
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();

  const filters = [];
  if (kind && kind !== "all") filters.push(eq(mediaAssets.kind, kind));
  if (q) filters.push(like(mediaAssets.name, `%${q}%`));

  const rows = await db
    .select()
    .from(mediaAssets)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(mediaAssets.createdAt))
    .limit(300);

  return NextResponse.json({ items: rows.map(mapAsset) });
}

export async function POST(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const contentType = req.headers.get("content-type") ?? "";

  // URL-only insert
  if (contentType.includes("application/json")) {
    const body = (await req.json()) as { url?: string; name?: string; kind?: string };
    const url = (body.url ?? "").trim();
    if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });
    const kind = KINDS.has(body.kind ?? "") ? (body.kind as string) : "other";
    const id = randomUUID();
    const name = (body.name ?? "").trim() || url.split("/").pop() || "image";
    await db.insert(mediaAssets).values({
      id,
      url,
      path: "",
      name,
      kind,
      tags: [],
      size: 0,
    });
    const [row] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1);
    return NextResponse.json({ ok: true, item: row ? mapAsset(row) : { id, url, path: "", name, kind, tags: [], size: 0 } });
  }

  const form = await req.formData();
  const file = form.get("file");
  const kindRaw = String(form.get("kind") ?? "other");
  const kind = KINDS.has(kindRaw) ? kindRaw : "other";
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const saved = await saveUpload(
    "media",
    { buffer: buf, filename: file.name || "image.bin", contentType: file.type },
    kind,
  );

  const id = randomUUID();
  await db.insert(mediaAssets).values({
    id,
    url: saved.publicUrl,
    path: saved.path,
    name: file.name || "image",
    kind,
    tags: [],
    size: buf.length,
  });

  return NextResponse.json({
    ok: true,
    item: {
      id,
      url: saved.publicUrl,
      path: saved.path,
      name: file.name || "image",
      kind,
      tags: [] as string[],
      size: buf.length,
    },
  });
}

export async function DELETE(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const id = req.nextUrl.searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const [row] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1);
  if (!row) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  if (row.path) await removeUpload(row.path);
  await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
  return NextResponse.json({ ok: true });
}

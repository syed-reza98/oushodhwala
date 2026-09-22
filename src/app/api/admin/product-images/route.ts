import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { products } from "@/server/db/schema";
import { requireStaff } from "@/server/services/authz";
import { saveUpload } from "@/server/storage";

export const dynamic = "force-dynamic";

const PAGE = 24;
const LOCAL_MARKERS = ["/uploads/", "product-images"];

function isMissing(url: string | null | undefined) {
  return !url || !String(url).trim();
}

function isUploaded(url: string | null | undefined) {
  if (isMissing(url)) return false;
  const u = String(url);
  return LOCAL_MARKERS.some((m) => u.includes(m));
}

function mapRow(p: typeof products.$inferSelect) {
  return {
    id: p.id,
    name: p.name,
    en: p.en ?? "",
    imageUrl: p.imageUrl ?? "",
    medicineImageUrl: p.medicineImageUrl ?? "",
  };
}

export async function GET(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const kind = req.nextUrl.searchParams.get("kind") ?? "list";

  if (kind === "counts") {
    const active = await db
      .select({
        id: products.id,
        imageUrl: products.imageUrl,
      })
      .from(products)
      .where(eq(products.active, true));

    let missing = 0;
    let uploaded = 0;
    let external = 0;
    for (const p of active) {
      if (isMissing(p.imageUrl)) missing++;
      else if (isUploaded(p.imageUrl)) uploaded++;
      else external++;
    }
    return NextResponse.json({
      total: active.length,
      missing,
      uploaded,
      external,
    });
  }

  const filter = (req.nextUrl.searchParams.get("filter") ?? "missing").trim();
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const page = Math.max(0, Number(req.nextUrl.searchParams.get("page") ?? 0) || 0);

  const rows = await db
    .select()
    .from(products)
    .where(eq(products.active, true))
    .orderBy(asc(products.name));

  let filtered = rows.filter((p) => {
    if (filter === "missing") return isMissing(p.imageUrl);
    if (filter === "uploaded") return isUploaded(p.imageUrl);
    if (filter === "external") return !isMissing(p.imageUrl) && !isUploaded(p.imageUrl);
    return true;
  });

  if (q) {
    const term = q.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        (p.en ?? "").toLowerCase().includes(term) ||
        p.id.toLowerCase().includes(term),
    );
  }

  const total = filtered.length;
  const slice = filtered.slice(page * PAGE, page * PAGE + PAGE).map(mapRow);

  return NextResponse.json({ items: slice, count: total, page, pageSize: PAGE });
}

export async function POST(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const productId = String(form.get("productId") ?? "").trim();
  const fieldRaw = String(form.get("field") ?? "imageUrl");
  const field = fieldRaw === "medicineImageUrl" ? "medicineImageUrl" : "imageUrl";

  if (!productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  const [prod] = await db.select({ id: products.id }).from(products).where(eq(products.id, productId)).limit(1);
  if (!prod) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const sub = field === "imageUrl" ? "box" : "medicine";
  const saved = await saveUpload(
    "product-images",
    { buffer: buf, filename: file.name || "image.jpg", contentType: file.type },
    `${productId}/${sub}`,
  );

  const patch =
    field === "imageUrl"
      ? { imageUrl: saved.publicUrl }
      : { medicineImageUrl: saved.publicUrl };

  await db.update(products).set(patch).where(eq(products.id, productId));

  return NextResponse.json({ ok: true, url: saved.publicUrl, path: saved.path, field });
}

export async function PATCH(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const body = (await req.json()) as {
    productId?: string;
    imageUrl?: string;
    medicineImageUrl?: string;
    clear?: "imageUrl" | "medicineImageUrl";
  };
  if (!body.productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 });
  }

  const patch: Partial<typeof products.$inferInsert> = {};
  if (body.clear === "imageUrl") patch.imageUrl = "";
  if (body.clear === "medicineImageUrl") patch.medicineImageUrl = "";
  if (body.imageUrl != null) patch.imageUrl = body.imageUrl.trim();
  if (body.medicineImageUrl != null) patch.medicineImageUrl = body.medicineImageUrl.trim();

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  await db.update(products).set(patch).where(eq(products.id, body.productId));
  return NextResponse.json({ ok: true });
}

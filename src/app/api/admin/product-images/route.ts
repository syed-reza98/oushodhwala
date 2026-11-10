import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, isNotNull, isNull, like, ne, notLike, or, sql } from "drizzle-orm";
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
    const [counts] = await db
      .select({
        total: sql<number>`count(*)`,
        missing: sql<number>`sum(case when ${products.imageUrl} is null or trim(${products.imageUrl}) = '' then 1 else 0 end)`,
        uploaded: sql<number>`sum(case when ${products.imageUrl} is not null and (${products.imageUrl} like '%/uploads/%' or ${products.imageUrl} like '%product-images%') then 1 else 0 end)`,
        external: sql<number>`sum(case when ${products.imageUrl} is not null and trim(${products.imageUrl}) != '' and ${products.imageUrl} not like '%/uploads/%' and ${products.imageUrl} not like '%product-images%' then 1 else 0 end)`,
      })
      .from(products)
      .where(eq(products.active, true));

    return NextResponse.json({
      total: Number(counts?.total ?? 0),
      missing: Number(counts?.missing ?? 0),
      uploaded: Number(counts?.uploaded ?? 0),
      external: Number(counts?.external ?? 0),
    });
  }

  const filter = (req.nextUrl.searchParams.get("filter") ?? "missing").trim();
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const page = Math.max(0, Number(req.nextUrl.searchParams.get("page") ?? 0) || 0);

  const conditions = [eq(products.active, true)];

  if (filter === "missing") {
    conditions.push(or(isNull(products.imageUrl), eq(sql`trim(${products.imageUrl})`, ""))!);
  } else if (filter === "uploaded") {
    conditions.push(
      and(
        isNotNull(products.imageUrl),
        or(like(products.imageUrl, "%/uploads/%"), like(products.imageUrl, "%product-images%")),
      )!,
    );
  } else if (filter === "external") {
    conditions.push(
      and(
        isNotNull(products.imageUrl),
        ne(sql`trim(${products.imageUrl})`, ""),
        notLike(products.imageUrl, "%/uploads/%"),
        notLike(products.imageUrl, "%product-images%"),
      )!,
    );
  }

  if (q) {
    const term = `%${q}%`;
    conditions.push(
      or(
        like(products.name, term),
        like(products.en, term),
        like(products.id, term),
      )!,
    );
  }

  const whereClause = and(...conditions);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(whereClause);

  const total = Number(countResult?.count ?? 0);

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      en: products.en,
      imageUrl: products.imageUrl,
      medicineImageUrl: products.medicineImageUrl,
    })
    .from(products)
    .where(whereClause)
    .orderBy(asc(products.name))
    .limit(PAGE)
    .offset(page * PAGE);

  const slice = rows.map((p) => ({
    id: p.id,
    name: p.name,
    en: p.en ?? "",
    imageUrl: p.imageUrl ?? "",
    medicineImageUrl: p.medicineImageUrl ?? "",
  }));

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

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { and, count, desc, eq, like, or } from "drizzle-orm";
import { db } from "@/server/db";
import { imageAuditLog, imageRevisions, products } from "@/server/db/schema";
import { requireStaff } from "@/server/services/authz";

export const dynamic = "force-dynamic";

const PAGE = 24;
const FIELDS = new Set(["box", "medicine"]);
const STATUSES = new Set(["pending", "approved", "rejected", "rolled_back"]);

function nowSql() {
  return new Date().toISOString().slice(0, 23).replace("T", " ");
}

function mapRev(r: typeof imageRevisions.$inferSelect) {
  return {
    id: r.id,
    product_id: r.productId,
    product_name: r.productName,
    field: r.field,
    before_url: r.beforeUrl,
    after_url: r.afterUrl,
    method: r.method,
    source: r.source,
    score: Number(r.score),
    status: r.status,
    note: r.note,
    reviewed_by: r.reviewedBy,
    reviewed_at: r.reviewedAt,
    created_at: r.createdAt,
  };
}

function mapLog(a: typeof imageAuditLog.$inferSelect) {
  return {
    id: a.id,
    product_id: a.productId,
    product_name: a.productName,
    action: a.action,
    field: a.field,
    from_url: a.fromUrl,
    to_url: a.toUrl,
    revision_id: a.revisionId,
    actor: a.actorId,
    note: a.note,
    created_at: a.createdAt,
  };
}

async function writeLog(args: {
  productId: string;
  productName: string;
  action: string;
  field: string;
  fromUrl: string;
  toUrl: string;
  revisionId?: string;
  actorId?: string;
  note?: string;
}) {
  await db.insert(imageAuditLog).values({
    id: randomUUID(),
    productId: args.productId,
    productName: args.productName,
    action: args.action,
    field: args.field,
    fromUrl: args.fromUrl,
    toUrl: args.toUrl,
    revisionId: args.revisionId ?? null,
    actorId: args.actorId ?? null,
    note: args.note ?? "",
  });
}

function applyField(
  field: string,
  url: string,
): { imageUrl?: string; medicineImageUrl?: string } {
  if (field === "medicine") return { medicineImageUrl: url };
  return { imageUrl: url };
}

export async function GET(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const kind = req.nextUrl.searchParams.get("kind") ?? "list";

  if (kind === "summary") {
    const rows = await db
      .select({ status: imageRevisions.status, n: count() })
      .from(imageRevisions)
      .groupBy(imageRevisions.status);
    const counts: Record<string, number> = {
      pending: 0,
      approved: 0,
      rejected: 0,
      rolled_back: 0,
    };
    for (const r of rows) counts[r.status] = Number(r.n);
    return NextResponse.json({ counts, watermarked: 0 });
  }

  if (kind === "audit") {
    const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
    const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get("limit") ?? 60) || 60, 1), 100);
    const filters = [];
    if (q) {
      filters.push(
        or(
          like(imageAuditLog.productName, `%${q}%`),
          like(imageAuditLog.productId, `%${q}%`),
        )!,
      );
    }
    const rows = await db
      .select()
      .from(imageAuditLog)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(imageAuditLog.createdAt))
      .limit(limit);
    return NextResponse.json({ rows: rows.map(mapLog) });
  }

  const status = (req.nextUrl.searchParams.get("status") ?? "pending").trim();
  const method = (req.nextUrl.searchParams.get("method") ?? "all").trim();
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const page = Math.max(0, Number(req.nextUrl.searchParams.get("page") ?? 0) || 0);

  const filters = [];
  if (status !== "all" && STATUSES.has(status)) filters.push(eq(imageRevisions.status, status));
  if (method !== "all") filters.push(eq(imageRevisions.method, method));
  if (q) {
    filters.push(
      or(
        like(imageRevisions.productName, `%${q}%`),
        like(imageRevisions.productId, `%${q}%`),
      )!,
    );
  }

  const where = filters.length ? and(...filters) : undefined;
  const [totalRow] = await db.select({ n: count() }).from(imageRevisions).where(where);
  const rows = await db
    .select()
    .from(imageRevisions)
    .where(where)
    .orderBy(desc(imageRevisions.createdAt))
    .limit(PAGE)
    .offset(page * PAGE);

  return NextResponse.json({
    rows: rows.map(mapRev),
    count: Number(totalRow?.n ?? 0),
    page,
    pageSize: PAGE,
  });
}

export async function POST(req: NextRequest) {
  let user: { id: string };
  try {
    user = await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    ids?: string[];
    productId?: string;
    field?: string;
    afterUrl?: string;
    method?: string;
    source?: string;
    note?: string;
  };

  const action = body.action ?? "";

  if (action === "create") {
    const productId = (body.productId ?? "").trim();
    const field = (body.field ?? "box").trim();
    const afterUrl = (body.afterUrl ?? "").trim();
    if (!productId || !afterUrl || !FIELDS.has(field)) {
      return NextResponse.json({ error: "invalid productId/field/afterUrl" }, { status: 400 });
    }
    const [prod] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!prod) return NextResponse.json({ error: "product not found" }, { status: 404 });

    const beforeUrl = field === "medicine" ? (prod.medicineImageUrl ?? "") : (prod.imageUrl ?? "");
    const id = randomUUID();
    await db.insert(imageRevisions).values({
      id,
      productId,
      productName: prod.name,
      field,
      beforeUrl,
      afterUrl,
      method: (body.method ?? "manual").trim() || "manual",
      source: (body.source ?? "").trim(),
      note: (body.note ?? "").trim(),
      status: "pending",
    });
    await writeLog({
      productId,
      productName: prod.name,
      action: "propose",
      field,
      fromUrl: beforeUrl,
      toUrl: afterUrl,
      revisionId: id,
      actorId: user.id,
      note: body.note ?? "",
    });
    return NextResponse.json({ ok: true, id });
  }

  const ids = Array.isArray(body.ids) ? body.ids.filter((x) => typeof x === "string" && x.trim()) : [];
  if (!ids.length) {
    return NextResponse.json({ error: "ids required" }, { status: 400 });
  }

  if (action === "approve") {
    let applied = 0;
    for (const id of ids) {
      const [rev] = await db.select().from(imageRevisions).where(eq(imageRevisions.id, id)).limit(1);
      if (!rev || rev.status !== "pending") continue;
      await db
        .update(products)
        .set(applyField(rev.field, rev.afterUrl))
        .where(eq(products.id, rev.productId));
      await db
        .update(imageRevisions)
        .set({
          status: "approved",
          reviewedBy: user.id,
          reviewedAt: nowSql(),
        })
        .where(eq(imageRevisions.id, id));
      await writeLog({
        productId: rev.productId,
        productName: rev.productName,
        action: "approve",
        field: rev.field,
        fromUrl: rev.beforeUrl,
        toUrl: rev.afterUrl,
        revisionId: rev.id,
        actorId: user.id,
      });
      applied++;
    }
    return NextResponse.json({ ok: true, applied });
  }

  if (action === "reject") {
    let rejected = 0;
    for (const id of ids) {
      const [rev] = await db.select().from(imageRevisions).where(eq(imageRevisions.id, id)).limit(1);
      if (!rev || rev.status !== "pending") continue;
      await db
        .update(imageRevisions)
        .set({
          status: "rejected",
          reviewedBy: user.id,
          reviewedAt: nowSql(),
        })
        .where(eq(imageRevisions.id, id));
      await writeLog({
        productId: rev.productId,
        productName: rev.productName,
        action: "reject",
        field: rev.field,
        fromUrl: rev.beforeUrl,
        toUrl: rev.afterUrl,
        revisionId: rev.id,
        actorId: user.id,
      });
      rejected++;
    }
    return NextResponse.json({ ok: true, rejected });
  }

  if (action === "rollback") {
    let restored = 0;
    for (const id of ids) {
      const [rev] = await db.select().from(imageRevisions).where(eq(imageRevisions.id, id)).limit(1);
      if (!rev || rev.status !== "approved") continue;
      await db
        .update(products)
        .set(applyField(rev.field, rev.beforeUrl))
        .where(eq(products.id, rev.productId));
      await db
        .update(imageRevisions)
        .set({
          status: "rolled_back",
          reviewedBy: user.id,
          reviewedAt: nowSql(),
        })
        .where(eq(imageRevisions.id, id));
      await writeLog({
        productId: rev.productId,
        productName: rev.productName,
        action: "rollback",
        field: rev.field,
        fromUrl: rev.afterUrl,
        toUrl: rev.beforeUrl,
        revisionId: rev.id,
        actorId: user.id,
      });
      restored++;
    }
    return NextResponse.json({ ok: true, restored });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}

import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, like, ne, or, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { productImageAudit } from "@/server/db/schema";
import { requireStaff } from "@/server/services/authz";

export const dynamic = "force-dynamic";

const PAGE = 25;

type AuditStatus = "ok" | "placeholder" | "duplicate" | "missing" | "broken" | "unknown";

export async function GET(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const kind = req.nextUrl.searchParams.get("kind") ?? "list";

  if (kind === "summary") {
    const statusCounts = await db
      .select({
        status: productImageAudit.status,
        count: sql<number>`count(*)`,
      })
      .from(productImageAudit)
      .groupBy(productImageAudit.status);

    const counts: Record<string, number> = {
      ok: 0,
      placeholder: 0,
      duplicate: 0,
      missing: 0,
      broken: 0,
      unknown: 0,
    };
    let total = 0;
    for (const sc of statusCounts) {
      counts[sc.status] = Number(sc.count);
      total += Number(sc.count);
    }
    return NextResponse.json({
      total,
      counts,
      withMedicine: counts.ok || 0,
    });
  }

  const status = (req.nextUrl.searchParams.get("status") ?? "all").trim();
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  const page = Math.max(0, Number(req.nextUrl.searchParams.get("page") ?? 0) || 0);

  const filters = [];
  if (status === "all") {
    filters.push(ne(productImageAudit.status, "ok"));
  } else {
    filters.push(eq(productImageAudit.status, status));
  }
  if (q) {
    filters.push(
      or(
        like(productImageAudit.productName, `%${q}%`),
        like(productImageAudit.productId, `%${q}%`),
      )!,
    );
  }

  const where = and(...filters);

  const [rows, countRows] = await Promise.all([
    db
      .select()
      .from(productImageAudit)
      .where(where)
      .orderBy(asc(productImageAudit.productName))
      .limit(PAGE)
      .offset(page * PAGE),
    db
      .select({ count: sql<number>`count(*)` })
      .from(productImageAudit)
      .where(where),
  ]);

  const items = rows.map((r) => ({
    id: r.productId,
    name: r.productName,
    en: r.productName,
    imageUrl: r.boxUrl,
    medicineImageUrl: r.medicineUrl,
    status: r.status as AuditStatus,
  }));

  return NextResponse.json({
    items,
    count: Number(countRows[0]?.count ?? 0),
    page,
    pageSize: PAGE,
  });
}

export async function POST(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { action?: string };
  if (body.action !== "rescan") {
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

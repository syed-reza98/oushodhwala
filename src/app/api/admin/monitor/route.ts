import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { and, count, desc, eq, gte, inArray, ne, sql } from "drizzle-orm";
import { db, pool } from "@/server/db";
import {
  deliveries,
  errorLogs,
  orders,
  products,
  profiles,
  purchaseOrders,
  riders,
  stockAlerts,
  suppliers,
} from "@/server/db/schema";
import { requireStaff } from "@/server/services/authz";

export const dynamic = "force-dynamic";

async function dbSizeMb(): Promise<string> {
  try {
    const [rows] = await pool.query(
      `SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS mb
       FROM information_schema.tables
       WHERE table_schema = DATABASE()`,
    );
    const first = (rows as { mb?: string | number }[])[0];
    return first?.mb != null ? `${first.mb} MB` : "—";
  } catch {
    return "—";
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const kind = req.nextUrl.searchParams.get("kind") ?? "stats";
  const dayAgo = new Date(Date.now() - 24 * 3600e3).toISOString().slice(0, 23).replace("T", " ");
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayTs = todayStart.toISOString().slice(0, 23).replace("T", " ");
  const d30 = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 23).replace("T", " ");

  if (kind === "errors") {
    const rows = await db
      .select()
      .from(errorLogs)
      .orderBy(desc(errorLogs.createdAt))
      .limit(60);
    return NextResponse.json({
      items: rows.map((e) => ({
        id: e.id,
        message: e.message,
        source: e.source,
        path: e.path,
        severity: e.severity,
        createdAt: e.createdAt,
      })),
    });
  }

  if (kind === "alerts") {
    const rows = await db
      .select()
      .from(stockAlerts)
      .orderBy(desc(stockAlerts.createdAt))
      .limit(50);
    return NextResponse.json({
      items: rows.map((a) => ({
        id: a.id,
        kind: a.kind,
        ref: a.ref,
        productId: a.productId,
        productName: a.productName,
        detail: a.detail,
        createdAt: a.createdAt,
      })),
    });
  }

  const [
    [productsTotal],
    [productsActive],
    activeProducts,
    [ordersTotal],
    [ordersToday],
    [ordersPending],
    [revenue30],
    [customers],
    [ridersActive],
    [deliveriesOpen],
    [suppliersActive],
    [poOpen],
    [errors24],
    [alerts24],
  ] = await Promise.all([
    db.select({ c: count() }).from(products),
    db.select({ c: count() }).from(products).where(eq(products.active, true)),
    db
      .select({
        id: products.id,
        stock: products.stock,
        lowStockThreshold: products.lowStockThreshold,
        imageUrl: products.imageUrl,
      })
      .from(products)
      .where(eq(products.active, true)),
    db.select({ c: count() }).from(orders),
    db.select({ c: count() }).from(orders).where(gte(orders.createdAt, todayTs)),
    db
      .select({ c: count() })
      .from(orders)
      .where(inArray(orders.status, ["confirmed", "processing", "shipped"])),
    db
      .select({ s: sql<string>`coalesce(sum(${orders.total}), 0)` })
      .from(orders)
      .where(and(ne(orders.status, "cancelled"), gte(orders.createdAt, d30))),
    db.select({ c: count() }).from(profiles),
    db.select({ c: count() }).from(riders).where(eq(riders.active, true)),
    db
      .select({ c: count() })
      .from(deliveries)
      .where(sql`${deliveries.status} NOT IN ('delivered','failed','cancelled')`),
    db.select({ c: count() }).from(suppliers).where(eq(suppliers.active, true)),
    db
      .select({ c: count() })
      .from(purchaseOrders)
      .where(ne(purchaseOrders.status, "received")),
    db.select({ c: count() }).from(errorLogs).where(gte(errorLogs.createdAt, dayAgo)),
    db.select({ c: count() }).from(stockAlerts).where(gte(stockAlerts.createdAt, dayAgo)),
  ]);

  let noImage = 0;
  let lowStock = 0;
  let outOfStock = 0;
  for (const p of activeProducts) {
    if (!p.imageUrl || !String(p.imageUrl).trim()) noImage++;
    if (p.stock <= 0) outOfStock++;
    else if (p.stock <= Math.max(p.lowStockThreshold ?? 0, 0)) lowStock++;
  }

  const size = await dbSizeMb();

  return NextResponse.json({
    products: Number(productsTotal?.c ?? 0),
    products_active: Number(productsActive?.c ?? 0),
    products_no_image: noImage,
    low_stock: lowStock,
    out_of_stock: outOfStock,
    orders: Number(ordersTotal?.c ?? 0),
    orders_today: Number(ordersToday?.c ?? 0),
    orders_pending: Number(ordersPending?.c ?? 0),
    revenue_30d: Number(revenue30?.s ?? 0),
    customers: Number(customers?.c ?? 0),
    riders_active: Number(ridersActive?.c ?? 0),
    deliveries_open: Number(deliveriesOpen?.c ?? 0),
    suppliers: Number(suppliersActive?.c ?? 0),
    po_open: Number(poOpen?.c ?? 0),
    batches: 0,
    expiring_60d: 0,
    expired: 0,
    errors_24h: Number(errors24?.c ?? 0),
    alerts_24h: Number(alerts24?.c ?? 0),
    db_size: size,
    server_time: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const body = (await req.json()) as { action?: string };
  if (body.action !== "run_alerts") {
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }

  const dayAgo = new Date(Date.now() - 24 * 3600e3).toISOString().slice(0, 23).replace("T", " ");
  const recent = await db
    .select({ productId: stockAlerts.productId, kind: stockAlerts.kind })
    .from(stockAlerts)
    .where(gte(stockAlerts.createdAt, dayAgo));
  const seen = new Set(recent.map((r) => `${r.kind}:${r.productId}`));

  const active = await db
    .select({
      id: products.id,
      name: products.name,
      stock: products.stock,
      lowStockThreshold: products.lowStockThreshold,
    })
    .from(products)
    .where(eq(products.active, true));

  let created = 0;
  for (const p of active) {
    const threshold = Math.max(p.lowStockThreshold ?? 0, 0);
    if (p.stock > threshold) continue;
    const kind = p.stock <= 0 ? "out_of_stock" : "low_stock";
    const key = `${kind}:${p.id}`;
    if (seen.has(key)) continue;
    await db.insert(stockAlerts).values({
      id: randomUUID(),
      kind,
      ref: p.id,
      productId: p.id,
      productName: p.name,
      detail:
        p.stock <= 0
          ? `${p.name} — স্টক শেষ`
          : `${p.name} — স্টক ${p.stock} (সীমা ${threshold})`,
    });
    seen.add(key);
    created++;
  }

  return NextResponse.json({ ok: true, created });
}

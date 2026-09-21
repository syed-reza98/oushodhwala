import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/server/db";
import { orderItems, orders, products } from "@/server/db/schema";
import { requireStaff } from "@/server/services/authz";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const today = new Date();
  const defaultFrom = new Date(today.getTime() - 29 * 864e5).toISOString().slice(0, 10);
  const defaultTo = today.toISOString().slice(0, 10);
  const from = (req.nextUrl.searchParams.get("from") ?? defaultFrom).trim();
  const to = (req.nextUrl.searchParams.get("to") ?? defaultTo).trim();

  const fromTs = `${from} 00:00:00.000`;
  const toTs = `${to} 23:59:59.999`;

  const orderRows = await db
    .select({
      id: orders.id,
      orderNo: orders.orderNo,
      createdAt: orders.createdAt,
      total: orders.total,
      status: orders.status,
      paymentMethod: orders.paymentMethod,
      paymentStatus: orders.paymentStatus,
    })
    .from(orders)
    .where(and(gte(orders.createdAt, fromTs), lte(orders.createdAt, toTs)))
    .orderBy(asc(orders.createdAt));

  const orderIds = orderRows.map((o) => o.id);
  let itemRows: {
    name: string;
    qty: number;
    price: string;
    orderId: string;
    orderStatus: string;
  }[] = [];

  if (orderIds.length > 0) {
    const rows = await db
      .select({
        name: orderItems.name,
        qty: orderItems.qty,
        unitPrice: orderItems.unitPrice,
        orderId: orderItems.orderId,
        orderStatus: orders.status,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(gte(orders.createdAt, fromTs), lte(orders.createdAt, toTs)))
      .limit(5000);
    itemRows = rows.map((r) => ({
      name: r.name,
      qty: r.qty,
      price: r.unitPrice,
      orderId: r.orderId,
      orderStatus: r.orderStatus,
    }));
  }

  const productRows = await db
    .select({
      id: products.id,
      name: products.name,
      brand: products.brand,
      stock: products.stock,
      lowStockThreshold: products.lowStockThreshold,
      price: products.price,
    })
    .from(products)
    .where(and(eq(products.active, true), lte(products.stock, 20)))
    .orderBy(asc(products.stock))
    .limit(200);

  const lowStock = productRows.filter(
    (p) => Number(p.stock) <= Number(p.lowStockThreshold ?? 10),
  );

  return NextResponse.json({
    from,
    to,
    orders: orderRows.map((o) => ({
      orderNo: o.orderNo,
      createdAt: o.createdAt,
      total: Number(o.total),
      status: o.status,
      paymentMethod: o.paymentMethod ?? "",
      paymentStatus: o.paymentStatus ?? "pending",
    })),
    items: itemRows.map((i) => ({
      name: i.name,
      qty: i.qty,
      price: Number(i.price),
      orderStatus: i.orderStatus,
    })),
    lowStock: lowStock.map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand ?? "",
      stock: p.stock,
      lowStockThreshold: p.lowStockThreshold,
      price: Number(p.price),
    })),
  });
}

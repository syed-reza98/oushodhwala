import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { orderEvents, orderItems, orders } from "@/server/db/schema";

export const dynamic = "force-dynamic";

/** Public order status by order number (no PII beyond status + totals). */
export async function GET(req: NextRequest) {
  const no = req.nextUrl.searchParams.get("no")?.trim();
  if (!no) {
    return NextResponse.json({ error: "order number required" }, { status: 400 });
  }

  const [order] = await db.select().from(orders).where(eq(orders.orderNo, no)).limit(1);
  if (!order) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const [items, events] = await Promise.all([
    db
      .select({
        name: orderItems.name,
        qty: orderItems.qty,
        lineTotal: orderItems.lineTotal,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id)),
    db
      .select()
      .from(orderEvents)
      .where(eq(orderEvents.orderId, order.id))
      .orderBy(asc(orderEvents.createdAt)),
  ]);

  return NextResponse.json({
    orderNo: order.orderNo,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    total: Number(order.total),
    createdAt: order.createdAt,
    items: items.map((i) => ({
      name: i.name,
      qty: i.qty,
      lineTotal: Number(i.lineTotal),
    })),
    events: events.map((e) => ({
      id: e.id,
      status: e.status,
      note: e.note,
      createdAt: e.createdAt,
    })),
  });
}

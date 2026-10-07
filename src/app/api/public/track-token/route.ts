import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { orderItems, orders, deliveries } from "@/server/db/schema";

export const dynamic = "force-dynamic";

/** Public delivery track by share token (orders.public_token). */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ found: false, reason: "invalid" }, { status: 400 });
  }

  const [order] = await db.select().from(orders).where(eq(orders.publicToken, token)).limit(1);
  if (!order) {
    return NextResponse.json({ found: false, reason: "invalid" });
  }

  const [items, [delivery]] = await Promise.all([
    db
      .select({ name: orderItems.name, qty: orderItems.qty })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id)),
    db
      .select()
      .from(deliveries)
      .where(eq(deliveries.orderId, order.id))
      .limit(1),
  ]);

  const name = order.customerName?.trim() || "";
  const masked = name ? `${name.slice(0, 3)}***` : "";

  return NextResponse.json({
    found: true,
    order_no: order.orderNo,
    status: order.status,
    payment_method: order.paymentMethod,
    payment_status: order.paymentStatus,
    total: Number(order.total),
    customer_name: masked,
    created_at: order.createdAt,
    items,
    delivery: delivery
      ? {
          status: delivery.status,
          etaMinutes: delivery.etaMinutes,
          lastLat: delivery.lastLat != null ? Number(delivery.lastLat) : null,
          lastLng: delivery.lastLng != null ? Number(delivery.lastLng) : null,
          lastSeenAt: delivery.lastSeenAt,
          destLat: order.lat != null ? Number(order.lat) : null,
          destLng: order.lng != null ? Number(order.lng) : null,
        }
      : null,
  });
}

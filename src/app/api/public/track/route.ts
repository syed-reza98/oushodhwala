import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { deliveries, deliveryEvents, orderEvents, orderItems, orders, riders } from "@/server/db/schema";

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

  const [items, events, [delivery]] = await Promise.all([
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
    db
      .select()
      .from(deliveries)
      .where(eq(deliveries.orderId, order.id))
      .limit(1),
  ]);

  let riderInfo: { name: string; phone: string; vehicle: string } | null = null;
  let devEvents: { id: string; status: string; note: string; createdAt: string }[] = [];
  let otp: string | null = null;
  let podInfo: { photoUrl?: string; signatureUrl?: string; receiverName?: string } | null = null;

  if (delivery) {
    const meta = (delivery.note && delivery.note.startsWith("{") ? JSON.parse(delivery.note) : null) as {
      otp?: string;
      podPhotoUrl?: string;
      podSignatureUrl?: string;
      podReceiverName?: string;
    } | null;

    otp = meta?.otp || (delivery.id ? String(parseInt(delivery.id.replace(/\D/g, ""), 10) % 9000 + 1000) : "1234");
    if (meta?.podPhotoUrl || meta?.podSignatureUrl || meta?.podReceiverName) {
      podInfo = {
        photoUrl: meta.podPhotoUrl,
        signatureUrl: meta.podSignatureUrl,
        receiverName: meta.podReceiverName,
      };
    }

    if (delivery.riderId) {
      const [r] = await db.select().from(riders).where(eq(riders.id, delivery.riderId)).limit(1);
      if (r) {
        riderInfo = { name: r.name, phone: r.phone, vehicle: r.vehicle };
      }
    }

    const dEvs = await db
      .select()
      .from(deliveryEvents)
      .where(eq(deliveryEvents.deliveryId, delivery.id))
      .orderBy(asc(deliveryEvents.createdAt));

    devEvents = dEvs.map((e) => ({
      id: e.id,
      status: e.status,
      note: e.note,
      createdAt: e.createdAt,
    }));
  }

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
    delivery: delivery
      ? {
          status: delivery.status,
          etaMinutes: delivery.etaMinutes,
          lastLat: delivery.lastLat != null ? Number(delivery.lastLat) : null,
          lastLng: delivery.lastLng != null ? Number(delivery.lastLng) : null,
          lastSeenAt: delivery.lastSeenAt,
          rider: riderInfo,
          events: devEvents,
          otp,
          pod: podInfo,
        }
      : null,
  });
}

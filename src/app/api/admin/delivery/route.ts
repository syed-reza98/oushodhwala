import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { deliveries, deliveryEvents, deliveryNotifications, orderEvents, orders, riders } from "@/server/db/schema";
import { requireStaff } from "@/server/services/authz";

export const dynamic = "force-dynamic";

const OPEN_STATUSES = ["pending", "confirmed", "processing", "shipped"] as const;

const STATUS_NOTE: Record<string, string> = {
  assigned: "রাইডার অ্যাসাইন করা হয়েছে",
  picked_up: "পণ্য তোলা হয়েছে",
  in_transit: "ডেলিভারি চলছে",
  delivered: "ডেলিভারি সম্পন্ন",
  failed: "ডেলিভারি ব্যর্থ",
  cancelled: "ডেলিভারি বাতিল",
};

async function logEvent(args: {
  deliveryId: string;
  status: string;
  note?: string;
  lat?: number | null;
  lng?: number | null;
  actor?: string;
}) {
  await db.insert(deliveryEvents).values({
    id: randomUUID(),
    deliveryId: args.deliveryId,
    status: args.status,
    note: (args.note ?? "").trim() || STATUS_NOTE[args.status] || args.status,
    lat: args.lat != null ? String(args.lat) : null,
    lng: args.lng != null ? String(args.lng) : null,
    actor: args.actor ?? "staff",
  });
}

export async function GET(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const deliveryId = (req.nextUrl.searchParams.get("deliveryId") ?? "").trim();

  if (deliveryId) {
    const events = await db
      .select()
      .from(deliveryEvents)
      .where(eq(deliveryEvents.deliveryId, deliveryId))
      .orderBy(asc(deliveryEvents.createdAt));
    return NextResponse.json({
      events: events.map((e) => ({
        id: e.id,
        status: e.status,
        note: e.note,
        lat: e.lat != null ? Number(e.lat) : null,
        lng: e.lng != null ? Number(e.lng) : null,
        actor: e.actor,
        createdAt: e.createdAt,
      })),
    });
  }

  const [riderRows, deliveryRows, openOrders] = await Promise.all([
    db.select().from(riders).orderBy(desc(riders.createdAt)).limit(100),
    db.select().from(deliveries).orderBy(desc(deliveries.updatedAt)).limit(100),
    db
      .select({
        id: orders.id,
        orderNo: orders.orderNo,
        status: orders.status,
        customerName: orders.customerName,
        customerPhone: orders.customerPhone,
        deliveryAddress: orders.deliveryAddress,
        userId: orders.userId,
        total: orders.total,
      })
      .from(orders)
      .where(inArray(orders.status, [...OPEN_STATUSES]))
      .orderBy(desc(orders.createdAt))
      .limit(50),
  ]);

  const riderMap = new Map(riderRows.map((r) => [r.id, r]));
  const deliveryIds = deliveryRows.map((d) => d.id);
  const eventRows =
    deliveryIds.length > 0
      ? await db
          .select()
          .from(deliveryEvents)
          .where(inArray(deliveryEvents.deliveryId, deliveryIds))
          .orderBy(desc(deliveryEvents.createdAt))
          .limit(400)
      : [];

  const latestByDelivery = new Map<string, (typeof eventRows)[number]>();
  for (const e of eventRows) {
    if (!latestByDelivery.has(e.deliveryId)) latestByDelivery.set(e.deliveryId, e);
  }

  return NextResponse.json({
    riders: riderRows.map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      vehicle: r.vehicle,
      zone: r.zone,
      active: r.active,
      lastLat: r.lastLat != null ? Number(r.lastLat) : null,
      lastLng: r.lastLng != null ? Number(r.lastLng) : null,
      lastSeenAt: r.lastSeenAt,
    })),
    deliveries: deliveryRows.map((d) => {
      const rider = d.riderId ? riderMap.get(d.riderId) : undefined;
      const last = latestByDelivery.get(d.id);
      return {
        id: d.id,
        orderId: d.orderId,
        orderNo: d.orderNo,
        status: d.status,
        etaMinutes: d.etaMinutes,
        riderId: d.riderId,
        riderName: rider?.name ?? null,
        riderPhone: rider?.phone ?? null,
        lastLat: d.lastLat != null ? Number(d.lastLat) : null,
        lastLng: d.lastLng != null ? Number(d.lastLng) : null,
        lastSeenAt: d.lastSeenAt,
        assignedAt: d.assignedAt,
        lastEvent: last
          ? { status: last.status, note: last.note, createdAt: last.createdAt }
          : null,
      };
    }),
    openOrders: openOrders.map((o) => ({
      id: o.id,
      orderNo: o.orderNo,
      status: o.status,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      deliveryAddress: o.deliveryAddress,
      userId: o.userId,
      total: Number(o.total),
    })),
  });
}

export async function POST(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const body = (await req.json()) as {
    action?: "rider" | "ping";
    name?: string;
    phone?: string;
    vehicle?: string;
    zone?: string;
    riderId?: string;
    lat?: number;
    lng?: number;
  };

  if (body.action === "ping") {
    if (!body.riderId || body.lat == null || body.lng == null) {
      return NextResponse.json({ error: "riderId, lat, lng required" }, { status: 400 });
    }
    const now = new Date().toISOString().slice(0, 23).replace("T", " ");
    await db
      .update(riders)
      .set({
        lastLat: String(body.lat),
        lastLng: String(body.lng),
        lastSeenAt: now,
      })
      .where(eq(riders.id, body.riderId));
    const active = await db
      .select({ id: deliveries.id, status: deliveries.status })
      .from(deliveries)
      .where(eq(deliveries.riderId, body.riderId))
      .limit(20);
    await db
      .update(deliveries)
      .set({
        lastLat: String(body.lat),
        lastLng: String(body.lng),
        lastSeenAt: now,
      })
      .where(eq(deliveries.riderId, body.riderId));
    for (const d of active.filter((x) => !["delivered", "cancelled", "failed"].includes(x.status))) {
      await logEvent({
        deliveryId: d.id,
        status: d.status || "in_transit",
        note: "লোকেশন আপডেট",
        lat: body.lat,
        lng: body.lng,
        actor: "rider",
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  const id = randomUUID();
  await db.insert(riders).values({
    id,
    name: body.name.trim(),
    phone: body.phone?.trim() || "",
    vehicle: body.vehicle?.trim() || "bike",
    zone: body.zone?.trim() || "",
    active: true,
  });
  return NextResponse.json({ ok: true, id });
}

export async function PATCH(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const body = (await req.json()) as {
    action?: "assign" | "toggle_rider" | "status";
    orderId?: string;
    riderId?: string;
    etaMinutes?: number;
    id?: string;
    active?: boolean;
    status?: string;
    deliveryId?: string;
    note?: string;
  };

  if (body.action === "toggle_rider" && body.id) {
    await db.update(riders).set({ active: !!body.active }).where(eq(riders.id, body.id));
    return NextResponse.json({ ok: true });
  }

  if (body.action === "status" && body.deliveryId && body.status) {
    const [d] = await db
      .select()
      .from(deliveries)
      .where(eq(deliveries.id, body.deliveryId))
      .limit(1);
    if (!d) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    await db
      .update(deliveries)
      .set({ status: body.status })
      .where(eq(deliveries.id, body.deliveryId));
    await logEvent({
      deliveryId: body.deliveryId,
      status: body.status,
      note: body.note,
      actor: "staff",
    });

    // Mirror key statuses onto the order + order timeline
    if (body.status === "delivered" || body.status === "in_transit" || body.status === "picked_up") {
      const orderStatus =
        body.status === "delivered" ? "delivered" : body.status === "picked_up" ? "shipped" : "shipped";
      await db.update(orders).set({ status: orderStatus }).where(eq(orders.id, d.orderId));
      await db.insert(orderEvents).values({
        id: randomUUID(),
        orderId: d.orderId,
        status: orderStatus,
        note: STATUS_NOTE[body.status] || body.status,
      });
    }

    if (d.userId) {
      await db.insert(deliveryNotifications).values({
        id: randomUUID(),
        deliveryId: d.id,
        orderNo: d.orderNo,
        userId: d.userId,
        channel: "app",
        target: "",
        statusKey: body.status,
        body: STATUS_NOTE[body.status] || body.status,
        status: "sent",
        sentAt: new Date().toISOString().slice(0, 23).replace("T", " "),
      });
    }

    return NextResponse.json({ ok: true });
  }

  // assign rider to order
  if (!body.orderId || !body.riderId) {
    return NextResponse.json({ error: "orderId and riderId required" }, { status: 400 });
  }

  const [order] = await db.select().from(orders).where(eq(orders.id, body.orderId)).limit(1);
  if (!order) return NextResponse.json({ error: "ORDER_NOT_FOUND" }, { status: 404 });

  const [rider] = await db.select().from(riders).where(eq(riders.id, body.riderId)).limit(1);
  if (!rider || !rider.active) {
    return NextResponse.json({ error: "RIDER_NOT_FOUND" }, { status: 404 });
  }

  const now = new Date().toISOString().slice(0, 23).replace("T", " ");
  const [existing] = await db
    .select()
    .from(deliveries)
    .where(eq(deliveries.orderId, order.id))
    .limit(1);

  let deliveryId = existing?.id;
  if (existing) {
    await db
      .update(deliveries)
      .set({
        riderId: rider.id,
        status: "assigned",
        etaMinutes: body.etaMinutes ?? 45,
        assignedAt: now,
        orderNo: order.orderNo,
      })
      .where(eq(deliveries.id, existing.id));
  } else {
    deliveryId = randomUUID();
    await db.insert(deliveries).values({
      id: deliveryId,
      orderId: order.id,
      orderNo: order.orderNo,
      userId: order.userId,
      riderId: rider.id,
      status: "assigned",
      etaMinutes: body.etaMinutes ?? 45,
      assignedAt: now,
    });
  }

  await logEvent({
    deliveryId: deliveryId!,
    status: "assigned",
    note: `${rider.name} অ্যাসাইন`,
    actor: "staff",
  });
  await db.update(orders).set({ status: "shipped" }).where(eq(orders.id, order.id));
  await db.insert(orderEvents).values({
    id: randomUUID(),
    orderId: order.id,
    status: "shipped",
    note: "ডেলিভারিম্যান অ্যাসাইন",
  });

  return NextResponse.json({ ok: true, id: deliveryId });
}

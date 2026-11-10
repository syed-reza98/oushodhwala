import { NextResponse } from "next/server";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { orderEvents, orders, prescriptions } from "@/server/db/schema";
import { requireUser } from "@/server/services/authz";

export const dynamic = "force-dynamic";

export async function GET() {
  let user: { id: string };
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const rxRows = await db
    .select({
      id: prescriptions.id,
      status: prescriptions.status,
      note: prescriptions.note,
      createdAt: prescriptions.createdAt,
      updatedAt: prescriptions.updatedAt,
    })
    .from(prescriptions)
    .where(eq(prescriptions.userId, user.id))
    .orderBy(desc(prescriptions.createdAt))
    .limit(50);

  const userOrders = await db
    .select({ id: orders.id, orderNo: orders.orderNo })
    .from(orders)
    .where(eq(orders.userId, user.id))
    .orderBy(desc(orders.createdAt))
    .limit(50);

  const orderIds = userOrders.map((o) => o.id);
  const orderNoById = new Map(userOrders.map((o) => [o.id, o.orderNo]));

  const eventRows =
    orderIds.length === 0
      ? []
      : await db
          .select({
            id: orderEvents.id,
            orderId: orderEvents.orderId,
            status: orderEvents.status,
            note: orderEvents.note,
            createdAt: orderEvents.createdAt,
          })
          .from(orderEvents)
          .where(inArray(orderEvents.orderId, orderIds))
          .orderBy(desc(orderEvents.createdAt))
          .limit(50);

  return NextResponse.json({
    prescriptions: rxRows.map((r) => ({
      id: r.id,
      status: r.status,
      note: r.note,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      kind: "prescription" as const,
    })),
    orderEvents: eventRows.map((e) => ({
      id: e.id,
      orderId: e.orderId,
      orderNo: orderNoById.get(e.orderId) ?? "",
      status: e.status,
      note: e.note,
      createdAt: e.createdAt,
      kind: "order_event" as const,
    })),
  });
}

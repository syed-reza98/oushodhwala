"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { auth } from "@/server/auth/config";
import { db } from "@/server/db";
import { orderEvents, orderItems, orderReturns, orders, products } from "@/server/db/schema";

export type PlaceOrderItem = {
  id: string;
  kind: string;
  name: string;
  price: number;
  qty: number;
};

export type PlaceOrderInput = {
  items: PlaceOrderItem[];
  customerName: string;
  phone: string;
  address: string;
  slot: string;
  deliveryFee: number;
  discount: number;
  paymentMethod: string;
  paymentRef?: string;
};

function orderNo() {
  const n = Date.now().toString().slice(-8);
  return `OW${n}`;
}

export async function placeOrder(input: PlaceOrderInput) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("AUTH_REQUIRED");
  }
  if (!input.items.length) throw new Error("EMPTY_CART");

  const productLines = input.items.filter((i) => i.kind === "product");
  for (const line of productLines) {
    const [row] = await db
      .select({ stock: products.stock, name: products.name })
      .from(products)
      .where(and(eq(products.id, line.id), eq(products.active, true)))
      .limit(1);
    if (!row || row.stock < line.qty) {
      throw new Error(`OUT_OF_STOCK:${row?.name ?? line.name}:${row?.stock ?? 0}`);
    }
  }

  const subtotal = input.items.reduce((s, i) => s + i.price * i.qty, 0);
  const total = Math.max(0, subtotal - input.discount + input.deliveryFee);
  const id = randomUUID();
  const no = orderNo();
  const publicToken = randomBytes(9).toString("hex");

  await db.transaction(async (tx) => {
    await tx.insert(orders).values({
      id,
      orderNo: no,
      userId: session.user!.id,
      status: "confirmed",
      paymentMethod: input.paymentMethod,
      paymentStatus: input.paymentMethod === "cod" ? "pending" : "paid",
      subtotal: String(subtotal),
      discount: String(input.discount),
      deliveryFee: String(input.deliveryFee),
      total: String(total),
      customerName: input.customerName,
      customerPhone: input.phone,
      deliveryAddress: input.address,
      notes: input.slot,
      meta: input.paymentRef ? { paymentRef: input.paymentRef } : null,
      publicToken,
    });

    for (const line of input.items) {
      await tx.insert(orderItems).values({
        id: randomUUID(),
        orderId: id,
        productId: line.kind === "product" ? line.id : null,
        name: line.name,
        qty: line.qty,
        unitPrice: String(line.price),
        lineTotal: String(line.price * line.qty),
      });
      if (line.kind === "product") {
        await tx
          .update(products)
          .set({ stock: sql`${products.stock} - ${line.qty}` })
          .where(eq(products.id, line.id));
      }
    }

    await tx.insert(orderEvents).values({
      id: randomUUID(),
      orderId: id,
      status: "confirmed",
      note: "অর্ডার গ্রহণ করা হয়েছে",
    });
  });

  return { order_no: no, order_id: id, total, public_token: publicToken };
}

export async function listMyOrders() {
  const session = await auth();
  if (!session?.user?.id) return [];
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, session.user.id))
    .orderBy(desc(orders.createdAt))
    .limit(50);

  const result = [];
  for (const o of rows) {
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, o.id));
    const events = await db
      .select()
      .from(orderEvents)
      .where(eq(orderEvents.orderId, o.id))
      .orderBy(desc(orderEvents.createdAt));
    result.push({
      ...o,
      order_items: items,
      order_events: events.map((e) => ({
        id: e.id,
        status: e.status,
        note: e.note,
        created_at: e.createdAt,
      })),
    });
  }
  return result;
}

export async function countMyOrders() {
  const session = await auth();
  if (!session?.user?.id) return 0;
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(orders)
    .where(eq(orders.userId, session.user.id));
  return Number(row?.count ?? 0);
}

export async function cancelMyOrder(orderNo: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("AUTH_REQUIRED");
  const [row] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.orderNo, orderNo), eq(orders.userId, session.user.id)))
    .limit(1);
  if (!row) throw new Error("NOT_FOUND");
  if (["shipped", "delivered", "cancelled"].includes(row.status)) {
    throw new Error("CANNOT_CANCEL");
  }
  await db.update(orders).set({ status: "cancelled" }).where(eq(orders.id, row.id));
  await db.insert(orderEvents).values({
    id: randomUUID(),
    orderId: row.id,
    status: "cancelled",
    note: "গ্রাহক বাতিল করেছেন",
  });
  return { ok: true };
}

export async function submitOrderReturn(input: {
  orderId: string;
  orderNo: string;
  reason: string;
  details?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("AUTH_REQUIRED");
  if (!input.reason?.trim()) throw new Error("REASON_REQUIRED");

  const [row] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, input.orderId), eq(orders.userId, session.user.id)))
    .limit(1);
  if (!row) throw new Error("NOT_FOUND");
  if (row.status !== "delivered") throw new Error("NOT_DELIVERED");

  const [existing] = await db
    .select({ id: orderReturns.id })
    .from(orderReturns)
    .where(
      and(
        eq(orderReturns.orderId, row.id),
        eq(orderReturns.userId, session.user.id),
        eq(orderReturns.status, "requested"),
      ),
    )
    .limit(1);
  if (existing) throw new Error("ALREADY_REQUESTED");

  const id = randomUUID();
  await db.insert(orderReturns).values({
    id,
    orderId: row.id,
    orderNo: row.orderNo,
    userId: session.user.id,
    reason: input.reason.trim(),
    details: input.details?.trim() || null,
    photoUrls: [],
    refundAmount: "0",
    status: "requested",
  });
  return { ok: true, id };
}

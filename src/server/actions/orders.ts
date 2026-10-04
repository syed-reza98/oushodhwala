"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { auth } from "@/server/auth/config";
import { db } from "@/server/db";
import { loyaltyAccounts, loyaltyTransactions, orderEvents, orderItems, orderReturns, orders, prescriptions, products } from "@/server/db/schema";

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
  usePoints?: boolean;
  prescriptionId?: string;
};

export type PlaceOrderResult =
  | {
      success: true;
      order_no: string;
      order_id: string;
      total: number;
      public_token: string;
    }
  | {
      success: false;
      error: string;
      productName?: string;
      stockLeft?: number;
    };

function orderNo() {
  const n = Date.now().toString().slice(-8);
  return `OW${n}`;
}

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "AUTH_REQUIRED" };
  }
  if (!input.items.length) {
    return { success: false, error: "EMPTY_CART" };
  }

  const productLines = input.items.filter((i) => i.kind === "product");

  const subtotal = input.items.reduce((s, i) => s + i.price * i.qty, 0);
  const id = randomUUID();
  const no = orderNo();
  const publicToken = randomBytes(9).toString("hex");

  let finalTotal = 0;
  let stockError: { productName: string; stockLeft: number } | null = null;

  try {
    await db.transaction(async (tx) => {
      // Atomic stock check and decrement to prevent race conditions & overselling
      for (const line of productLines) {
        const [res] = await tx
          .update(products)
          .set({ stock: sql`${products.stock} - ${line.qty}` })
          .where(
            and(
              eq(products.id, line.id),
              gte(products.stock, line.qty),
              eq(products.active, true),
            ),
          );

        const affected = (res as { affectedRows?: number })?.affectedRows ?? 0;
        if (affected === 0) {
          const [current] = await tx
            .select({ name: products.name, stock: products.stock })
            .from(products)
            .where(eq(products.id, line.id))
            .limit(1);
          stockError = {
            productName: current?.name ?? line.name,
            stockLeft: current?.stock ?? 0,
          };
          throw new Error("OUT_OF_STOCK_INTERNAL");
        }
      }

      // Check & redeem loyalty points if requested
      let pointCut = 0;
      if (input.usePoints) {
        const [acc] = await tx
          .select()
          .from(loyaltyAccounts)
          .where(eq(loyaltyAccounts.userId, session.user!.id))
          .limit(1);

        if (acc && acc.balance > 0) {
          const payableBeforePoints = Math.max(0, subtotal - input.discount + input.deliveryFee);
          pointCut = Math.min(acc.balance, Math.floor(payableBeforePoints * 0.5));
          if (pointCut > 0) {
            const nextBal = acc.balance - pointCut;
            await tx
              .update(loyaltyAccounts)
              .set({
                pointsSpent: acc.pointsSpent + pointCut,
                balance: nextBal,
                tier: nextBal >= 2000 ? "gold" : nextBal >= 500 ? "silver" : "bronze",
              })
              .where(eq(loyaltyAccounts.userId, session.user!.id));

            await tx.insert(loyaltyTransactions).values({
              id: randomUUID(),
              userId: session.user!.id,
              points: -pointCut,
              kind: "spend",
              orderNo: no,
              reason: `অর্ডারে পয়েন্ট ব্যবহার #${no}`,
            });
          }
        }
      }

      const totalDiscount = input.discount + pointCut;
      const total = Math.max(0, subtotal - totalDiscount + input.deliveryFee);
      finalTotal = total;

      // Award loyalty points for purchase (e.g. 1 point per ৳100 spent)
      const earnedPoints = Math.floor(total / 100);
      if (earnedPoints > 0) {
        const [acc] = await tx
          .select()
          .from(loyaltyAccounts)
          .where(eq(loyaltyAccounts.userId, session.user!.id))
          .limit(1);

        if (acc) {
          const nextBal = acc.balance + earnedPoints;
          await tx
            .update(loyaltyAccounts)
            .set({
              pointsEarned: acc.pointsEarned + earnedPoints,
              balance: nextBal,
              tier: nextBal >= 2000 ? "gold" : nextBal >= 500 ? "silver" : "bronze",
            })
            .where(eq(loyaltyAccounts.userId, session.user!.id));
        } else {
          await tx.insert(loyaltyAccounts).values({
            userId: session.user!.id,
            pointsEarned: earnedPoints,
            pointsSpent: 0,
            balance: earnedPoints,
            tier: earnedPoints >= 2000 ? "gold" : earnedPoints >= 500 ? "silver" : "bronze",
          });
        }

        await tx.insert(loyaltyTransactions).values({
          id: randomUUID(),
          userId: session.user!.id,
          points: earnedPoints,
          kind: "earn",
          orderNo: no,
          reason: `অর্ডার থেকে পয়েন্ট লাভ #${no}`,
        });
      }

      await tx.insert(orders).values({
        id,
        orderNo: no,
        userId: session.user!.id,
        status: "confirmed",
        paymentMethod: input.paymentMethod,
        paymentStatus: input.paymentMethod === "cod" ? "pending" : "paid",
        subtotal: String(subtotal),
        discount: String(totalDiscount),
        deliveryFee: String(input.deliveryFee),
        total: String(total),
        customerName: input.customerName,
        customerPhone: input.phone,
        deliveryAddress: input.address,
        notes: input.slot,
        meta: {
          ...(input.paymentRef ? { paymentRef: input.paymentRef } : {}),
          ...(pointCut > 0 ? { pointsRedeemed: pointCut } : {}),
          ...(earnedPoints > 0 ? { pointsEarned: earnedPoints } : {}),
          ...(input.prescriptionId ? { prescriptionId: input.prescriptionId } : {}),
        },
        publicToken,
      });

      if (input.prescriptionId) {
        await tx
          .update(prescriptions)
          .set({ status: "reviewing" })
          .where(eq(prescriptions.id, input.prescriptionId));
      }

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
      }

      await tx.insert(orderEvents).values({
        id: randomUUID(),
        orderId: id,
        status: "confirmed",
        note: "অর্ডার গ্রহণ করা হয়েছে",
      });
    });

    return {
      success: true,
      order_no: no,
      order_id: id,
      total: finalTotal,
      public_token: publicToken,
    };
  } catch (err: unknown) {
    if (stockError) {
      return {
        success: false,
        error: "OUT_OF_STOCK",
        productName: (stockError as { productName: string }).productName,
        stockLeft: (stockError as { stockLeft: number }).stockLeft,
      };
    }
    const msg = err instanceof Error ? err.message : "ORDER_CREATION_FAILED";
    console.error("placeOrder transaction error:", err);
    return { success: false, error: msg };
  }
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

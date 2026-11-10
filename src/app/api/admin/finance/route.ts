import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { desc, ne, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { expenses, orders, posSales } from "@/server/db/schema";
import { requireStaff } from "@/server/services/authz";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const [[onlineRow], [posRow], [posDueRow], [expenseRow], recentExpenses, recentOrders, recentPos] =
    await Promise.all([
      db
        .select({
          total: sql<string>`coalesce(sum(${orders.total}),0)`,
          count: sql<number>`count(*)`,
        })
        .from(orders)
        .where(ne(orders.status, "cancelled")),
      db
        .select({
          total: sql<string>`coalesce(sum(${posSales.total}),0)`,
          count: sql<number>`count(*)`,
        })
        .from(posSales),
      db
        .select({
          total: sql<string>`coalesce(sum(${posSales.due}),0)`,
        })
        .from(posSales),
      db
        .select({
          total: sql<string>`coalesce(sum(${expenses.amount}),0)`,
          count: sql<number>`count(*)`,
        })
        .from(expenses),
      db.select().from(expenses).orderBy(desc(expenses.paidAt)).limit(30),
      db
        .select({
          id: orders.id,
          orderNo: orders.orderNo,
          total: orders.total,
          status: orders.status,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .orderBy(desc(orders.createdAt))
        .limit(10),
      db.select().from(posSales).orderBy(desc(posSales.createdAt)).limit(10),
    ]);

  const onlineSales = Number(onlineRow?.total ?? 0);
  const posSalesTotal = Number(posRow?.total ?? 0);
  const posDue = Number(posDueRow?.total ?? 0);
  const expenseTotal = Number(expenseRow?.total ?? 0);

  return NextResponse.json({
    summary: {
      onlineSales,
      onlineCount: Number(onlineRow?.count ?? 0),
      posSales: posSalesTotal,
      posCount: Number(posRow?.count ?? 0),
      posDue,
      expenses: expenseTotal,
      expenseCount: Number(expenseRow?.count ?? 0),
      net: onlineSales + posSalesTotal - expenseTotal,
    },
    expenses: recentExpenses.map((e) => ({
      id: e.id,
      category: e.category,
      amount: Number(e.amount),
      note: e.note,
      paidAt: e.paidAt,
    })),
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      orderNo: o.orderNo,
      total: Number(o.total),
      status: o.status,
      createdAt: o.createdAt,
    })),
    recentPos: recentPos.map((s) => ({
      id: s.id,
      invoiceNo: s.invoiceNo,
      total: Number(s.total),
      due: Number(s.due),
      method: s.method,
      createdAt: s.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  let actorId: string | undefined;
  try {
    const user = await requireStaff();
    actorId = user.id;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const body = (await req.json()) as {
    category?: string;
    amount?: number;
    note?: string;
  };
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "positive amount required" }, { status: 400 });
  }

  const id = randomUUID();
  await db.insert(expenses).values({
    id,
    category: body.category?.trim() || "misc",
    amount: String(amount),
    note: body.note?.trim() || null,
    createdBy: actorId ?? null,
  });

  return NextResponse.json({ ok: true, id });
}

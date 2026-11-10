import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, lte, ne, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { expenses, orders, posSales, purchaseOrders } from "@/server/db/schema";
import { requireStaff } from "@/server/services/authz";

export const dynamic = "force-dynamic";

function defaultRange() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 7);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function dayBounds(from: string, to: string) {
  return {
    fromTs: `${from} 00:00:00.000`,
    toTs: `${to} 23:59:59.999`,
  };
}

export async function GET(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const sp = req.nextUrl.searchParams;
  const kind = (sp.get("kind") ?? "daybook").trim();
  const defaults = defaultRange();
  const from = (sp.get("from") ?? defaults.from).slice(0, 10);
  const to = (sp.get("to") ?? defaults.to).slice(0, 10);
  const { fromTs, toTs } = dayBounds(from, to);

  if (kind === "daybook") {
    const [expenseRows, posRows, orderRows] = await Promise.all([
      db
        .select()
        .from(expenses)
        .where(and(gte(expenses.paidAt, fromTs), lte(expenses.paidAt, toTs)))
        .orderBy(desc(expenses.paidAt))
        .limit(200),
      db
        .select()
        .from(posSales)
        .where(and(gte(posSales.createdAt, fromTs), lte(posSales.createdAt, toTs)))
        .orderBy(desc(posSales.createdAt))
        .limit(200),
      db
        .select({
          id: orders.id,
          orderNo: orders.orderNo,
          customerName: orders.customerName,
          total: orders.total,
          paymentMethod: orders.paymentMethod,
          status: orders.status,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(and(gte(orders.createdAt, fromTs), lte(orders.createdAt, toTs)))
        .orderBy(desc(orders.createdAt))
        .limit(200),
    ]);

    const orderTotal = orderRows.reduce((a, r) => a + Number(r.total), 0);
    const posTotal = posRows.reduce((a, r) => a + Number(r.total), 0);
    const expenseTotal = expenseRows.reduce((a, r) => a + Number(r.amount), 0);

    return NextResponse.json({
      kind: "daybook",
      from,
      to,
      summary: {
        orders: orderTotal,
        pos: posTotal,
        expenses: expenseTotal,
        net: orderTotal + posTotal - expenseTotal,
      },
      orders: orderRows.map((o) => ({
        id: o.id,
        no: o.orderNo,
        name: o.customerName,
        total: Number(o.total),
        method: o.paymentMethod,
        status: o.status,
        at: o.createdAt,
      })),
      pos: posRows.map((s) => ({
        id: s.id,
        no: s.invoiceNo,
        name: s.customerName,
        total: Number(s.total),
        method: s.method,
        at: s.createdAt,
      })),
      expenses: expenseRows.map((e) => ({
        id: e.id,
        category: e.category,
        amount: Number(e.amount),
        note: e.note,
        paidAt: e.paidAt,
      })),
    });
  }

  if (kind === "financials") {
    const [[onlineRow], [posRow], [posDueRow], [expenseRow], [purchaseRow]] = await Promise.all([
      db
        .select({
          total: sql<string>`coalesce(sum(${orders.total}),0)`,
          count: sql<number>`count(*)`,
        })
        .from(orders)
        .where(
          and(ne(orders.status, "cancelled"), gte(orders.createdAt, fromTs), lte(orders.createdAt, toTs)),
        ),
      db
        .select({
          total: sql<string>`coalesce(sum(${posSales.total}),0)`,
          count: sql<number>`count(*)`,
        })
        .from(posSales)
        .where(and(gte(posSales.createdAt, fromTs), lte(posSales.createdAt, toTs))),
      db
        .select({
          total: sql<string>`coalesce(sum(${posSales.due}),0)`,
        })
        .from(posSales)
        .where(and(gte(posSales.createdAt, fromTs), lte(posSales.createdAt, toTs))),
      db
        .select({
          total: sql<string>`coalesce(sum(${expenses.amount}),0)`,
          count: sql<number>`count(*)`,
        })
        .from(expenses)
        .where(and(gte(expenses.paidAt, fromTs), lte(expenses.paidAt, toTs))),
      db
        .select({
          total: sql<string>`coalesce(sum(${purchaseOrders.total}),0)`,
          count: sql<number>`count(*)`,
        })
        .from(purchaseOrders)
        .where(and(gte(purchaseOrders.createdAt, fromTs), lte(purchaseOrders.createdAt, toTs))),
    ]);

    const onlineSales = Number(onlineRow?.total ?? 0);
    const posSalesTotal = Number(posRow?.total ?? 0);
    const expensesTotal = Number(expenseRow?.total ?? 0);

    return NextResponse.json({
      kind: "financials",
      from,
      to,
      summary: {
        onlineSales,
        onlineCount: Number(onlineRow?.count ?? 0),
        posSales: posSalesTotal,
        posCount: Number(posRow?.count ?? 0),
        posDue: Number(posDueRow?.total ?? 0),
        expenses: expensesTotal,
        expenseCount: Number(expenseRow?.count ?? 0),
        purchases: Number(purchaseRow?.total ?? 0),
        purchaseCount: Number(purchaseRow?.count ?? 0),
        net: onlineSales + posSalesTotal - expensesTotal,
      },
    });
  }

  if (kind === "party") {
    const partyType = (sp.get("partyType") ?? "customer").trim();
    const id = (sp.get("id") ?? "").trim();
    if (!id) {
      return NextResponse.json({
        kind: "party",
        partyType,
        id: "",
        from,
        to,
        entries: [],
        hint: "Provide party id to load statement",
      });
    }

    if (partyType === "supplier") {
      const rows = await db
        .select()
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.supplierId, id),
            gte(purchaseOrders.createdAt, fromTs),
            lte(purchaseOrders.createdAt, toTs),
          ),
        )
        .orderBy(desc(purchaseOrders.createdAt))
        .limit(200);

      const total = rows.reduce((a, r) => a + Number(r.total), 0);
      return NextResponse.json({
        kind: "party",
        partyType: "supplier",
        id,
        from,
        to,
        total,
        rows: rows.map((po) => ({
          id: po.id,
          ref: po.poNo,
          detail: po.status,
          amount: Number(po.total),
          date: po.createdAt,
          supplierName: po.supplierName,
        })),
      });
    }

    // customer
    const rows = await db
      .select({
        id: orders.id,
        orderNo: orders.orderNo,
        total: orders.total,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(
        and(eq(orders.userId, id), gte(orders.createdAt, fromTs), lte(orders.createdAt, toTs)),
      )
      .orderBy(desc(orders.createdAt))
      .limit(200);

    const total = rows
      .filter((r) => r.status !== "cancelled")
      .reduce((a, r) => a + Number(r.total), 0);

    return NextResponse.json({
      kind: "party",
      partyType: "customer",
      id,
      from,
      to,
      total,
      rows: rows.map((o) => ({
        id: o.id,
        ref: o.orderNo,
        detail: o.status,
        amount: Number(o.total),
        paymentStatus: o.paymentStatus,
        date: o.createdAt,
      })),
    });
  }

  return NextResponse.json({ error: "unknown kind" }, { status: 400 });
}

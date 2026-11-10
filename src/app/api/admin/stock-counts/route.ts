import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import {
  products,
  stockCountItems,
  stockCounts,
  stockMovements,
} from "@/server/db/schema";
import { requireStaff } from "@/server/services/authz";

export const dynamic = "force-dynamic";

async function gate() {
  try {
    const user = await requireStaff();
    return { user } as const;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return {
      error: NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 }),
    } as const;
  }
}

export async function GET() {
  const g = await gate();
  if ("error" in g) return g.error;

  const counts = await db.select().from(stockCounts).orderBy(desc(stockCounts.createdAt)).limit(40);
  const ids = counts.map((c) => c.id);
  const items =
    ids.length > 0
      ? await db.select().from(stockCountItems).where(inArray(stockCountItems.countId, ids))
      : [];

  const itemsByCount = new Map<string, typeof items>();
  for (const it of items) {
    const list = itemsByCount.get(it.countId) ?? [];
    list.push(it);
    itemsByCount.set(it.countId, list);
  }

  return NextResponse.json({
    counts: counts.map((c) => ({
      id: c.id,
      countNo: c.countNo,
      status: c.status,
      note: c.note,
      branchId: c.branchId,
      createdBy: c.createdBy,
      appliedAt: c.appliedAt,
      createdAt: c.createdAt,
      items: (itemsByCount.get(c.id) ?? []).map((it) => ({
        id: it.id,
        productId: it.productId,
        productName: it.productName,
        systemQty: it.systemQty,
        countedQty: it.countedQty,
        note: it.note,
      })),
    })),
  });
}

export async function POST(req: NextRequest) {
  const g = await gate();
  if ("error" in g) return g.error;
  const actorId = g.user.id;

  const body = (await req.json()) as {
    action?: string;
    note?: string;
    items?: { productId?: string; countedQty?: number }[];
  };

  if ((body.action ?? "create") !== "create") {
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }

  const rawItems = (body.items ?? [])
    .map((it) => ({
      productId: (it.productId ?? "").trim(),
      countedQty: Math.max(0, Math.trunc(Number(it.countedQty) || 0)),
    }))
    .filter((it) => it.productId);

  if (rawItems.length === 0) {
    return NextResponse.json({ error: "NO_ITEMS" }, { status: 400 });
  }

  const productIds = [...new Set(rawItems.map((it) => it.productId))];
  const rows = await db.select().from(products).where(inArray(products.id, productIds));
  const byId = new Map(rows.map((p) => [p.id, p]));

  const id = randomUUID();
  const stamp = new Date();
  const countNo = `SC-${stamp.toISOString().slice(2, 10).replace(/-/g, "")}-${id.slice(0, 5).toUpperCase()}`;

  await db.transaction(async (tx) => {
    await tx.insert(stockCounts).values({
      id,
      countNo,
      status: "draft",
      note: (body.note ?? "").trim(),
      createdBy: actorId,
    });

    for (const it of rawItems) {
      const p = byId.get(it.productId);
      if (!p) continue;
      await tx.insert(stockCountItems).values({
        id: randomUUID(),
        countId: id,
        productId: p.id,
        productName: p.name,
        systemQty: p.stock,
        countedQty: it.countedQty,
        note: "",
      });
    }
  });

  return NextResponse.json({ ok: true, id, countNo });
}

export async function PATCH(req: NextRequest) {
  const g = await gate();
  if ("error" in g) return g.error;
  const actorId = g.user.id;

  const body = (await req.json()) as { action?: string; id?: string };
  if ((body.action ?? "apply") !== "apply") {
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }
  const countId = (body.id ?? "").trim();
  if (!countId) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const [count] = await db.select().from(stockCounts).where(eq(stockCounts.id, countId)).limit(1);
  if (!count) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (count.status === "applied") {
    return NextResponse.json({ error: "ALREADY_APPLIED" }, { status: 400 });
  }

  let applied = 0;
  try {
    await db.transaction(async (tx) => {
      const items = await tx.select().from(stockCountItems).where(eq(stockCountItems.countId, countId));
      for (const it of items) {
        if (it.countedQty === it.systemQty) continue;
        const next = Math.max(0, it.countedQty);
        const delta = next - it.systemQty;
        await tx.update(products).set({ stock: next }).where(eq(products.id, it.productId));
        await tx.insert(stockMovements).values({
          id: randomUUID(),
          productId: it.productId,
          productName: it.productName,
          change: delta,
          balance: next,
          kind: "count",
          ref: count.countNo,
          note: "ফিজিক্যাল কাউন্ট",
          actorId,
        });
        applied += 1;
      }
      await tx
        .update(stockCounts)
        .set({
          status: "applied",
          appliedAt: new Date().toISOString().slice(0, 23).replace("T", " "),
        })
        .where(eq(stockCounts.id, countId));
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "FAILED";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: countId, applied });
}

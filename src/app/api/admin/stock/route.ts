import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import {
  products,
  stockAdjustmentItems,
  stockAdjustments,
  stockBatches,
  stockMovements,
} from "@/server/db/schema";
import { requireStaff } from "@/server/services/authz";

export const dynamic = "force-dynamic";

const REASONS = new Set(["damage", "expiry", "lost", "found", "correction"]);

export async function GET() {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const [productRows, movementRows, batchRows, adjRows] = await Promise.all([
    db
      .select({
        id: products.id,
        name: products.name,
        stock: products.stock,
        lowStockThreshold: products.lowStockThreshold,
        price: products.price,
        active: products.active,
      })
      .from(products)
      .orderBy(products.name)
      .limit(500),
    db.select().from(stockMovements).orderBy(desc(stockMovements.createdAt)).limit(100),
    db
      .select()
      .from(stockBatches)
      .orderBy(asc(stockBatches.expiry), desc(stockBatches.createdAt))
      .limit(200),
    db.select().from(stockAdjustments).orderBy(desc(stockAdjustments.createdAt)).limit(40),
  ]);

  const adjIds = adjRows.map((a) => a.id);
  const adjItems =
    adjIds.length > 0
      ? await db.select().from(stockAdjustmentItems).where(inArray(stockAdjustmentItems.adjId, adjIds))
      : [];
  const itemsByAdj = new Map<string, typeof adjItems>();
  for (const it of adjItems) {
    const list = itemsByAdj.get(it.adjId) ?? [];
    list.push(it);
    itemsByAdj.set(it.adjId, list);
  }

  return NextResponse.json({
    products: productRows.map((p) => ({
      id: p.id,
      name: p.name,
      stock: p.stock,
      lowStockThreshold: p.lowStockThreshold,
      price: Number(p.price),
      active: p.active,
      low: p.stock <= p.lowStockThreshold,
    })),
    movements: movementRows.map((m) => ({
      id: m.id,
      productId: m.productId,
      productName: m.productName,
      change: m.change,
      balance: m.balance,
      kind: m.kind,
      note: m.note,
      createdAt: m.createdAt,
    })),
    batches: batchRows.map((b) => ({
      id: b.id,
      productId: b.productId,
      productName: b.productName,
      batchNo: b.batchNo,
      expiry: b.expiry,
      qty: b.qty,
      cost: Number(b.cost),
      supplierId: b.supplierId,
      poId: b.poId,
      createdAt: b.createdAt,
    })),
    adjustments: adjRows.map((a) => ({
      id: a.id,
      adjNo: a.adjNo,
      reason: a.reason,
      note: a.note,
      status: a.status,
      createdAt: a.createdAt,
      items: (itemsByAdj.get(a.id) ?? []).map((it) => ({
        productId: it.productId,
        productName: it.productName,
        change: it.change,
        beforeQty: it.beforeQty,
        afterQty: it.afterQty,
      })),
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
    action?: string;
    productId?: string;
    change?: number;
    kind?: string;
    note?: string;
    ref?: string;
    reason?: string;
    items?: { productId?: string; change?: number; note?: string }[];
  };

  // Formal stock adjustment (header + lines + movements) — legacy apply_stock_adjustment
  if (body.action === "apply_adjustment" || body.reason || Array.isArray(body.items)) {
    const reason = (body.reason ?? "correction").trim();
    if (!REASONS.has(reason)) {
      return NextResponse.json({ error: "invalid reason" }, { status: 400 });
    }

    let items = (body.items ?? [])
      .map((it) => ({
        productId: (it.productId ?? "").trim(),
        change: Number(it.change) || 0,
        note: (it.note ?? "").trim(),
      }))
      .filter((it) => it.productId && it.change !== 0);

    // Single-line convenience from the stock form
    if (items.length === 0 && body.productId && typeof body.change === "number" && body.change !== 0) {
      items = [{ productId: body.productId, change: body.change, note: "" }];
    }
    if (items.length === 0) {
      return NextResponse.json({ error: "NO_ITEMS" }, { status: 400 });
    }

    const adjId = randomUUID();
    const stamp = new Date();
    const adjNo = `ADJ-${stamp.toISOString().slice(2, 10).replace(/-/g, "")}-${adjId.slice(0, 5).toUpperCase()}`;

    try {
      await db.transaction(async (tx) => {
        await tx.insert(stockAdjustments).values({
          id: adjId,
          adjNo,
          reason,
          note: (body.note ?? "").trim(),
          status: "applied",
          createdBy: actorId ?? null,
        });

        for (const it of items) {
          const [row] = await tx.select().from(products).where(eq(products.id, it.productId)).limit(1);
          if (!row) continue;
          const before = row.stock;
          const after = Math.max(0, before + it.change);
          const delta = after - before;
          await tx.update(products).set({ stock: after }).where(eq(products.id, row.id));
          await tx.insert(stockAdjustmentItems).values({
            id: randomUUID(),
            adjId,
            productId: row.id,
            productName: row.name,
            change: delta,
            beforeQty: before,
            afterQty: after,
            note: it.note,
          });
          await tx.insert(stockMovements).values({
            id: randomUUID(),
            productId: row.id,
            productName: row.name,
            change: delta,
            balance: after,
            kind: "adjust",
            ref: adjNo,
            note: reason,
            actorId: actorId ?? null,
          });
        }
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "FAILED";
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: adjId, adjNo });
  }

  // Legacy quick adjust (no adjustment header)
  if (!body.productId || typeof body.change !== "number" || !Number.isFinite(body.change) || body.change === 0) {
    return NextResponse.json({ error: "productId and non-zero change required" }, { status: 400 });
  }

  const result = await db.transaction(async (tx) => {
    const [row] = await tx.select().from(products).where(eq(products.id, body.productId!)).limit(1);
    if (!row) throw new Error("NOT_FOUND");
    const next = Math.max(0, row.stock + body.change!);
    await tx.update(products).set({ stock: next }).where(eq(products.id, row.id));
    const id = randomUUID();
    await tx.insert(stockMovements).values({
      id,
      productId: row.id,
      productName: row.name,
      change: body.change!,
      balance: next,
      kind: body.kind?.trim() || "adjust",
      ref: body.ref?.trim() || "",
      note: body.note?.trim() || null,
      actorId: actorId ?? null,
    });
    return { id, balance: next };
  });

  return NextResponse.json({ ok: true, ...result });
}

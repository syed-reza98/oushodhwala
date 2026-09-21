import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  products,
  purchaseOrderItems,
  purchaseOrders,
  stockBatches,
  stockMovements,
  suppliers,
} from "@/server/db/schema";
import { requireStaff } from "@/server/services/authz";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const [supplierRows, poRows, itemRows] = await Promise.all([
    db.select().from(suppliers).orderBy(suppliers.name).limit(200),
    db.select().from(purchaseOrders).orderBy(desc(purchaseOrders.createdAt)).limit(50),
    db.select().from(purchaseOrderItems).limit(500),
  ]);

  const itemsByPo = new Map<string, typeof itemRows>();
  for (const it of itemRows) {
    const list = itemsByPo.get(it.poId) ?? [];
    list.push(it);
    itemsByPo.set(it.poId, list);
  }

  return NextResponse.json({
    suppliers: supplierRows.map((s) => ({
      id: s.id,
      name: s.name,
      contactPerson: s.contactPerson,
      phone: s.phone,
      email: s.email,
      paymentTerms: s.paymentTerms,
      active: s.active,
    })),
    orders: poRows.map((o) => ({
      id: o.id,
      poNo: o.poNo,
      supplierId: o.supplierId,
      supplierName: o.supplierName,
      status: o.status,
      expectedAt: o.expectedAt,
      subtotal: Number(o.subtotal),
      discount: Number(o.discount),
      total: Number(o.total),
      note: o.note,
      receivedAt: o.receivedAt,
      createdAt: o.createdAt,
      items: (itemsByPo.get(o.id) ?? []).map((it) => ({
        id: it.id,
        productId: it.productId,
        productName: it.productName,
        qty: it.qty,
        receivedQty: it.receivedQty,
        cost: Number(it.cost),
        batchNo: it.batchNo,
        expiry: it.expiry,
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
    action?: "supplier" | "po";
    // supplier
    name?: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    paymentTerms?: string;
    address?: string;
    // po
    supplierId?: string;
    discount?: number;
    note?: string;
    expectedAt?: string;
    items?: { productId: string; productName?: string; qty: number; cost: number; batchNo?: string; expiry?: string }[];
  };

  if (body.action === "supplier") {
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "name required" }, { status: 400 });
    }
    const id = randomUUID();
    await db.insert(suppliers).values({
      id,
      name: body.name.trim(),
      contactPerson: body.contactPerson?.trim() || "",
      phone: body.phone?.trim() || "",
      email: body.email?.trim() || "",
      address: body.address?.trim() || null,
      paymentTerms: body.paymentTerms?.trim() || "",
      active: true,
    });
    return NextResponse.json({ ok: true, id });
  }

  // default: create PO
  if (!body.supplierId) {
    return NextResponse.json({ error: "supplierId required" }, { status: 400 });
  }
  const items = (body.items ?? []).filter((i) => i.productId && i.qty > 0);
  if (items.length === 0) {
    return NextResponse.json({ error: "items required" }, { status: 400 });
  }

  const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, body.supplierId)).limit(1);
  if (!supplier) {
    return NextResponse.json({ error: "supplier not found" }, { status: 404 });
  }

  const subtotal = items.reduce((a, i) => a + i.qty * i.cost, 0);
  const discount = Math.max(0, Number(body.discount) || 0);
  const total = Math.max(subtotal - discount, 0);
  const poId = randomUUID();
  const poNo = `PO-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${poId.slice(0, 5).toUpperCase()}`;

  await db.transaction(async (tx) => {
    await tx.insert(purchaseOrders).values({
      id: poId,
      poNo,
      supplierId: supplier.id,
      supplierName: supplier.name,
      status: "ordered",
      expectedAt: body.expectedAt || null,
      subtotal: String(subtotal),
      discount: String(discount),
      total: String(total),
      note: body.note?.trim() || null,
      createdBy: actorId ?? null,
    });
    for (const it of items) {
      await tx.insert(purchaseOrderItems).values({
        id: randomUUID(),
        poId,
        productId: it.productId,
        productName: it.productName || "",
        qty: it.qty,
        receivedQty: 0,
        cost: String(it.cost),
        batchNo: it.batchNo?.trim() || "",
        expiry: it.expiry || null,
      });
    }
  });

  return NextResponse.json({ ok: true, id: poId, poNo });
}

export async function PATCH(req: NextRequest) {
  let actorId: string | undefined;
  try {
    const user = await requireStaff();
    actorId = user.id;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const body = (await req.json()) as {
    action?: "toggle_supplier" | "receive_po";
    id?: string;
    active?: boolean;
  };

  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  if (body.action === "toggle_supplier") {
    await db
      .update(suppliers)
      .set({ active: !!body.active })
      .where(eq(suppliers.id, body.id));
    return NextResponse.json({ ok: true });
  }

  // receive PO → bump stock
  const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, body.id)).limit(1);
  if (!po) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (po.status === "received") {
    return NextResponse.json({ error: "ALREADY_RECEIVED" }, { status: 409 });
  }

  const items = await db
    .select()
    .from(purchaseOrderItems)
    .where(eq(purchaseOrderItems.poId, po.id));

  const now = new Date().toISOString().slice(0, 23).replace("T", " ");

  await db.transaction(async (tx) => {
    for (const it of items) {
      const [row] = await tx.select().from(products).where(eq(products.id, it.productId)).limit(1);
      if (!row) continue;
      const next = row.stock + it.qty;
      await tx.update(products).set({ stock: next }).where(eq(products.id, row.id));
      await tx
        .update(purchaseOrderItems)
        .set({ receivedQty: it.qty })
        .where(eq(purchaseOrderItems.id, it.id));
      await tx.insert(stockMovements).values({
        id: randomUUID(),
        productId: row.id,
        productName: row.name,
        change: it.qty,
        balance: next,
        kind: "po_receive",
        ref: po.poNo,
        note: `Received PO ${po.poNo}`,
        actorId: actorId ?? null,
      });
      const expiry =
        it.expiry && /^\d{4}-\d{2}-\d{2}/.test(it.expiry) ? it.expiry.slice(0, 10) : null;
      await tx.insert(stockBatches).values({
        id: randomUUID(),
        productId: row.id,
        productName: row.name,
        batchNo: it.batchNo || po.poNo,
        expiry,
        qty: it.qty,
        cost: String(it.cost),
        supplierId: po.supplierId,
        poId: po.id,
      });
    }
    await tx
      .update(purchaseOrders)
      .set({ status: "received", receivedAt: now })
      .where(eq(purchaseOrders.id, po.id));
  });

  return NextResponse.json({ ok: true });
}

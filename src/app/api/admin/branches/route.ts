import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  branches,
  products,
  stockMovements,
  stockTransferItems,
  stockTransfers,
} from "@/server/db/schema";
import { requireStaff } from "@/server/services/authz";

export const dynamic = "force-dynamic";

function nowSql() {
  return new Date().toISOString().slice(0, 23).replace("T", " ");
}

function transferNo() {
  const d = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  return `TR-${d}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export async function GET(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const kind = req.nextUrl.searchParams.get("kind") ?? "branches";
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();

  if (kind === "products" && q.length > 1) {
    const rows = await db
      .select({ id: products.id, name: products.name, stock: products.stock })
      .from(products)
      .where(eq(products.active, true))
      .orderBy(asc(products.name))
      .limit(40);
    const filtered = rows.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 10);
    return NextResponse.json({ products: filtered });
  }

  if (kind === "transfers") {
    const transfers = await db
      .select()
      .from(stockTransfers)
      .orderBy(desc(stockTransfers.createdAt))
      .limit(30);
    const items = await db.select().from(stockTransferItems).limit(500);
    const byTransfer = new Map<string, typeof items>();
    for (const it of items) {
      const list = byTransfer.get(it.transferId) ?? [];
      list.push(it);
      byTransfer.set(it.transferId, list);
    }
    return NextResponse.json({
      transfers: transfers.map((t) => ({
        id: t.id,
        transferNo: t.transferNo,
        fromBranchId: t.fromBranchId,
        toBranchId: t.toBranchId,
        fromBranchName: t.fromBranchName,
        toBranchName: t.toBranchName,
        status: t.status,
        note: t.note,
        sentAt: t.sentAt,
        receivedAt: t.receivedAt,
        createdAt: t.createdAt,
        items: (byTransfer.get(t.id) ?? []).map((i) => ({
          id: i.id,
          productId: i.productId,
          productName: i.productName,
          qty: i.qty,
        })),
      })),
    });
  }

  const rows = await db.select().from(branches).orderBy(asc(branches.createdAt));
  return NextResponse.json({
    branches: rows.map((b) => ({
      id: b.id,
      code: b.code,
      name: b.name,
      nameEn: b.nameEn,
      address: b.address,
      phone: b.phone,
      isMain: b.isMain,
      active: b.active,
    })),
  });
}

export async function POST(req: NextRequest) {
  let actor;
  try {
    actor = await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const body = (await req.json()) as {
    action?: "create_branch" | "create_transfer";
    code?: string;
    name?: string;
    nameEn?: string;
    address?: string;
    phone?: string;
    fromBranchId?: string;
    toBranchId?: string;
    items?: { productId: string; productName: string; qty: number }[];
  };

  if (body.action === "create_transfer") {
    if (!body.fromBranchId || !body.toBranchId || body.fromBranchId === body.toBranchId) {
      return NextResponse.json({ error: "from/to branches required" }, { status: 400 });
    }
    if (!body.items?.length) {
      return NextResponse.json({ error: "items required" }, { status: 400 });
    }

    const [fromB] = await db
      .select()
      .from(branches)
      .where(eq(branches.id, body.fromBranchId))
      .limit(1);
    const [toB] = await db
      .select()
      .from(branches)
      .where(eq(branches.id, body.toBranchId))
      .limit(1);
    if (!fromB || !toB) {
      return NextResponse.json({ error: "branch not found" }, { status: 404 });
    }

    const id = randomUUID();
    const no = transferNo();
    const now = nowSql();

    await db.transaction(async (tx) => {
      await tx.insert(stockTransfers).values({
        id,
        transferNo: no,
        fromBranchId: fromB.id,
        toBranchId: toB.id,
        fromBranchName: fromB.name,
        toBranchName: toB.name,
        status: "sent",
        createdBy: actor.id,
        sentAt: now,
      });
      for (const it of body.items!) {
        const qty = Math.max(1, Number(it.qty) || 1);
        await tx.insert(stockTransferItems).values({
          id: randomUUID(),
          transferId: id,
          productId: it.productId,
          productName: it.productName,
          qty,
        });
        const [p] = await tx
          .select({ stock: products.stock, name: products.name })
          .from(products)
          .where(eq(products.id, it.productId))
          .limit(1);
        if (p) {
          const next = Math.max(0, p.stock - qty);
          await tx.update(products).set({ stock: next }).where(eq(products.id, it.productId));
          await tx.insert(stockMovements).values({
            id: randomUUID(),
            productId: it.productId,
            productName: p.name,
            change: -qty,
            balance: next,
            kind: "transfer",
            ref: no,
            note: `${fromB.name} → ${toB.name}`,
            actorId: actor.id,
          });
        }
      }
    });

    return NextResponse.json({ ok: true, id, transferNo: no });
  }

  // create_branch
  const code = (body.code ?? "").trim().toUpperCase();
  const name = (body.name ?? "").trim();
  if (!code || !name) {
    return NextResponse.json({ error: "code and name required" }, { status: 400 });
  }
  const id = randomUUID();
  await db.insert(branches).values({
    id,
    code,
    name,
    nameEn: (body.nameEn ?? "").trim(),
    address: (body.address ?? "").trim(),
    phone: (body.phone ?? "").trim(),
    active: true,
    isMain: false,
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
    kind?: "branch" | "transfer";
    id?: string;
    active?: boolean;
    status?: string;
  };
  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  if (body.kind === "transfer") {
    const status = body.status;
    if (!status || !["draft", "sent", "received", "cancelled"].includes(status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    const [row] = await db
      .select()
      .from(stockTransfers)
      .where(eq(stockTransfers.id, body.id))
      .limit(1);
    if (!row) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const now = nowSql();
    const patch: Partial<typeof stockTransfers.$inferInsert> = { status };
    if (status === "sent") patch.sentAt = now;
    if (status === "received") patch.receivedAt = now;

    // restore stock if cancelling a sent transfer
    if (status === "cancelled" && row.status === "sent") {
      const items = await db
        .select()
        .from(stockTransferItems)
        .where(eq(stockTransferItems.transferId, row.id));
      await db.transaction(async (tx) => {
        for (const it of items) {
          await tx
            .update(products)
            .set({ stock: sql`${products.stock} + ${it.qty}` })
            .where(eq(products.id, it.productId));
          const [p] = await tx
            .select({ stock: products.stock, name: products.name })
            .from(products)
            .where(eq(products.id, it.productId))
            .limit(1);
          if (p) {
            await tx.insert(stockMovements).values({
              id: randomUUID(),
              productId: it.productId,
              productName: p.name,
              change: it.qty,
              balance: p.stock,
              kind: "transfer_cancel",
              ref: row.transferNo,
              note: "transfer cancelled",
            });
          }
        }
        await tx.update(stockTransfers).set(patch).where(eq(stockTransfers.id, row.id));
      });
    } else {
      await db.update(stockTransfers).set(patch).where(eq(stockTransfers.id, body.id));
    }
    return NextResponse.json({ ok: true });
  }

  if (typeof body.active !== "boolean") {
    return NextResponse.json({ error: "active required" }, { status: 400 });
  }
  await db.update(branches).set({ active: body.active }).where(eq(branches.id, body.id));
  return NextResponse.json({ ok: true });
}

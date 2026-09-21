import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { and, desc, eq, like, or } from "drizzle-orm";
import { db } from "@/server/db";
import { posSaleItems, posSales, products, stockMovements } from "@/server/db/schema";
import { requireStaff } from "@/server/services/authz";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  const [sales, productRows] = await Promise.all([
    db.select().from(posSales).orderBy(desc(posSales.createdAt)).limit(30),
    q.length > 1
      ? db
          .select({
            id: products.id,
            name: products.name,
            en: products.en,
            price: products.price,
            stock: products.stock,
            pack: products.pack,
          })
          .from(products)
          .where(
            and(
              eq(products.active, true),
              or(
                like(products.name, `%${q}%`),
                like(products.en, `%${q}%`),
                like(products.generic, `%${q}%`),
              ),
            ),
          )
          .orderBy(desc(products.stock))
          .limit(40)
      : db
          .select({
            id: products.id,
            name: products.name,
            en: products.en,
            price: products.price,
            stock: products.stock,
            pack: products.pack,
          })
          .from(products)
          .where(eq(products.active, true))
          .orderBy(desc(products.stock))
          .limit(40),
  ]);

  return NextResponse.json({
    sales: sales.map((s) => ({
      id: s.id,
      invoiceNo: s.invoiceNo,
      customerName: s.customerName,
      phone: s.phone,
      total: Number(s.total),
      paid: Number(s.paid),
      due: Number(s.due),
      method: s.method,
      createdAt: s.createdAt,
    })),
    products: productRows.map((p) => ({
      id: p.id,
      name: p.name,
      en: p.en,
      price: Number(p.price),
      stock: p.stock,
      pack: p.pack,
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
    items?: { productId: string; productName?: string; price: number; qty: number }[];
    customerName?: string;
    phone?: string;
    discount?: number;
    paid?: number;
    method?: string;
    note?: string;
  };

  const items = (body.items ?? []).filter((i) => i.productId && i.qty > 0 && i.price >= 0);
  if (items.length === 0) {
    return NextResponse.json({ error: "NO_ITEMS" }, { status: 400 });
  }

  const subtotal = items.reduce((a, i) => a + i.price * i.qty, 0);
  const discount = Math.max(0, Number(body.discount) || 0);
  const total = Math.max(subtotal - discount, 0);
  const paid = Math.max(0, Number(body.paid) || total);
  const due = Math.max(total - paid, 0);
  const method = body.method?.trim() || "cash";
  const saleId = randomUUID();
  const stamp = new Date();
  const invoiceNo = `POS-${stamp.toISOString().slice(2, 10).replace(/-/g, "")}-${saleId.slice(0, 5).toUpperCase()}`;

  try {
    await db.transaction(async (tx) => {
      await tx.insert(posSales).values({
        id: saleId,
        invoiceNo,
        customerName: body.customerName?.trim() || "",
        phone: body.phone?.trim() || "",
        subtotal: String(subtotal),
        discount: String(discount),
        total: String(total),
        paid: String(paid),
        due: String(due),
        method,
        note: body.note?.trim() || null,
        createdBy: actorId ?? null,
      });

      for (const it of items) {
        const [row] = await tx.select().from(products).where(eq(products.id, it.productId)).limit(1);
        if (!row) throw new Error(`NOT_FOUND:${it.productId}`);
        if (row.stock < it.qty) throw new Error(`INSUFFICIENT:${row.name}`);
        const next = row.stock - it.qty;
        await tx.update(products).set({ stock: next }).where(eq(products.id, row.id));
        await tx.insert(posSaleItems).values({
          id: randomUUID(),
          saleId,
          productId: row.id,
          productName: it.productName || row.name,
          price: String(it.price),
          qty: it.qty,
        });
        await tx.insert(stockMovements).values({
          id: randomUUID(),
          productId: row.id,
          productName: row.name,
          change: -it.qty,
          balance: next,
          kind: "pos",
          ref: invoiceNo,
          note: "POS sale",
          actorId: actorId ?? null,
        });
      }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "FAILED";
    if (msg.startsWith("INSUFFICIENT:")) {
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    if (msg.startsWith("NOT_FOUND:")) {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    throw e;
  }

  return NextResponse.json({ ok: true, id: saleId, invoiceNo, total, due });
}

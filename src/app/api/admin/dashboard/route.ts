import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/server/db";
import { orders, products } from "@/server/db/schema";
import { requireStaff } from "@/server/services/authz";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const [orderRows, productRows] = await Promise.all([
    db.select().from(orders).orderBy(desc(orders.createdAt)).limit(200),
    db.select().from(products).orderBy(products.name).limit(500),
  ]);

  return NextResponse.json({
    orders: orderRows.map((o) => ({
      id: o.id,
      order_no: o.orderNo,
      status: o.status,
      total: Number(o.total),
      created_at: o.createdAt,
      payment_method: o.paymentMethod,
      customer_name: o.customerName,
      customer_phone: o.customerPhone,
    })),
    products: productRows.map((p) => ({
      id: p.id,
      name: p.name,
      stock: p.stock,
      low_stock_threshold: p.lowStockThreshold,
      price: Number(p.price),
      active: p.active,
    })),
  });
}

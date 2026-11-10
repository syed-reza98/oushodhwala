import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { products } from "@/server/db/schema";
import { requireStaff } from "@/server/services/authz";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const body = (await req.json()) as {
    id?: string;
    active?: boolean;
    price?: number;
    name?: string;
    lowStockThreshold?: number;
  };
  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const patch: Partial<typeof products.$inferInsert> = {};
  if (typeof body.active === "boolean") patch.active = body.active;
  if (body.price != null && Number.isFinite(body.price) && body.price >= 0) {
    patch.price = String(body.price);
  }
  if (body.name?.trim()) patch.name = body.name.trim();
  if (body.lowStockThreshold != null && Number.isFinite(body.lowStockThreshold)) {
    patch.lowStockThreshold = Math.max(0, Math.trunc(body.lowStockThreshold));
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  await db.update(products).set(patch).where(eq(products.id, body.id));
  return NextResponse.json({ ok: true });
}

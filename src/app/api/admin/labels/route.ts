import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, like, or } from "drizzle-orm";
import { db } from "@/server/db";
import { products } from "@/server/db/schema";
import { requireStaff } from "@/server/services/authz";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q) {
    return NextResponse.json({ products: [] });
  }

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      price: products.price,
      pack: products.pack,
      brand: products.brand,
      stock: products.stock,
    })
    .from(products)
    .where(
      and(
        eq(products.active, true),
        or(
          like(products.name, `%${q}%`),
          like(products.en, `%${q}%`),
          like(products.brand, `%${q}%`),
          like(products.generic, `%${q}%`),
        ),
      ),
    )
    .orderBy(asc(products.name))
    .limit(40);

  return NextResponse.json({
    products: rows.map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      pack: p.pack,
      brand: p.brand,
      stock: p.stock,
    })),
  });
}

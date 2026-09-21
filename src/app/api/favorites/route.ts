import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { products, userFavorites, userRecentMedicines } from "@/server/db/schema";
import { requireUser } from "@/server/services/authz";

export const dynamic = "force-dynamic";

export async function GET() {
  let user: { id: string };
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: userFavorites.id,
      productId: userFavorites.productId,
      createdAt: userFavorites.createdAt,
      name: products.name,
      en: products.en,
      brand: products.brand,
      price: products.price,
      stock: products.stock,
      imageUrl: products.imageUrl,
      medicineImageUrl: products.medicineImageUrl,
      pack: products.pack,
    })
    .from(userFavorites)
    .innerJoin(products, eq(userFavorites.productId, products.id))
    .where(eq(userFavorites.userId, user.id))
    .orderBy(desc(userFavorites.createdAt))
    .limit(200);

  return NextResponse.json({
    items: rows.map((r) => ({
      id: r.id,
      productId: r.productId,
      name: r.name,
      en: r.en,
      brand: r.brand,
      price: Number(r.price),
      stock: r.stock,
      imageUrl: r.imageUrl,
      medicineImageUrl: r.medicineImageUrl,
      pack: r.pack,
      createdAt: r.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  let user: { id: string };
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await req.json()) as {
    action?: "toggle" | "view";
    productId?: string;
  };
  const action = body.action ?? "toggle";
  const productId = (body.productId ?? "").trim();
  if (!productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 });
  }

  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  if (!product) {
    return NextResponse.json({ error: "product not found" }, { status: 404 });
  }

  if (action === "view") {
    const [existing] = await db
      .select({ id: userRecentMedicines.id })
      .from(userRecentMedicines)
      .where(
        and(eq(userRecentMedicines.userId, user.id), eq(userRecentMedicines.productId, productId)),
      )
      .limit(1);

    const now = sql`CURRENT_TIMESTAMP(3)`;
    if (existing) {
      await db
        .update(userRecentMedicines)
        .set({ lastViewedAt: now as unknown as string })
        .where(eq(userRecentMedicines.id, existing.id));
    } else {
      await db.insert(userRecentMedicines).values({
        id: randomUUID(),
        userId: user.id,
        productId,
      });
    }
    return NextResponse.json({ ok: true, viewed: true });
  }

  if (action === "toggle") {
    const [existing] = await db
      .select({ id: userFavorites.id })
      .from(userFavorites)
      .where(and(eq(userFavorites.userId, user.id), eq(userFavorites.productId, productId)))
      .limit(1);

    if (existing) {
      await db.delete(userFavorites).where(eq(userFavorites.id, existing.id));
      return NextResponse.json({ ok: true, favorite: false });
    }

    await db.insert(userFavorites).values({
      id: randomUUID(),
      userId: user.id,
      productId,
    });
    return NextResponse.json({ ok: true, favorite: true });
  }

  const _exhaustive: never = action;
  return NextResponse.json({ error: `unknown action: ${_exhaustive}` }, { status: 400 });
}

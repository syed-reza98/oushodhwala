import { NextResponse } from "next/server";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { products, userFavorites, userRecentMedicines } from "@/server/db/schema";
import { requireUser } from "@/server/services/authz";

export const dynamic = "force-dynamic";

function mapProduct(p: typeof products.$inferSelect) {
  return {
    id: p.id,
    name: p.name,
    en: p.en,
    brand: p.brand,
    generic: p.generic,
    form: p.form,
    strength: p.strength,
    pack: p.pack,
    price: p.price,
    mrp: p.mrp,
    stock: p.stock,
    rx: p.rx,
    imageUrl: p.imageUrl,
    medicineImageUrl: p.medicineImageUrl,
    emoji: p.emoji,
  };
}

export async function GET() {
  let user: { id: string };
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const favRows = await db
    .select({ product: products, sortOrder: userFavorites.sortOrder })
    .from(userFavorites)
    .innerJoin(products, eq(userFavorites.productId, products.id))
    .where(eq(userFavorites.userId, user.id))
    .orderBy(asc(userFavorites.sortOrder), desc(userFavorites.createdAt))
    .limit(100);

  const recentRows = await db
    .select({ product: products, lastViewedAt: userRecentMedicines.lastViewedAt })
    .from(userRecentMedicines)
    .innerJoin(products, eq(userRecentMedicines.productId, products.id))
    .where(eq(userRecentMedicines.userId, user.id))
    .orderBy(desc(userRecentMedicines.lastViewedAt))
    .limit(20);

  return NextResponse.json({
    favorites: favRows.map((r) => mapProduct(r.product)),
    recent: recentRows.map((r) => ({
      ...mapProduct(r.product),
      lastViewedAt: r.lastViewedAt,
    })),
  });
}

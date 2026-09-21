"use server";

import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { products } from "@/server/db/schema";

export async function getCatalog(limit = 48) {
  return db
    .select()
    .from(products)
    .where(eq(products.active, true))
    .orderBy(desc(products.updatedAt))
    .limit(limit);
}

export async function searchProducts(q: string, limit = 40) {
  const term = `%${q.trim()}%`;
  if (!q.trim()) return getCatalog(limit);
  return db
    .select()
    .from(products)
    .where(
      and(
        eq(products.active, true),
        or(
          like(products.name, term),
          like(products.en, term),
          like(products.generic, term),
          like(products.brand, term),
        ),
      ),
    )
    .limit(limit);
}

export async function getProductById(id: string) {
  const [row] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);
  return row ?? null;
}

export async function countProducts() {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(products);
  return Number(row?.count ?? 0);
}

"use server";

import { and, asc, desc, eq, like, lte, or, sql } from "drizzle-orm";
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

export type SearchProductsInput = {
  q?: string;
  category?: string;
  sort?: string;
  rx?: boolean;
  maxPrice?: number;
  offset?: number;
  limit?: number;
};

export async function searchProducts(input: SearchProductsInput | string, limitArg = 40) {
  // Back-compat: searchProducts(q, limit)
  const opts: SearchProductsInput =
    typeof input === "string" ? { q: input, limit: limitArg } : input;

  const q = (opts.q ?? "").trim();
  const limit = opts.limit ?? 40;
  const offset = opts.offset ?? 0;
  const category = opts.category && opts.category !== "all" ? opts.category : "";
  const maxPrice = opts.maxPrice ?? 0;
  const rxOnly = Boolean(opts.rx);

  const filters = [eq(products.active, true)];
  if (q) {
    const term = `%${q}%`;
    filters.push(
      or(
        like(products.name, term),
        like(products.en, term),
        like(products.generic, term),
        like(products.brand, term),
      )!,
    );
  }
  if (category) filters.push(eq(products.category, category));
  if (rxOnly) filters.push(eq(products.rx, true));
  if (maxPrice > 0) filters.push(lte(products.price, String(maxPrice)));

  const where = and(...filters);

  const sort = opts.sort ?? "popular";
  let orderBy;
  switch (sort) {
    case "low":
      orderBy = asc(products.price);
      break;
    case "high":
      orderBy = desc(products.price);
      break;
    case "rating":
      orderBy = desc(products.rating);
      break;
    case "discount":
      orderBy = desc(sql`(${products.mrp} - ${products.price})`);
      break;
    default:
      orderBy = desc(products.reviews);
      break;
  }

  const [rows, countRows] = await Promise.all([
    db
      .select()
      .from(products)
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(products).where(where),
  ]);

  return { rows, count: Number(countRows[0]?.count ?? 0) };
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

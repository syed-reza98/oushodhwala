"use server";

import { and, asc, desc, eq, like, lte, ne, or, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { genericInfo, products } from "@/server/db/schema";

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

/** Full product page payload: row + related + variants + generic_info. */
export async function getProductPage(id: string) {
  const row = await getProductById(id);
  if (!row) return null;

  const genericKey = (row.generic ?? "").trim().toLowerCase();
  const category = row.category ?? "";
  const brand = row.brand ?? "";
  const [related, variants, genericRows] = await Promise.all([
    category
      ? db
          .select()
          .from(products)
          .where(
            and(eq(products.active, true), eq(products.category, category), ne(products.id, row.id)),
          )
          .limit(4)
      : Promise.resolve([]),
    row.baseName
      ? db
          .select({
            id: products.id,
            name: products.name,
            en: products.en,
            strength: products.strength,
            form: products.form,
            pack: products.pack,
            price: products.price,
            mrp: products.mrp,
            stock: products.stock,
            emoji: products.emoji,
            imageUrl: products.imageUrl,
            medicineImageUrl: products.medicineImageUrl,
          })
          .from(products)
          .where(
            and(
              eq(products.active, true),
              eq(products.baseName, row.baseName),
              eq(products.brand, brand),
            ),
          )
          .orderBy(asc(products.form))
          .limit(30)
      : Promise.resolve([]),
    genericKey
      ? db.select().from(genericInfo).where(eq(genericInfo.key, genericKey)).limit(1)
      : Promise.resolve([]),
  ]);

  return {
    row,
    related,
    variants,
    generic: genericRows[0]
      ? {
          indications: genericRows[0].indications,
          indications_en: genericRows[0].indicationsEn,
          pharmacology: genericRows[0].pharmacology,
          pharmacology_en: genericRows[0].pharmacologyEn,
          dosage: genericRows[0].dosage,
          dosage_en: genericRows[0].dosageEn,
          interaction: genericRows[0].interaction,
          interaction_en: genericRows[0].interactionEn,
          contraindications: genericRows[0].contraindications,
          contraindications_en: genericRows[0].contraindicationsEn,
          side_effects: genericRows[0].sideEffects,
          side_effects_en: genericRows[0].sideEffectsEn,
          pregnancy: genericRows[0].pregnancy,
          pregnancy_en: genericRows[0].pregnancyEn,
          precautions: genericRows[0].precautions,
          precautions_en: genericRows[0].precautionsEn,
          therapeutic_class: genericRows[0].therapeuticClass,
          therapeutic_class_en: genericRows[0].therapeuticClassEn,
          storage: genericRows[0].storage,
          storage_en: genericRows[0].storageEn,
          special_populations: "",
          special_populations_en: "",
          overdose: "",
          overdose_en: "",
        }
      : null,
  };
}

export async function countProducts() {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(products);
  return Number(row?.count ?? 0);
}

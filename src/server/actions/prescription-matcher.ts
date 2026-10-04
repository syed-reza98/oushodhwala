"use server";

import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { products } from "@/server/db/schema";
import type { RxExtractedItem } from "@/server/ai/gateway";
import { calculatePrescribedQty } from "@/lib/prescription-utils";

export type MatchedProduct = {
  id: string;
  name: string;
  baseName: string;
  generic: string;
  strength: string;
  form: string;
  manufacturer: string;
  price: number;
  mrp: number;
  stock: number;
  imageUrl: string;
};

export type MatchedRxItem = {
  originalIndex: number;
  extractedName: string;
  extractedGeneric?: string;
  extractedStrength?: string;
  extractedForm?: string;
  dose?: string;
  duration?: string;
  instruction?: string;
  matchedProduct: MatchedProduct | null;
  matchType: "exact" | "generic_substitute" | "unmatched";
  calculatedQty: number;
  subtotal: number;
  alternatives: MatchedProduct[];
  unmatchedReason?: string;
};

// Priority manufacturers in Bangladesh healthcare
const PREFERRED_MFG = [
  "Square",
  "Beximco",
  "Incepta",
  "Radiant",
  "Eskayef",
  "Renata",
  "ACME",
  "ACI",
  "Aristopharma",
  "Popular",
  "Opsonin",
  "Healthcare",
];

/**
 * Cleans medicine name for brand lookup
 */
function cleanBrandName(rawName: string): string {
  let name = (rawName.split("/")[0] ?? "").trim();
  // Strip parenthetical remarks e.g. "Exium (20mg)" -> "Exium"
  name = name.replace(/\([^)]*\)/g, "").trim();
  // Strip common trailing strength patterns
  name = name.replace(/\b\d+(\.\d+)?\s*(mg|ml|mcg|gm|g|%)\b/gi, "").trim();
  // Strip common trailing form identifiers
  name = name
    .replace(
      /\b(tab|tablet|cap|capsule|soap|cream|ointment|syrup|suspension|gel|lotion|drop|eye drop|nasal drop|solution|injection)\b/gi,
      ""
    )
    .trim();
  return name.trim();
}

function normalizeStrength(st?: string | null): string {
  if (!st) return "";
  return st.toLowerCase().replace(/\s+/g, "").trim();
}

function mapProduct(p: typeof products.$inferSelect): MatchedProduct {
  return {
    id: p.id,
    name: p.name,
    baseName: p.baseName || p.name,
    generic: p.generic || "",
    strength: p.strength || "",
    form: p.form || "Tablet",
    manufacturer: p.manufacturer || "",
    price: Number(p.price) || 0,
    mrp: Number(p.mrp) || Number(p.price) || 0,
    stock: p.stock ?? 0,
    imageUrl:
      p.medicineImageUrl ||
      p.imageUrl ||
      "/uploads/product-images/default-medicine.png",
  };
}

/**
 * Cross-references extracted prescription items against the 25,359-item catalog in MySQL
 */
export async function matchPrescriptionMedicines(
  items: RxExtractedItem[]
): Promise<MatchedRxItem[]> {
  if (!items || items.length === 0) return [];

  const results: MatchedRxItem[] = [];

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    if (!item) continue;
    const cleanedBrand = cleanBrandName(item.name);
    const itemStrengthNorm = normalizeStrength(item.strength);
    const itemGeneric = (item.generic || "").trim();

    let matchedProd: MatchedProduct | null = null;
    let matchType: "exact" | "generic_substitute" | "unmatched" = "unmatched";
    let alternatives: MatchedProduct[] = [];

    // TIER 1: Exact / Prefix Brand Match
    if (cleanedBrand.length >= 2) {
      const brandCandidates = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.active, true),
            or(
              eq(products.baseName, cleanedBrand),
              like(products.baseName, `${cleanedBrand}%`),
              like(products.name, `${cleanedBrand}%`)
            )
          )
        )
        .limit(10);

      if (brandCandidates.length > 0) {
        // Try to match exact strength if specified
        if (itemStrengthNorm) {
          const strengthMatch = brandCandidates.find(
            (c) => normalizeStrength(c.strength) === itemStrengthNorm
          );
          if (strengthMatch) {
            matchedProd = mapProduct(strengthMatch);
            matchType = "exact";
          }
        }

        // If no strength match, pick the closest candidate
        if (!matchedProd && brandCandidates[0]) {
          matchedProd = mapProduct(brandCandidates[0]);
          matchType = "exact";
        }
      }
    }

    // TIER 2: Generic Formulation Match (if brand not found or ambiguous)
    const effectiveGeneric = matchedProd?.generic || itemGeneric;

    if (!matchedProd && effectiveGeneric.length >= 3) {
      const genericCandidates = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.active, true),
            like(products.generic, `%${effectiveGeneric}%`)
          )
        )
        .limit(15);

      if (genericCandidates.length > 0) {
        // Find best match considering strength & top manufacturers
        let candidate = itemStrengthNorm
          ? genericCandidates.find(
              (c) => normalizeStrength(c.strength) === itemStrengthNorm
            )
          : null;

        if (!candidate) {
          // Sort candidates favoring top manufacturers
          const sorted = [...genericCandidates].sort((a, b) => {
            const aMfg = PREFERRED_MFG.some((m) =>
              (a.manufacturer || "").toLowerCase().includes(m.toLowerCase())
            );
            const bMfg = PREFERRED_MFG.some((m) =>
              (b.manufacturer || "").toLowerCase().includes(m.toLowerCase())
            );
            if (aMfg && !bMfg) return -1;
            if (!aMfg && bMfg) return 1;
            return (b.stock ?? 0) - (a.stock ?? 0);
          });
          const best = sorted[0];
          if (best) candidate = best;
        }

        if (candidate) {
          matchedProd = mapProduct(candidate);
          matchType = "generic_substitute";
        }
      }
    }

    // TIER 3: Fetch Generic Alternatives
    if (effectiveGeneric.length >= 3) {
      const altCandidates = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.active, true),
            like(products.generic, `%${effectiveGeneric}%`),
            matchedProd ? sql`${products.id} != ${matchedProd.id}` : sql`1=1`
          )
        )
        .limit(10);

      // Prioritize top manufacturers and matching strength
      const sortedAlts = altCandidates
        .sort((a, b) => {
          if (itemStrengthNorm) {
            const aMatch = normalizeStrength(a.strength) === itemStrengthNorm;
            const bMatch = normalizeStrength(b.strength) === itemStrengthNorm;
            if (aMatch && !bMatch) return -1;
            if (!aMatch && bMatch) return 1;
          }
          const aMfg = PREFERRED_MFG.some((m) =>
            (a.manufacturer || "").toLowerCase().includes(m.toLowerCase())
          );
          const bMfg = PREFERRED_MFG.some((m) =>
            (b.manufacturer || "").toLowerCase().includes(m.toLowerCase())
          );
          if (aMfg && !bMfg) return -1;
          if (!aMfg && bMfg) return 1;
          return 0;
        })
        .slice(0, 3);

      alternatives = sortedAlts
        .filter((x): x is typeof products.$inferSelect => Boolean(x))
        .map(mapProduct);
    }

    const calculatedQty = calculatePrescribedQty(
      item.dose,
      item.duration,
      matchedProd?.form || item.name
    );
    const subtotal = matchedProd ? matchedProd.price * calculatedQty : 0;

    results.push({
      originalIndex: idx,
      extractedName: item.name,
      extractedGeneric: item.generic,
      extractedStrength: item.strength,
      extractedForm: item.form,
      dose: item.dose,
      duration: item.duration,
      instruction: item.instruction,
      matchedProduct: matchedProd,
      matchType,
      calculatedQty,
      subtotal,
      alternatives,
      unmatchedReason:
        matchType === "unmatched"
          ? "ফার্মাসিস্ট নিশ্চিত করবেন (Pharmacist Review)"
          : undefined,
    });
  }

  return results;
}

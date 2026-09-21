/**
 * Client-safe catalog API wrappers (no Server Actions).
 */

export type CatalogPayload = {
  products: Record<string, unknown>[];
  categories: Record<string, unknown>[];
  offers: Record<string, unknown>[];
  labTests: Record<string, unknown>[];
  doctors: Record<string, unknown>[];
  settings: { key: string; value: string }[];
};

export async function getCatalog(): Promise<CatalogPayload> {
  const res = await fetch("/api/catalog", { cache: "no-store" });
  if (!res.ok) throw new Error("catalog fetch failed");
  return res.json() as Promise<CatalogPayload>;
}

export async function searchProducts(input: {
  data: {
    q?: string;
    category?: string;
    sort?: string;
    rx?: boolean;
    maxPrice?: number;
    offset?: number;
    limit?: number;
  };
}): Promise<{ rows: Record<string, unknown>[]; count: number }> {
  const p = new URLSearchParams();
  const d = input.data;
  if (d.q) p.set("q", d.q);
  if (d.category) p.set("category", d.category);
  if (d.sort) p.set("sort", d.sort);
  if (d.rx) p.set("rx", "1");
  if (d.maxPrice != null) p.set("maxPrice", String(d.maxPrice));
  if (d.offset != null) p.set("offset", String(d.offset));
  if (d.limit != null) p.set("limit", String(d.limit));
  const res = await fetch(`/api/catalog/search?${p.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("search failed");
  return res.json() as Promise<{ rows: Record<string, unknown>[]; count: number }>;
}

export async function getProductById(input: { data: { id: string } }) {
  const res = await fetch(`/api/catalog/product?id=${encodeURIComponent(input.data.id)}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

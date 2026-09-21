import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { categories, products } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const STATIC_PATHS = [
  "/",
  "/products",
  "/categories",
  "/offers",
  "/lab-test",
  "/home-diagnostics",
  "/home-services",
  "/doctor-consultation",
  "/prescription",
  "/help",
  "/contact",
  "/privacy",
  "/terms",
  "/refund-policy",
];

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function url(
  origin: string,
  loc: string,
  priority: string,
  changefreq = "weekly",
  lastmod?: string,
) {
  const lm = lastmod ? `<lastmod>${esc(lastmod)}</lastmod>` : "";
  return `  <url><loc>${esc(origin + loc)}</loc>${lm}<changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
}

/** SEO sitemap — static pages + active categories + products */
export async function GET() {
  const origin = (process.env.PUBLIC_ORIGIN ?? "http://127.0.0.1:3030").replace(/\/$/, "");

  const [cats, prods] = await Promise.all([
    db
      .select({ slug: categories.slug })
      .from(categories)
      .where(eq(categories.active, true))
      .limit(200),
    db
      .select({ id: products.id, updatedAt: products.updatedAt })
      .from(products)
      .where(eq(products.active, true))
      .limit(5000),
  ]);

  const lines = [
    ...STATIC_PATHS.map((p) => url(origin, p, p === "/" ? "1.0" : "0.7", "daily")),
    ...cats.map((c) => url(origin, `/category/${c.slug}`, "0.8")),
    ...prods.map((r) =>
      url(
        origin,
        `/product/${encodeURIComponent(r.id)}`,
        "0.6",
        "weekly",
        r.updatedAt?.slice(0, 10),
      ),
    ),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${lines.join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

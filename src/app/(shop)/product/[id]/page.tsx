import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductPage } from "@/server/actions/catalog";
import ProductClient from "./ProductClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const payload = await getProductPage(id);
  if (!payload) {
    return { title: "পণ্য পাওয়া যায়নি | ঔষধওয়ালা", robots: { index: false } };
  }
  const p = payload.row;
  const title = `${p.name} — দাম ৳${p.price} | ঔষধওয়ালা`;
  const desc = `${p.name} (${p.en ?? ""}) — ${p.generic ?? ""}, ${p.brand ?? ""}। ৳${p.price} টাকায় অনলাইনে অর্ডার করুন, দ্রুত হোম ডেলিভারি।`;
  const img = p.medicineImageUrl || p.imageUrl;

  return {
    title: { absolute: title },
    description: desc,
    openGraph: {
      title,
      description: desc,
      type: "website",
      images: img ? [{ url: img, alt: p.name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: img ? [img] : undefined,
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const payload = await getProductPage(id);
  if (!payload) notFound();

  const p = payload.row;
  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: p.name,
    alternateName: p.en,
    description: `${p.name} - ${p.generic ?? ""}, ${p.brand ?? ""}`,
    image: p.medicineImageUrl || p.imageUrl,
    offers: {
      "@type": "Offer",
      priceCurrency: "BDT",
      price: p.price,
      availability: (Number(p.stock) || 0) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductClient
        initial={{
          row: payload.row as unknown as Record<string, unknown>,
          related: payload.related as unknown as Record<string, unknown>[],
          variants: payload.variants as unknown as Record<string, unknown>[],
          generic: payload.generic,
        }}
      />
    </>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductPage } from "@/server/actions/catalog";
import { mapProduct } from "@/lib/catalog-db";
import MedicineDetailClient from "./MedicineDetailClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const pageData = await getProductPage(id);
  if (!pageData?.row) {
    return { title: "ঔষধ পাওয়া যায়নি", robots: { index: false } };
  }
  const row = pageData.row;
  const title = `${row.name} (${row.en ?? ""}) — দাম ৳${row.price} | ঔষধওয়ালা`;
  const desc = `${row.name} — ${row.generic ?? ""}, ${row.manufacturer ?? row.brand ?? ""}। ৳${row.price} টাকায় অনলাইনে অর্ডার করুন। দ্রুত ডেলিভারি।`;
  const img = row.medicineImageUrl || row.imageUrl;

  return {
    title: { absolute: title },
    description: desc,
    openGraph: {
      title,
      description: desc,
      type: "website",
      images: img ? [{ url: img, alt: row.name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: img ? [img] : undefined,
    },
  };
}

export default async function MedicineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pageData = await getProductPage(id);
  if (!pageData?.row) {
    notFound();
  }

  const p = mapProduct(pageData.row as unknown as Parameters<typeof mapProduct>[0]);
  const alternatives = (pageData.alternatives || []).map((r) =>
    mapProduct(r as unknown as Parameters<typeof mapProduct>[0]),
  );
  const manufacturerProducts = (pageData.manufacturerProducts || []).map((r) =>
    mapProduct(r as unknown as Parameters<typeof mapProduct>[0]),
  );

  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: p.name,
    alternateName: p.en,
    description: `${p.name} - ${p.generic ?? ""}, ${p.brand ?? ""}`,
    image: p.medicineImage || p.image,
    offers: {
      "@type": "Offer",
      priceCurrency: "BDT",
      price: p.price,
      availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MedicineDetailClient
        p={p}
        generic={pageData.generic}
        alternatives={alternatives}
        manufacturerProducts={manufacturerProducts}
      />
    </>
  );
}

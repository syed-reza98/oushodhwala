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
    return { title: "পণ্য পাওয়া যায়নি", robots: { index: false } };
  }
  const p = payload.row;
  const title = `${p.name} — দাম ৳${p.price} | ঔষধওয়ালা`;
  const desc = `${p.name} (${p.en ?? ""}) — ${p.generic ?? ""}, ${p.brand ?? ""}। ৳${p.price} টাকায় অনলাইনে অর্ডার করুন, দ্রুত হোম ডেলিভারি।`;
  return {
    title: { absolute: title },
    description: desc,
    openGraph: { title, description: desc, type: "website" },
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

  return (
    <ProductClient
      initial={{
        row: payload.row as unknown as Record<string, unknown>,
        related: payload.related as unknown as Record<string, unknown>[],
        variants: payload.variants as unknown as Record<string, unknown>[],
        generic: payload.generic,
      }}
    />
  );
}

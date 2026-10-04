import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductById } from "@/server/actions/catalog";
import { mapProduct } from "@/lib/catalog-db";
import MedicineDetailClient from "./MedicineDetailClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const row = await getProductById(id);
  if (!row) {
    return { title: "ঔষধ পাওয়া যায়নি", robots: { index: false } };
  }
  const title = `${row.name} (${row.en ?? ""}) — দাম ৳${row.price} | ঔষধওয়ালা`;
  const desc = `${row.name} — ${row.generic ?? ""}, ${row.manufacturer ?? row.brand ?? ""}। ৳${row.price} টাকায় অনলাইনে অর্ডার করুন।`;
  return {
    title: { absolute: title },
    description: desc,
    openGraph: { title, description: desc, type: "website" },
  };
}

export default async function MedicineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await getProductById(id);
  if (!row) {
    notFound();
  }

  const p = mapProduct(row as unknown as Parameters<typeof mapProduct>[0]);

  return <MedicineDetailClient p={p} />;
}

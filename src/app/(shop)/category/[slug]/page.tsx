import type { Metadata } from "next";
import { db } from "@/server/db";
import { categories } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import CategoryClient from "./CategoryClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [cat] = await db
    .select()
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);

  if (!cat) {
    return { title: "ক্যাটাগরি পাওয়া যায়নি | ঔষধওয়ালা", robots: { index: false } };
  }

  const title = `${cat.name} (${cat.nameEn ?? ""}) — ঔষধ ও স্বাস্থ্যপণ্য | ঔষধওয়ালা`;
  const desc =
    cat.description ||
    cat.descriptionEn ||
    `${cat.name} ক্যাটাগরির সমস্ত প্রয়োজনীয় ঔষধ ও পণ্য অর্ডার করুন ঘরে বসেই দ্রুত ডেলিভারির সাথে।`;

  return {
    title: { absolute: title },
    description: desc,
    openGraph: {
      title,
      description: desc,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CategoryClient slug={slug} />;
}

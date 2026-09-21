"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { useCatalog } from "@/lib/catalog-db";
import { useT } from "@/lib/i18n";
import { useLang, pick } from "@/lib/lang";

export default function CategoryPage() {
  const t = useT();
  const { lang } = useLang();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { products, categories } = useCatalog();
  const cat = categories.find((c) => c.slug === slug);

  if (!cat) {
    return (
      <div className="pt-16 text-center">
        <h1 className="text-base font-bold">{t("ক্যাটাগরি পাওয়া যায়নি", "Category not found")}</h1>
        <Link href="/categories" className="mt-4 inline-block text-xs font-semibold text-primary">
          {t("সব ক্যাটাগরি", "All categories")}
        </Link>
      </div>
    );
  }

  const isService = cat.kind === "service";
  const list = isService ? [] : products.filter((p) => p.category === cat.slug);
  const total = list.length;

  return (
    <div className="pt-4">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-lg bg-secondary text-xl">{cat.emoji}</span>
        <div className="min-w-0">
          <h1 className="text-base font-bold">{pick(lang, cat.bn, cat.en)}</h1>
          <p className="text-xs text-muted-foreground">
            {lang === "en" ? cat.bn : cat.en}
            {!isService && ` · ${t(`${t.n(total)} টি পণ্য`, `${t.n(total)} products`)}`}
          </p>
        </div>
        {!isService && (
          <Link
            href={`/products?q=&category=${encodeURIComponent(cat.slug)}&sort=popular`}
            className="ml-auto rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold"
          >
            {t("ফিল্টার", "Filter")}
          </Link>
        )}
      </div>

      {pick(lang, cat.desc, cat.descEn) && (
        <p className="mt-2 text-xs text-muted-foreground">{pick(lang, cat.desc, cat.descEn)}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 text-[11px]">
        {cat.homeDelivery && (
          <span className="rounded bg-secondary px-2 py-1 font-bold text-primary-dark">
            {t("হোম ডেলিভারি", "Home delivery")}
          </span>
        )}
        {cat.homeService && (
          <span className="rounded bg-primary/10 px-2 py-1 font-bold text-primary">{t("হোম সার্ভিস", "Home service")}</span>
        )}
        {pick(lang, cat.eta, cat.etaEn) && <span className="text-muted-foreground">{pick(lang, cat.eta, cat.etaEn)}</span>}
        <Link
          href={
            cat.serviceRoute === "/home-diagnostics"
              ? "/home-diagnostics"
              : `/home-services?s=${encodeURIComponent(cat.slug)}`
          }
          className="ml-auto rounded-lg bg-primary px-3 py-1.5 font-bold text-primary-foreground"
        >
          {isService ? t("সেবা বুক করুন", "Book this service") : t("বাসায় সেবা নিন", "Get care at home")}
        </Link>
      </div>

      {!isService && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
          {list.length === 0 && (
            <p className="col-span-full text-xs text-muted-foreground">
              {t("এই ক্যাটাগরিতে শীঘ্রই পণ্য যুক্ত হচ্ছে।", "Products are being added to this category soon.")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

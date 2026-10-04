"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ProductCard } from "@/components/ProductCard";
import { mapProduct } from "@/lib/catalog-db";
import { getProductsByIds } from "@/server/actions/catalog";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";

export default function WishlistPage() {
  const t = useT();
  const { wishlist } = useStore();

  const { data: dbProducts = [], isLoading } = useQuery({
    queryKey: ["wishlist-products", wishlist],
    queryFn: () => getProductsByIds(wishlist),
    enabled: wishlist.length > 0,
    staleTime: 30_000,
  });

  const list = dbProducts.map((p) => mapProduct(p as Parameters<typeof mapProduct>[0]));

  return (
    <div className="pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold">{t("উইশলিস্ট", "Wishlist")}</h1>
        {list.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {t.n(list.length)} {t("টি পণ্য", "items")}
          </span>
        )}
      </div>

      {isLoading && wishlist.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl border border-border bg-card p-4" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="pt-12 text-center">
          <p className="text-4xl">🤍</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {t(
              "উইশলিস্ট খালি — পণ্যের হার্ট আইকনে চাপ দিন।",
              "Your wishlist is empty — tap the heart icon on a product.",
            )}
          </p>
          <Link
            href="/products?q=&category=all&sort=popular"
            className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
          >
            {t("পণ্য দেখুন", "Browse products")}
          </Link>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { RecordMedicineView } from "@/components/RecordMedicineView";
import { useStore, toLine } from "@/lib/store";
import { useT } from "@/lib/i18n";
import type { ShopProduct } from "@/lib/catalog-db";

export default function MedicineDetailClient({ p }: { p: ShopProduct }) {
  const t = useT();
  const { add } = useStore();

  return (
    <div className="pt-4 pb-10">
      <RecordMedicineView productId={p.id} />
      <Link href="/medicines" className="text-[11px] font-semibold text-muted-foreground hover:text-primary">
        ← {t("ঔষধের তালিকা", "Medicine list")}
      </Link>
      <div className="mt-3 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          {p.image ? (
            <div className="relative h-48 w-48 sm:h-52 sm:w-52 shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-white dark:bg-card p-3 shadow-xs">
              <Image
                src={p.image}
                alt={p.en || p.name}
                fill
                className="object-contain p-2"
                style={{ imageRendering: "-webkit-optimize-contrast" }}
                unoptimized
              />
            </div>
          ) : (
            <span className="grid h-28 w-28 shrink-0 place-items-center rounded-2xl bg-secondary text-5xl">
              {p.emoji || "💊"}
            </span>
          )}

          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-extrabold text-navy sm:text-2xl">
              {t(p.name, p.en || p.name)}
            </h1>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              {p.generic} · {[p.strength, p.form, p.pack].filter(Boolean).join(" · ")}
              {p.rx ? " · Rx" : ""}
            </p>
            <p className="mt-1 text-xs font-semibold text-primary">
              {p.manufacturer || p.brand}
            </p>
            {p.therapeuticClass && (
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="font-semibold">{t("গ্রুপ:", "Group:")}</span> {p.therapeuticClass}
              </p>
            )}

            <p className="mt-4 font-display text-2xl font-extrabold text-primary">
              {t.money(p.price)}
              {p.mrp > p.price && (
                <span className="ml-2 text-sm font-normal text-muted-foreground line-through">
                  {t.money(p.mrp)}
                </span>
              )}
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => add(toLine(p))}
                className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 active:scale-95 transition"
              >
                {t("কার্টে যোগ করুন", "Add to cart")}
              </button>
              <Link
                href={`/product/${p.id}`}
                className="rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-semibold hover:bg-muted/40 transition"
              >
                {t("বিস্তারিত তথ্য ও নির্দেশনা", "Full Details & Indications")} →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

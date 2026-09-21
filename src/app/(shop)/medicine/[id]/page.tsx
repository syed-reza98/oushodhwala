"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { RecordMedicineView } from "@/components/RecordMedicineView";
import { useCatalog } from "@/lib/catalog-db";
import { useStore, toLine } from "@/lib/store";
import { useT } from "@/lib/i18n";

export default function MedicineDetailPage() {
  const t = useT();
  const params = useParams<{ id: string }>();
  const { products } = useCatalog();
  const { add } = useStore();
  const p = products.find((x) => x.id === params.id);

  if (!p) {
    return (
      <div className="pt-16 text-center text-sm text-muted-foreground">
        {t("ঔষধ পাওয়া যায়নি।", "Medicine not found.")}{" "}
        <Link href="/medicines" className="font-semibold text-primary underline">
          {t("তালিকায় ফিরুন", "Back to list")}
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-4 pb-10">
      <RecordMedicineView productId={p.id} />
      <Link href="/medicines" className="text-[11px] font-semibold text-muted-foreground hover:text-primary">
        ← {t("ঔষধের তালিকা", "Medicine list")}
      </Link>
      <div className="mt-3 rounded-2xl border border-border bg-card p-4">
        <p className="text-2xl">{p.emoji || "💊"}</p>
        <h1 className="mt-2 font-display text-lg font-extrabold text-navy">{t(p.name, p.en || p.name)}</h1>
        <p className="text-xs text-muted-foreground">
          {p.generic} · {[p.strength, p.form, p.pack].filter(Boolean).join(" · ")}
          {p.rx ? " · Rx" : ""}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{p.manufacturer || p.brand}</p>
        <p className="mt-3 font-display text-xl font-extrabold text-primary">{t.money(p.price)}</p>
        {p.desc && <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t(p.desc, p.descEn || p.desc)}</p>}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => add(toLine(p))}
            className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
          >
            {t("কার্টে যোগ", "Add to cart")}
          </button>
          <Link
            href={`/product/${p.id}`}
            className="rounded-lg border border-border px-4 py-2 text-xs font-semibold"
          >
            {t("প্রোডাক্ট পেজ", "Product page")}
          </Link>
        </div>
      </div>
    </div>
  );
}

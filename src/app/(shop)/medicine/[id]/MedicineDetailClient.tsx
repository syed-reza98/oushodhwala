"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  Pill,
  ArrowRightLeft,
  BookOpen,
  Building2,
  ShieldAlert,
  Baby,
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { RecordMedicineView } from "@/components/RecordMedicineView";
import { useStore, toLine } from "@/lib/store";
import { useT } from "@/lib/i18n";
import type { ShopProduct } from "@/lib/catalog-db";

type GenericMonograph = {
  indications?: string | null;
  indications_en?: string | null;
  pharmacology?: string | null;
  pharmacology_en?: string | null;
  dosage?: string | null;
  dosage_en?: string | null;
  interaction?: string | null;
  interaction_en?: string | null;
  contraindications?: string | null;
  contraindications_en?: string | null;
  side_effects?: string | null;
  side_effects_en?: string | null;
  pregnancy?: string | null;
  pregnancy_en?: string | null;
  precautions?: string | null;
  precautions_en?: string | null;
  therapeutic_class?: string | null;
  therapeutic_class_en?: string | null;
  storage?: string | null;
  storage_en?: string | null;
} | null;

export default function MedicineDetailClient({
  p,
  generic,
  alternatives = [],
  manufacturerProducts = [],
}: {
  p: ShopProduct;
  generic?: GenericMonograph;
  alternatives?: ShopProduct[];
  manufacturerProducts?: ShopProduct[];
}) {
  const t = useT();
  const { add } = useStore();
  const [activeTab, setActiveTab] = useState<"indications" | "dosage" | "pharmacology" | "safety">("indications");

  return (
    <div className="pt-4 pb-12 max-w-5xl mx-auto px-2 sm:px-4">
      <RecordMedicineView productId={p.id} />
      <Link href="/medicines" className="text-xs font-semibold text-muted-foreground hover:text-primary">
        ← {t("ঔষধের তালিকা", "Medicine list")}
      </Link>

      {/* Main Product Card */}
      <div className="mt-3 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          {p.image ? (
            <div className="relative h-48 w-48 sm:h-56 sm:w-56 shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-white dark:bg-card p-3 shadow-xs">
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
            <span className="grid h-36 w-36 shrink-0 place-items-center rounded-2xl bg-secondary text-5xl">
              {p.emoji || "💊"}
            </span>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-extrabold text-navy sm:text-2xl">
                {t(p.name, p.en || p.name)}
              </h1>
              {p.rx && (
                <span className="rounded-md bg-rose-500/10 px-2 py-0.5 text-[11px] font-bold text-rose-600 border border-rose-500/20">
                  Rx (প্রেসক্রিপশন প্রয়োজন)
                </span>
              )}
            </div>

            <p className="mt-1 text-sm font-medium text-muted-foreground">
              <span className="font-semibold text-foreground">{p.generic}</span> · {[p.strength, p.form, p.pack].filter(Boolean).join(" · ")}
            </p>

            <p className="mt-1 text-xs font-semibold text-primary flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              {p.manufacturer || p.brand}
            </p>

            {p.therapeuticClass && (
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="font-semibold">{t("গ্রুপ / থেরাপিউটিক ক্লাস:", "Group:")}</span> {p.therapeuticClass}
              </p>
            )}

            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-display text-3xl font-black text-primary">
                {t.money(p.price)}
              </span>
              {p.mrp > p.price && (
                <span className="text-sm font-normal text-muted-foreground line-through">
                  {t.money(p.mrp)}
                </span>
              )}
              {p.mrp > p.price && (
                <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600">
                  {t("ছাড়")}
                </span>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => add(toLine(p))}
                className="rounded-xl bg-primary px-6 py-3 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 active:scale-95 transition"
              >
                {t("কার্টে যোগ করুন", "Add to cart")}
              </button>
              <Link
                href={`/product/${p.id}`}
                className="rounded-xl border border-border bg-background px-4 py-3 text-xs font-semibold hover:bg-muted/40 transition"
              >
                {t("অর্ডার চেকআউট ও বিবরণ", "Full Details & Checkout")} →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Alternative Generic Brands */}
      {alternatives.length > 0 && (
        <div className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-primary" />
                {t("একই জেনেরিকের সাশ্রয়ী বিকল্প ব্র্যান্ডসমূহ", "Generic Alternatives (Same Composition)")}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t(
                  `'${p.generic}' জেনেরিকের অন্যান্য উপলব্ধ ব্র্যান্ড — দাম তুলনা করে বেছে নিন`,
                  `Other available brands with ${p.generic} sorted by price`,
                )}
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
              {t.n(alternatives.length)} {t("টি", "brands")}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {alternatives.map((alt) => (
              <div
                key={alt.id}
                className="flex flex-col justify-between rounded-xl border border-border/80 bg-background/60 p-3.5 transition hover:border-primary/50 shadow-2xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/medicine/${alt.id}`}
                      className="font-bold text-xs text-foreground hover:text-primary transition line-clamp-1"
                    >
                      {alt.name}
                    </Link>
                    <span className="font-bold text-xs text-primary shrink-0">
                      {t.money(alt.price)}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {alt.strength ? `${alt.strength} · ` : ""}{alt.manufacturer || alt.brand}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                  <Link
                    href={`/medicine/${alt.id}`}
                    className="text-[11px] font-semibold text-muted-foreground hover:text-primary"
                  >
                    {t("বিস্তারিত", "View")}
                  </Link>
                  <button
                    type="button"
                    onClick={() => add(toLine(alt))}
                    className="rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary hover:text-primary-foreground transition"
                  >
                    {t("+ যোগ করুন", "+ Add")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Medical Monograph (generic_info) */}
      {generic && (
        <div className="mt-8 rounded-2xl border border-primary/20 bg-card p-5 shadow-xs">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <BookOpen className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-base font-bold text-foreground">
                {t("চিকিৎসা তথ্য ও নির্দেশিকা (Drug Monograph)", "Medical Information & Monograph")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t(
                  `${p.generic} এর ক্লিনিক্যাল ফার্মাকোলজি, মাত্রা ও সতর্কতাসমূহ`,
                  `Clinical pharmacology, dosage, and precautions for ${p.generic}`,
                )}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 border-b border-border pb-3">
            {[
              { id: "indications", labelBn: "নির্দেশনা", labelEn: "Indications", icon: Activity },
              { id: "dosage", labelBn: "সেবনবিধি", labelEn: "Dosage", icon: Pill },
              { id: "pharmacology", labelBn: "ফার্মাকোলজি", labelEn: "Pharmacology", icon: BookOpen },
              { id: "safety", labelBn: "পার্শ্বপ্রতিক্রিয়া ও সতর্কতা", labelEn: "Warnings & Safety", icon: ShieldAlert },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "border border-border bg-secondary/30 text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {t(tab.labelBn, tab.labelEn)}
              </button>
            ))}
          </div>

          <div className="mt-4 text-xs leading-relaxed text-foreground space-y-4">
            {activeTab === "indications" && (
              <div>
                <h3 className="font-bold text-sm text-primary mb-1">{t("নির্দেশনা (Indications):")}</h3>
                <p className="whitespace-pre-line text-muted-foreground">
                  {generic.indications || generic.indications_en || t("তথ্য পাওয়া যায়নি।")}
                </p>
              </div>
            )}

            {activeTab === "dosage" && (
              <div>
                <h3 className="font-bold text-sm text-primary mb-1">{t("সেবনবিধি ও মাত্রা (Dosage & Administration):")}</h3>
                <p className="whitespace-pre-line text-muted-foreground">
                  {generic.dosage || generic.dosage_en || t("ডাক্তারের পরামর্শ অনুযায়ী সেব্য।")}
                </p>
              </div>
            )}

            {activeTab === "pharmacology" && (
              <div>
                <h3 className="font-bold text-sm text-primary mb-1">{t("ফার্মাকোলজি (Pharmacology):")}</h3>
                <p className="whitespace-pre-line text-muted-foreground">
                  {generic.pharmacology || generic.pharmacology_en || t("তথ্য সংরক্ষিত নেই।")}
                </p>
              </div>
            )}

            {activeTab === "safety" && (
              <div className="space-y-3">
                {generic.contraindications && (
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                    <h4 className="font-bold text-rose-600 flex items-center gap-1.5 mb-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {t("বিরুদ্ধ ব্যবহার (Contraindications):")}
                    </h4>
                    <p className="text-muted-foreground">{generic.contraindications}</p>
                  </div>
                )}
                {generic.side_effects && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                    <h4 className="font-bold text-amber-600 flex items-center gap-1.5 mb-1">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      {t("পার্শ্বপ্রতিক্রিয়া (Side Effects):")}
                    </h4>
                    <p className="text-muted-foreground">{generic.side_effects}</p>
                  </div>
                )}
                {generic.pregnancy && (
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
                    <h4 className="font-bold text-blue-600 flex items-center gap-1.5 mb-1">
                      <Baby className="h-3.5 w-3.5" />
                      {t("গর্ভাবস্থা ও স্তন্যদানকালীন ব্যবহার (Pregnancy & Lactation):")}
                    </h4>
                    <p className="text-muted-foreground">{generic.pregnancy}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Other Products from Same Manufacturer */}
      {manufacturerProducts.length > 0 && (
        <div className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                {t(`${p.manufacturer || p.brand} এর অন্যান্য ঔষধ`, `More from ${p.manufacturer || p.brand}`)}
              </h2>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {manufacturerProducts.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-border bg-background p-3 transition hover:border-primary/40"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <Link
                    href={`/medicine/${item.id}`}
                    className="font-bold text-xs text-foreground hover:text-primary transition truncate block"
                  >
                    {item.name}
                  </Link>
                  <p className="text-[10px] text-muted-foreground truncate">{item.generic}</p>
                  <p className="text-xs font-bold text-primary mt-1">{t.money(item.price)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => add(toLine(item))}
                  className="rounded-lg bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary hover:bg-primary hover:text-primary-foreground transition shrink-0"
                >
                  {t("+")}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

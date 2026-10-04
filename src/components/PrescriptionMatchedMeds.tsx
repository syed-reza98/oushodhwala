"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  Sparkles,
  ArrowRight,
  Pill,
  Building2,
  Layers,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import type { RxExtractedItem } from "@/server/ai/gateway";
import {
  matchPrescriptionMedicines,
  type MatchedRxItem,
  type MatchedProduct,
} from "@/server/actions/prescription-matcher";

export function PrescriptionMatchedMeds({
  prescriptionId,
  items,
}: {
  prescriptionId: string;
  items: RxExtractedItem[];
}) {
  const t = useT();
  const router = useRouter();
  const { add, addMany, setAttachedPrescriptionId } = useStore();

  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<MatchedRxItem[]>([]);
  const [selectedProds, setSelectedProds] = useState<Record<number, MatchedProduct>>({});
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [expandedAlts, setExpandedAlts] = useState<Record<number, boolean>>({});
  const [ordering, setOrdering] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!items || items.length === 0) {
      setLoading(false);
      setMatches([]);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const res = await matchPrescriptionMedicines(items);
        if (cancelled) return;
        setMatches(res);

        const initialProds: Record<number, MatchedProduct> = {};
        const initialQtys: Record<number, number> = {};
        res.forEach((m, idx) => {
          if (m.matchedProduct) {
            initialProds[idx] = m.matchedProduct;
          }
          initialQtys[idx] = m.calculatedQty || 1;
        });
        setSelectedProds(initialProds);
        setQuantities(initialQtys);
      } catch (err) {
        console.error("Prescription matching error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [items]);

  const handleQtyChange = (index: number, delta: number) => {
    setQuantities((prev) => {
      const cur = prev[index] || 1;
      const next = Math.max(1, cur + delta);
      return { ...prev, [index]: next };
    });
  };

  const handleSelectAlternative = (index: number, alt: MatchedProduct) => {
    setSelectedProds((prev) => ({ ...prev, [index]: alt }));
    toast.info(
      t(
        `বিকল্প ব্র্যান্ড '${alt.name}' নির্বাচিত হয়েছে`,
        `Alternative '${alt.name}' selected`
      )
    );
  };

  const toggleAlts = (index: number) => {
    setExpandedAlts((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handleAddSingle = (index: number) => {
    const prod = selectedProds[index];
    if (!prod) return;
    const qty = quantities[index] || 1;

    add(
      {
        id: prod.id,
        kind: "product",
        name: prod.name,
        price: prod.price,
      },
      qty
    );
    setAttachedPrescriptionId(prescriptionId);
    toast.success(
      t(
        `'${prod.name}' (${t.n(qty)} টি) কার্টে যোগ হয়েছে!`,
        `Added '${prod.name}' (${qty}) to cart!`
      )
    );
  };

  const handleOrderAll = () => {
    setOrdering(true);
    try {
      const linesToAdd: Array<{
        line: { id: string; kind: "product"; name: string; price: number };
        qty: number;
      }> = [];

      matches.forEach((_, idx) => {
        const prod = selectedProds[idx];
        if (prod) {
          const qty = quantities[idx] || 1;
          linesToAdd.push({
            line: {
              id: prod.id,
              kind: "product",
              name: prod.name,
              price: prod.price,
            },
            qty,
          });
        }
      });

      if (linesToAdd.length === 0) {
        toast.error(
          t(
            "কোনো ঔষধ নির্বাচন করা হয়নি",
            "No matched medicine available to order"
          )
        );
        return;
      }

      addMany(linesToAdd);
      setAttachedPrescriptionId(prescriptionId);
      toast.success(
        t(
          "প্রেসক্রিপশনের সকল ঔষধ কার্টে যোগ হয়েছে! চেকআউট পেজে নিয়ে যাওয়া হচ্ছে...",
          "All prescription medicines added to cart! Redirecting to checkout..."
        )
      );
      router.push("/checkout");
    } finally {
      setOrdering(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-primary/20 bg-card p-6 shadow-xs mt-4">
        <div className="flex items-center gap-3 text-sm font-semibold text-primary">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>
            {t(
              "ক্যাটালগ থেকে ঔষধের দাম ও স্টক মেলানো হচ্ছে...",
              "Cross-referencing prescription with 25,000+ medicines catalog..."
            )}
          </span>
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return null;
  }

  // Calculate totals
  let totalOrderEstimate = 0;
  let matchedCount = 0;
  matches.forEach((_, idx) => {
    const prod = selectedProds[idx];
    if (prod) {
      matchedCount++;
      const qty = quantities[idx] || 1;
      totalOrderEstimate += prod.price * qty;
    }
  });

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-card p-4 sm:p-5 shadow-xs mt-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <Pill className="h-4 w-4" />
            </span>
            <h2 className="text-base font-bold text-foreground">
              {t("ক্যাটালগ ম্যাচিং ও মূল্য তালিকা", "Catalog Matching & Pricing")}
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t(
              "প্রেসক্রিপশন অনুযায়ী সরকারি খুচরা মূল্যে সঠিক ঔষধ বাছাই এবং সরাসরি অর্ডার",
              "Matched items with live catalog pricing, dosage quantities, and 1-click ordering"
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 border border-emerald-500/20">
            {t.n(matchedCount)}/{t.n(matches.length)} {t("টি প্রস্তুত", "Ready")}
          </span>
        </div>
      </div>

      {/* Medication Cards List */}
      <div className="mt-4 space-y-3.5">
        {matches.map((item, idx) => {
          const selected = selectedProds[idx];
          const qty = quantities[idx] || 1;
          const subtotal = selected ? selected.price * qty : 0;
          const isExact = item.matchType === "exact";
          const isSubstitute = item.matchType === "generic_substitute";
          const isUnmatched = !selected;
          const hasAlts = item.alternatives && item.alternatives.length > 0;
          const isExpanded = !!expandedAlts[idx];

          return (
            <div
              key={idx}
              className={`rounded-xl border transition-all ${
                selected
                  ? "border-border bg-background/60 hover:border-primary/40"
                  : "border-amber-500/30 bg-amber-500/5"
              } p-3.5 sm:p-4`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                {/* Left: Product Media & Information */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  {/* Thumbnail */}
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-secondary/50 flex items-center justify-center">
                    {selected && selected.imageUrl && !selected.imageUrl.includes("default-medicine") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selected.imageUrl}
                        alt={selected.name}
                        className="h-full w-full object-contain p-1"
                      />
                    ) : (
                      <Pill className="h-7 w-7 text-muted-foreground/60" />
                    )}
                  </div>

                  {/* Text Details */}
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-foreground truncate">
                        {selected ? selected.name : item.extractedName}
                      </span>

                      {/* Match Badge */}
                      {isExact && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 border border-emerald-500/20">
                          <CheckCircle2 className="h-3 w-3" />
                          {t("হুবহু ম্যাচ", "Exact Match")}
                        </span>
                      )}
                      {isSubstitute && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600 border border-blue-500/20">
                          <Layers className="h-3 w-3" />
                          {t("বিকল্প জেনেরিক", "Generic Substitute")}
                        </span>
                      )}
                      {isUnmatched && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 border border-amber-500/20">
                          <AlertCircle className="h-3 w-3" />
                          {t("ফার্মাসিস্ট নিশ্চিত করবেন", "Pharmacist Review")}
                        </span>
                      )}
                    </div>

                    {/* Generic & Manufacturer */}
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-foreground/80">
                        {selected ? selected.generic : item.extractedGeneric || item.extractedName}
                      </span>
                      {selected?.manufacturer && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            {selected.manufacturer}
                          </span>
                        </>
                      )}
                    </p>

                    {/* Prescribed Dosage Instructions */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                      {item.dose && (
                        <span className="rounded-md bg-secondary px-2 py-0.5 font-mono font-semibold text-primary">
                          {t("ডোজ:", "Dose:")} {item.dose}
                        </span>
                      )}
                      {item.duration && (
                        <span className="rounded-md bg-secondary px-2 py-0.5 text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {item.duration}
                        </span>
                      )}
                      {item.instruction && (
                        <span className="text-muted-foreground italic">
                          ({item.instruction})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Pricing, Quantity Stepper, and Actions */}
                {selected ? (
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
                    {/* Unit & Subtotal Price */}
                    <div className="text-left sm:text-right">
                      <div className="text-sm font-bold text-foreground">
                        {t.money(subtotal)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {t.money(selected.price)} / {selected.form || t("পিস", "pc")}
                      </div>
                    </div>

                    {/* Stepper + Add Button */}
                    <div className="flex items-center gap-2">
                      {/* Quantity Stepper */}
                      <div className="flex items-center rounded-lg border border-border bg-secondary/50 p-0.5">
                        <button
                          type="button"
                          onClick={() => handleQtyChange(idx, -1)}
                          className="h-6 w-6 rounded flex items-center justify-center text-foreground hover:bg-background transition"
                          title="কমান"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center text-xs font-bold font-mono text-foreground">
                          {t.n(qty)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQtyChange(idx, 1)}
                          className="h-6 w-6 rounded flex items-center justify-center text-foreground hover:bg-background transition"
                          title="বাড়ান"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Single Add to Cart */}
                      <button
                        type="button"
                        onClick={() => handleAddSingle(idx)}
                        className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition"
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{t("কার্ট", "Cart")}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs text-amber-700 font-medium sm:text-right">
                    {t(
                      "ফার্মাসিস্ট পর্যালোচনার পর এই ঔষধটি যুক্ত করবেন",
                      "Pharmacist will add this item upon order review"
                    )}
                  </div>
                )}
              </div>

              {/* Alternative Brands Toggle Section */}
              {hasAlts && (
                <div className="mt-3 pt-2.5 border-t border-border/60">
                  <button
                    type="button"
                    onClick={() => toggleAlts(idx)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline"
                  >
                    <span>
                      {t("বিকল্প ব্র্যান্ড দেখুন", "View alternative brands")} (
                      {t.n(item.alternatives.length)} {t("টি", "available")})
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="grid gap-2 sm:grid-cols-3 mt-2">
                      {item.alternatives.map((alt) => {
                        const isCurrent = selected?.id === alt.id;
                        return (
                          <div
                            key={alt.id}
                            className={`rounded-lg border p-2 text-xs flex flex-col justify-between ${
                              isCurrent
                                ? "border-primary bg-primary/5"
                                : "border-border bg-card hover:border-primary/40"
                            }`}
                          >
                            <div className="space-y-0.5">
                              <p className="font-bold text-foreground text-[11px] truncate">
                                {alt.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {alt.manufacturer}
                              </p>
                              <p className="text-xs font-bold text-primary mt-1">
                                {t.money(alt.price)}
                              </p>
                            </div>

                            <button
                              type="button"
                              disabled={isCurrent}
                              onClick={() => handleSelectAlternative(idx, alt)}
                              className={`mt-2 w-full rounded-md py-1 text-[10px] font-bold transition ${
                                isCurrent
                                  ? "bg-secondary text-muted-foreground cursor-default"
                                  : "bg-primary text-primary-foreground hover:opacity-90"
                              }`}
                            >
                              {isCurrent ? t("নির্বাচিত", "Selected") : t("বাছাই করুন", "Choose")}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Action / Order All Summary Card */}
      {matchedCount > 0 && (
        <div className="mt-5 rounded-xl border border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 via-primary/5 to-transparent p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block">
              {t("প্রেসক্রিপশন অর্ডার সামারি", "Prescription Order Summary")}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-foreground">
                {t("আনুমানিক মোট:", "Estimated Total:")}
              </span>
              <span className="text-2xl font-black text-emerald-600">
                {t.money(totalOrderEstimate)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t(
                `${t.n(matchedCount)} টি ঔষধ আপনার কার্টে যুক্ত হবে`,
                `${matchedCount} prescribed medicines will be staged into your cart`
              )}
            </p>
          </div>

          <button
            type="button"
            disabled={ordering}
            onClick={handleOrderAll}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-emerald-700 active:scale-[0.98] transition disabled:opacity-50"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>
              {ordering
                ? t("অর্ডার প্রসেস হচ্ছে...", "Processing order...")
                : t("প্রেসক্রিপশনের সব ঔষধ অর্ডার করুন", "Order All Prescribed Medicines")}
            </span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

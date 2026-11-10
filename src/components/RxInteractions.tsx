"use client";

import { useState } from "react";
import { ShieldAlert, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import {
  analyzeDrugInteractions,
  type analyzeDrugInteractions as _unused,
} from "@/server/actions/prescriptions";
import type { DrugInteractionResult } from "@/server/ai/gateway";

export type InteractionMed = { name: string; generic?: string; strength?: string };

const TONE: Record<string, { cls: string; bn: string; en: string }> = {
  major: { cls: "border-sale/40 bg-sale/10 text-sale", bn: "উচ্চ ঝুঁকি", en: "Major" },
  moderate: { cls: "border-amber-500/40 bg-amber-500/10 text-amber-600", bn: "মাঝারি ঝুঁকি", en: "Moderate" },
  minor: { cls: "border-border bg-secondary text-muted-foreground", bn: "কম ঝুঁকি", en: "Minor" },
};

/**
 * AI-powered Drug–Drug Interaction Checker
 */
export function RxInteractions({ meds }: { meds: InteractionMed[] }) {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<DrugInteractionResult | null>(null);

  const run = async () => {
    if (meds.length < 2) return;
    setLoading(true);
    try {
      const data = await analyzeDrugInteractions(meds);
      setRes(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Interaction check failed");
    } finally {
      setLoading(false);
    }
  };

  const worst = res?.interactions.some((i) => i.severity === "major")
    ? "major"
    : res?.interactions.some((i) => i.severity === "moderate")
      ? "moderate"
      : "minor";

  return (
    <section className="mt-4 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-sale" />
          <h2 className="text-xs font-bold">{t("ঔষধ-ঔষধ ইন্টার‍্যাকশন পরীক্ষা (AI)", "Drug–drug interaction check (AI)")}</h2>
        </div>
        <button
          type="button"
          onClick={() => void run()}
          disabled={loading || meds.length < 2}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-[11px] font-bold shadow-xs hover:border-primary/50 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> : null}
          {res ? t("পুনরায় পরীক্ষা", "Re-check") : t("পরীক্ষা করুন", "Check now")}
        </button>
      </div>

      {meds.length < 2 && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {t("অন্তত দুটি ঔষধের তালিকা থাকলে AI দ্বারা সম্ভাব্য প্রতিক্রিয়া পরীক্ষা করা যাবে।", "Select at least two medicines to run interaction analysis.")}
        </p>
      )}

      {res && (
        <div className="mt-3 space-y-2">
          {res.interactions.length === 0 ? (
            <p className="rounded-lg bg-emerald-500/10 p-2.5 text-[11px] font-semibold text-emerald-600">
              ✅ {t("উল্লেখযোগ্য কোনো ক্ষতিকর ড্রাগ ইন্টার‍্যাকশন পাওয়া যায়নি।", "No significant harmful drug interactions detected.")}
            </p>
          ) : (
            <>
              <p className={`rounded-lg border p-2 text-[11px] font-bold ${TONE[worst]?.cls}`}>
                ⚠️ {t.n(res.interactions.length)} {t("সম্ভাব্য ইন্টার‍্যাকশন", "possible interaction(s)")} ·{" "}
                {t("সর্বোচ্চ ঝুঁকি", "Highest risk")}: {t(TONE[worst]?.bn ?? "", TONE[worst]?.en ?? "")}
              </p>
              <ul className="space-y-2">
                {res.interactions.map((it, i) => {
                  const tone = TONE[it.severity] ?? TONE["minor"]!;
                  return (
                    <li key={i} className={`rounded-lg border p-2.5 text-[11px] ${tone.cls}`}>
                      <div className="flex items-center justify-between font-bold text-foreground">
                        <span>
                          {it.a} + {it.b}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] ${tone.cls}`}>
                          {t(tone.bn, tone.en)}
                        </span>
                      </div>
                      <p className="mt-1 text-foreground/85 leading-relaxed">{it.effect}</p>
                      {it.advice && (
                        <p className="mt-1 font-semibold text-foreground">
                          {t("পরামর্শ", "Advice")}: {it.advice}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          {res.summary && (
            <p className="text-[10px] text-muted-foreground">
              ℹ️ {res.summary}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

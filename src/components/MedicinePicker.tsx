"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Search, X, Check, ArrowRightLeft, Sparkles } from "lucide-react";
import { useT } from "@/lib/i18n";
import { searchProducts } from "@/server/actions/catalog";

export type PickedProduct = {
  id: string;
  name: string;
  en?: string | null;
  generic?: string | null;
  dosageForm?: string | null;
  strength?: string | null;
  price?: string | number | null;
  mrp?: string | number | null;
  manufacturer?: string | null;
  packSize?: string | null;
};

export function MedicinePicker({
  value,
  onChange,
  onPick,
  genericHint,
  placeholder,
  className = "",
  error = false,
  inputClassName = "",
}: {
  value: string;
  onChange: (v: string) => void;
  onPick?: (p: PickedProduct) => void;
  genericHint?: string;
  placeholder?: string;
  className?: string;
  error?: boolean;
  inputClassName?: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState(value || "");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PickedProduct[]>([]);
  const [genericAlternatives, setGenericAlternatives] = useState<PickedProduct[]>([]);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTerm(value || "");
  }, [value]);

  // Click outside to close
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowAlternatives(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Search when typing
  useEffect(() => {
    const q = term.trim();
    if (!open || q.length < 1) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchProducts({ q, limit: 12 });
        setResults((res?.rows || []) as PickedProduct[]);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [term, open]);

  // Search generic alternatives when genericHint is provided or requested
  const loadAlternatives = async (gen: string) => {
    if (!gen.trim()) return;
    setLoading(true);
    setShowAlternatives(true);
    try {
      const res = await searchProducts({ q: gen.trim(), limit: 15, sort: "low" });
      setGenericAlternatives((res?.rows || []) as PickedProduct[]);
    } catch {
      setGenericAlternatives([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (prod: PickedProduct) => {
    onChange(prod.name);
    setTerm(prod.name);
    onPick?.(prod);
    setOpen(false);
    setShowAlternatives(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative flex items-center">
        <input
          type="text"
          value={term}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setTerm(e.target.value);
            onChange(e.target.value);
            setOpen(true);
            setShowAlternatives(false);
          }}
          placeholder={placeholder || t("ঔষধ খুঁজুন...", "Search medicine...")}
          className={`w-full rounded-lg border px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-hidden pr-14 ${
            error
              ? "border-destructive text-destructive bg-destructive/5"
              : "border-border bg-card"
          } ${inputClassName}`}
        />

        <div className="absolute right-1.5 flex items-center gap-1">
          {genericHint && (
            <button
              type="button"
              onClick={() => {
                setOpen(true);
                void loadAlternatives(genericHint);
              }}
              title={t("বিকল্প ব্র্যান্ড দেখুন", "View generic alternatives")}
              className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-primary transition"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
            </button>
          )}

          {term && (
            <button
              type="button"
              onClick={() => {
                setTerm("");
                onChange("");
                setResults([]);
              }}
              className="rounded p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 w-full min-w-72 overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-xl backdrop-blur-md">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              {t("খোঁজা হচ্ছে...", "Searching medicines...")}
            </div>
          ) : showAlternatives ? (
            <div>
              <div className="mb-2 flex items-center justify-between border-b border-border pb-1.5">
                <span className="text-[11px] font-bold text-primary flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  {t("একই জেনেরিকের সাশ্রয়ী বিকল্পসমূহ", "Generic Alternatives (Low Price)")}
                </span>
                <button
                  type="button"
                  onClick={() => setShowAlternatives(false)}
                  className="text-[10px] text-muted-foreground hover:underline"
                >
                  {t("সাধারণ সার্চে ফিরুন", "Back to search")}
                </button>
              </div>

              {genericAlternatives.length > 0 ? (
                <div className="space-y-1">
                  {genericAlternatives.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => handleSelect(p)}
                      className="cursor-pointer rounded-lg border border-transparent p-2 text-xs transition hover:border-primary/40 hover:bg-secondary flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-foreground">
                          {p.name} {p.strength && <span className="font-normal text-muted-foreground">({p.strength})</span>}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {p.generic} · {p.manufacturer}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-primary">৳{p.price}</span>
                        {p.mrp && Number(p.mrp) > Number(p.price) && (
                          <p className="text-[10px] line-through text-muted-foreground">৳{p.mrp}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  {t("কোনো বিকল্প ব্র্যান্ড পাওয়া যায়নি।", "No alternatives found.")}
                </p>
              )}
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-1">
              {results.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleSelect(p)}
                  className="cursor-pointer rounded-lg border border-transparent p-2 text-xs transition hover:border-primary/40 hover:bg-secondary flex items-center justify-between"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="font-bold text-foreground truncate">
                      {p.name} {p.strength && <span className="font-normal text-muted-foreground">({p.strength})</span>}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {p.generic} {p.manufacturer ? `· ${p.manufacturer}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-primary">৳{p.price}</span>
                    {p.generic && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void loadAlternatives(p.generic!);
                        }}
                        className="block text-[10px] text-primary hover:underline"
                      >
                        {t("বিকল্প?", "Alt?")}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : term.length >= 2 ? (
            <div className="py-4 text-center text-xs text-muted-foreground">
              {t("কোনো ঔষধ মেলেনি। কাস্টম নাম হিসেবে ব্যবহার করুন।", "No matches. Use custom name.")}
            </div>
          ) : (
            <div className="py-3 text-center text-[11px] text-muted-foreground">
              {t("ঔষধের নাম টাইপ করুন (বাংলা বা ইংরেজি)", "Type medicine name (Bengali or English)")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

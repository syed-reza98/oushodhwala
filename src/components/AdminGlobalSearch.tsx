"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, Loader2, X } from "lucide-react";
import { useDismissable } from "@/hooks/useDismissable";

type Hit = { kind: "order" | "product" | "customer"; tab: string; title: string; sub: string };

const KIND_BN: Record<Hit["kind"], string> = {
  order: "অর্ডার",
  product: "প্রোডাক্ট",
  customer: "কাস্টমার",
};

export function AdminGlobalSearch({ onSelect }: { onSelect: (tab: string) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const { ref: box } = useDismissable<HTMLDivElement>(open, close, { restoreFocus: false });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
        input.current?.select();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const term = q.trim();
    setActive(-1);
    if (term.length < 2) {
      setHits([]);
      setBusy(false);
      return;
    }
    setBusy(true);
    const id = setTimeout(async () => {
      try {
        const res = await fetch("/api/admin/dashboard", { cache: "no-store" });
        if (!res.ok) throw new Error("search failed");
        const data = (await res.json()) as {
          orders: { order_no: string; customer_name?: string | null; total: number; status: string }[];
          products: { name: string; stock: number }[];
        };
        const low = term.toLowerCase();
        const out: Hit[] = [
          ...data.orders
            .filter(
              (o) =>
                o.order_no?.toLowerCase().includes(low) ||
                (o.customer_name ?? "").toLowerCase().includes(low),
            )
            .slice(0, 5)
            .map((o) => ({
              kind: "order" as const,
              tab: "orders",
              title: `#${o.order_no}`,
              sub: `${o.customer_name ?? ""} · ৳${Math.round(Number(o.total || 0))}`,
            })),
          ...data.products
            .filter((p) => p.name?.toLowerCase().includes(low))
            .slice(0, 5)
            .map((p) => ({
              kind: "product" as const,
              tab: "products",
              title: p.name,
              sub: `স্টক ${p.stock ?? 0}`,
            })),
        ];
        setHits(out);
      } catch {
        setHits([]);
      } finally {
        setBusy(false);
      }
    }, 250);
    return () => clearTimeout(id);
  }, [q]);

  const pick = (h: Hit) => {
    onSelect(h.tab);
    setOpen(false);
    setQ("");
  };

  return (
    <div ref={box} className="relative w-full max-w-md">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          ref={input}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="অর্ডার / প্রোডাক্ট খুঁজুন (Ctrl+K)"
          className="w-full bg-transparent text-xs outline-none"
        />
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        {q && (
          <button type="button" onClick={() => setQ("")} className="text-muted-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {open && hits.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-border bg-card py-1 shadow-lg">
          {hits.map((h, i) => (
            <li key={`${h.kind}-${h.title}-${i}`}>
              <button
                type="button"
                onClick={() => pick(h)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full flex-col px-3 py-2 text-left text-xs ${
                  active === i ? "bg-secondary" : ""
                }`}
              >
                <span className="font-semibold text-navy">
                  {KIND_BN[h.kind]} · {h.title}
                </span>
                <span className="text-[10px] text-muted-foreground">{h.sub}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

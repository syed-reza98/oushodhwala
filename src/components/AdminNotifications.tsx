"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, ShoppingCart, PackageX } from "lucide-react";
import { bn } from "@/data/catalog";

type Item = {
  id: string;
  tab: string;
  icon: "orders" | "inventory";
  title: string;
  sub: string;
};

const ICONS = {
  orders: ShoppingCart,
  inventory: PackageX,
} as const;

async function load(): Promise<Item[]> {
  const res = await fetch("/api/admin/dashboard", { cache: "no-store" });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    orders: { id: string; order_no: string; customer_name?: string | null; total: number; status: string }[];
    products: { id: string; name: string; stock: number; low_stock_threshold: number }[];
  };

  const items: Item[] = [];
  for (const o of data.orders.filter((x) => x.status === "pending" || x.status === "confirmed").slice(0, 6)) {
    items.push({
      id: `o-${o.id}`,
      tab: "orders",
      icon: "orders",
      title: `নতুন অর্ডার #${o.order_no}`,
      sub: `${o.customer_name ?? ""} · ৳${bn(Math.round(Number(o.total || 0)))}`,
    });
  }
  for (const p of data.products.filter((x) => x.stock <= x.low_stock_threshold).slice(0, 5)) {
    items.push({
      id: `p-${p.id}`,
      tab: "products",
      icon: "inventory",
      title: `স্টক কম: ${p.name}`,
      sub: `বাকি ${bn(Number(p.stock || 0))} টি`,
    });
  }
  return items;
}

export function AdminNotifications({ onSelect }: { onSelect: (tab: string) => void }) {
  const [open, setOpen] = useState(false);
  const { data: items = [] } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: load,
    refetchInterval: 60_000,
  });

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {items.length > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
            {items.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-border bg-card shadow-lg">
          <p className="border-b border-border px-3 py-2 text-xs font-bold">নোটিফিকেশন</p>
          <ul className="max-h-80 overflow-auto">
            {items.map((it) => {
              const Icon = ICONS[it.icon];
              return (
                <li key={it.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(it.tab);
                      setOpen(false);
                    }}
                    className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-secondary"
                  >
                    <Icon className="mt-0.5 h-3.5 w-3.5 text-primary" />
                    <span>
                      <span className="block font-semibold text-navy">{it.title}</span>
                      <span className="text-[10px] text-muted-foreground">{it.sub}</span>
                    </span>
                  </button>
                </li>
              );
            })}
            {items.length === 0 && (
              <li className="px-3 py-6 text-center text-[11px] text-muted-foreground">কোনো নতুন নোটিফিকেশন নেই</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

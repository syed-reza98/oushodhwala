"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Heart, History, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/lib/i18n";

type MedItem = {
  id: string;
  name: string;
  en?: string | null;
  generic?: string | null;
  form?: string | null;
  strength?: string | null;
  price: string;
  emoji?: string | null;
  lastViewedAt?: string;
};

export default function AccountMedicinesPage() {
  const t = useT();
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"favorites" | "recent">("favorites");

  const listQ = useQuery({
    queryKey: ["account-medicines"],
    enabled: !!user,
    queryFn: async () => {
      const res = await fetch("/api/account/medicines", { cache: "no-store" });
      if (!res.ok) throw new Error("medicines fetch failed");
      return res.json() as Promise<{ favorites: MedItem[]; recent: MedItem[] }>;
    },
  });

  const toggleFav = useMutation({
    mutationFn: async (productId: string) => {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "toggle", productId }),
      });
      if (!res.ok) throw new Error("toggle failed");
      return res.json() as Promise<{ favorite: boolean }>;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["account-medicines"] }),
  });

  if (loading) {
    return (
      <p className="pt-16 text-center text-sm text-muted-foreground">
        {t("লোড হচ্ছে...", "Loading...")}
      </p>
    );
  }

  if (!user) {
    return (
      <div className="pt-16 text-center">
        <p className="text-4xl">💊</p>
        <h1 className="mt-3 text-base font-bold">
          {t("ঔষধ তালিকা দেখতে লগইন করুন", "Log in to view your medicines")}
        </h1>
        <Link
          href="/auth"
          className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
        >
          {t("লগইন করুন", "Log in")}
        </Link>
      </div>
    );
  }

  const favorites = listQ.data?.favorites ?? [];
  const recent = listQ.data?.recent ?? [];
  const items = tab === "favorites" ? favorites : recent;
  const favIds = new Set(favorites.map((m) => m.id));

  return (
    <div className="pt-4">
      <Link href="/account" className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
        <ArrowLeft className="h-3.5 w-3.5" /> {t("একাউন্ট", "Account")}
      </Link>
      <h1 className="mt-3 text-base font-bold">{t("আমার ঔষধ", "My medicines")}</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        {t("প্রিয় ও সম্প্রতি দেখা ঔষধ।", "Favorites and recently viewed medicines.")}
      </p>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setTab("favorites")}
          className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
            tab === "favorites"
              ? "border-primary bg-secondary text-primary-dark"
              : "border-border text-muted-foreground"
          }`}
        >
          <Heart className="h-3 w-3" /> {t("প্রিয়", "Favorites")} ({t.n(favorites.length)})
        </button>
        <button
          type="button"
          onClick={() => setTab("recent")}
          className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
            tab === "recent"
              ? "border-primary bg-secondary text-primary-dark"
              : "border-border text-muted-foreground"
          }`}
        >
          <History className="h-3 w-3" /> {t("সাম্প্রতিক", "Recent")} ({t.n(recent.length)})
        </button>
      </div>

      {listQ.isLoading && (
        <p className="mt-3 text-xs text-muted-foreground">{t("লোড হচ্ছে...", "Loading...")}</p>
      )}

      {!listQ.isLoading && items.length === 0 && (
        <div className="mt-8 text-center">
          <p className="text-3xl">{tab === "favorites" ? "🤍" : "🕐"}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {tab === "favorites"
              ? t("এখনো কোনো প্রিয় ঔষধ নেই।", "No favorite medicines yet.")
              : t("এখনো কোনো সাম্প্রতিক ঔষধ নেই।", "No recently viewed medicines yet.")}
          </p>
          <Link
            href="/products"
            className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
          >
            {t("পণ্য দেখুন", "Browse products")}
          </Link>
        </div>
      )}

      <div className="mt-3 space-y-2">
        {items.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
          >
            <span className="text-xl">{m.emoji || "💊"}</span>
            <div className="min-w-0 flex-1">
              <Link href={`/product/${m.id}`} className="text-xs font-bold hover:text-primary">
                {t(m.name, m.en || m.name)}
              </Link>
              <p className="text-[11px] text-muted-foreground">
                {[m.generic, m.strength, m.form].filter(Boolean).join(" · ")}
              </p>
              <p className="text-[11px] font-semibold text-primary">৳{Number(m.price).toFixed(2)}</p>
            </div>
            <button
              type="button"
              disabled={toggleFav.isPending}
              onClick={() => toggleFav.mutate(m.id)}
              className="rounded-lg border border-border p-2 disabled:opacity-60"
              aria-label={favIds.has(m.id) ? "Remove favorite" : "Add favorite"}
            >
              <Star
                className={`h-4 w-4 ${
                  favIds.has(m.id) ? "fill-primary text-primary" : "text-muted-foreground"
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

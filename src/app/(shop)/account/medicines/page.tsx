"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bell, BellOff, Calendar, Clock, Heart, History, Plus, Star, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";

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

type ReminderItem = {
  id: string;
  productId: string;
  productName: string;
  everyDays: number;
  nextAt: string;
  active: boolean;
};

export default function AccountMedicinesPage() {
  const t = useT();
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"favorites" | "recent" | "reminders">("favorites");
  const [reminderModal, setReminderModal] = useState<{ productId: string; productName: string } | null>(null);
  const [everyDaysInput, setEveryDaysInput] = useState(30);

  const listQ = useQuery({
    queryKey: ["account-medicines"],
    enabled: !!user,
    queryFn: async () => {
      const res = await fetch("/api/account/medicines", { cache: "no-store" });
      if (!res.ok) throw new Error("medicines fetch failed");
      return res.json() as Promise<{ favorites: MedItem[]; recent: MedItem[] }>;
    },
  });

  const remindersQ = useQuery({
    queryKey: ["refill-reminders"],
    enabled: !!user,
    queryFn: async () => {
      const res = await fetch("/api/refill-reminders", { cache: "no-store" });
      if (!res.ok) return { items: [] };
      return res.json() as Promise<{ items: ReminderItem[] }>;
    },
  });

  const saveReminder = useMutation({
    mutationFn: async ({ productId, productName, everyDays }: { productId: string; productName: string; everyDays: number }) => {
      const res = await fetch("/api/refill-reminders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId, productName, everyDays }),
      });
      if (!res.ok) throw new Error("Save reminder failed");
      return res.json();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["refill-reminders"] });
      toast.success(t("রিমাইন্ডার সংরক্ষিত হয়েছে", "Reminder saved"));
      setReminderModal(null);
    },
    onError: () => toast.error(t("রিমাইন্ডার সংরক্ষণ ব্যর্থ", "Failed to save reminder")),
  });

  const deleteReminder = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/refill-reminders", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Delete reminder failed");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["refill-reminders"] });
      toast.success(t("রিমাইন্ডার মুছে ফেলা হয়েছে", "Reminder removed"));
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
        <button
          type="button"
          onClick={() => setTab("reminders")}
          className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
            tab === "reminders"
              ? "border-primary bg-secondary text-primary-dark"
              : "border-border text-muted-foreground"
          }`}
        >
          <Bell className="h-3 w-3" /> {t("ডোজ রিমাইন্ডার", "Reminders")} ({t.n(remindersQ.data?.items.length ?? 0)})
        </button>
      </div>

      {tab === "reminders" && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {t("নিয়মিত ঔষধ সেবন ও রিফিলের সময়মত সতর্কতা।", "Regular medication & refill reminders.")}
            </p>
          </div>

          {remindersQ.isLoading && (
            <p className="mt-3 text-xs text-muted-foreground">{t("লোড হচ্ছে...", "Loading...")}</p>
          )}

          {!remindersQ.isLoading && (remindersQ.data?.items.length ?? 0) === 0 && (
            <div className="mt-8 text-center rounded-2xl border border-dashed border-border bg-card p-8">
              <Bell className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-xs text-muted-foreground">
                {t("কোনো রিমাইন্ডার সেট করা নেই। প্রিয় বা যেকোনো ঔষধ থেকে রিমাইন্ডার যোগ করুন।", "No reminders set yet. Add a reminder from your medicines.")}
              </p>
            </div>
          )}

          <div className="space-y-2">
            {(remindersQ.data?.items ?? []).map((rem) => (
              <div
                key={rem.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold text-navy">{rem.productName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {t(`প্রতি ${rem.everyDays} দিন পর পর`, `Every ${rem.everyDays} days`)} · {t("পরবর্তী রিফিল:", "Next:")} {rem.nextAt}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={deleteReminder.isPending}
                  onClick={() => deleteReminder.mutate(rem.id)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title={t("মুছে ফেলুন", "Delete")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab !== "reminders" && listQ.isLoading && (
        <p className="mt-3 text-xs text-muted-foreground">{t("লোড হচ্ছে...", "Loading...")}</p>
      )}

      {tab !== "reminders" && !listQ.isLoading && items.length === 0 && (
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

      {tab !== "reminders" && (
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
                onClick={() => {
                  setReminderModal({ productId: m.id, productName: m.name });
                  setEveryDaysInput(30);
                }}
                className="rounded-lg border border-border p-2 text-muted-foreground hover:text-primary"
                title={t("রিমাইন্ডার সেট করুন", "Set dosage reminder")}
              >
                <Bell className="h-4 w-4" />
              </button>
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
      )}

      {reminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 space-y-4 shadow-xl">
            <div>
              <p className="text-sm font-bold text-navy">{t("ডোজ ও রিফিল রিমাইন্ডার", "Dosage & Refill Reminder")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{reminderModal.productName}</p>
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1">
                {t("কত দিন পর পর রিফিল স্মরণ করাবে?", "Remind refill every how many days?")}
              </label>
              <div className="flex gap-2">
                {[15, 30, 60].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setEveryDaysInput(days)}
                    className={`rounded-lg border px-3 py-1 text-xs font-semibold ${
                      everyDaysInput === days
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {days} {t("দিন", "days")}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={1}
                max={365}
                value={everyDaysInput}
                onChange={(e) => setEveryDaysInput(Number(e.target.value) || 30)}
                className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReminderModal(null)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold"
              >
                {t("বাতিল", "Cancel")}
              </button>
              <button
                type="button"
                disabled={saveReminder.isPending}
                onClick={() =>
                  saveReminder.mutate({
                    productId: reminderModal.productId,
                    productName: reminderModal.productName,
                    everyDays: everyDaysInput,
                  })
                }
                className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
              >
                {saveReminder.isPending ? t("সংরক্ষণ হচ্ছে...", "Saving...") : t("সংরক্ষণ", "Save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/lib/i18n";

const FILTERS = [
  { key: "all", bn: "সব", en: "All" },
  { key: "order", bn: "ডেলিভারি", en: "Delivery" },
  { key: "appointment", bn: "কনসালটেশন", en: "Consultation" },
  { key: "service", bn: "হোম সার্ভিস", en: "Home service" },
  { key: "campaign", bn: "ক্যাম্পেইন", en: "Campaign" },
] as const;

type NotifItem = {
  id: string;
  title: string;
  body: string;
  kind: string;
  orderNo: string;
  read: boolean;
  createdAt: string;
};

export default function AccountNotificationsPage() {
  const t = useT();
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");

  const listQ = useQuery({
    queryKey: ["account-notifications", filter],
    enabled: !!user,
    queryFn: async () => {
      const qs = filter !== "all" ? `?kind=${encodeURIComponent(filter)}` : "";
      const res = await fetch(`/api/notifications${qs}`, { cache: "no-store" });
      if (!res.ok) {
        return { items: [] as NotifItem[], unavailable: true };
      }
      const data = (await res.json()) as { items: NotifItem[] };
      return { items: data.items ?? [], unavailable: false };
    },
    retry: false,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, read: true }),
      });
      if (!res.ok) throw new Error("mark read failed");
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["account-notifications"] }),
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
        <p className="text-4xl">🔔</p>
        <h1 className="mt-3 text-base font-bold">
          {t("নোটিফিকেশন দেখতে লগইন করুন", "Log in to view notifications")}
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

  const items = listQ.data?.items ?? [];
  const unavailable = listQ.data?.unavailable;

  return (
    <div className="pt-4">
      <Link href="/account" className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
        <ArrowLeft className="h-3.5 w-3.5" /> {t("একাউন্ট", "Account")}
      </Link>
      <h1 className="mt-3 flex items-center gap-2 text-base font-bold">
        <Bell className="h-4 w-4 text-primary" />
        {t("নোটিফিকেশন", "Notifications")}
      </h1>

      <div className="mt-3 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
              filter === f.key
                ? "border-primary bg-secondary text-primary-dark"
                : "border-border text-muted-foreground"
            }`}
          >
            {t(f.bn, f.en)}
          </button>
        ))}
      </div>

      {listQ.isLoading && (
        <p className="mt-3 text-xs text-muted-foreground">{t("লোড হচ্ছে...", "Loading...")}</p>
      )}

      {!listQ.isLoading && (unavailable || items.length === 0) && (
        <div className="mt-8 text-center">
          <p className="text-3xl">🔔</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {unavailable
              ? t(
                  "নোটিফিকেশন লোড করা যায়নি। মূল পেজ থেকে চেষ্টা করুন।",
                  "Could not load notifications. Try the main notifications page.",
                )
              : t("এখনো কোনো নোটিফিকেশন নেই।", "No notifications yet.")}
          </p>
          <Link
            href="/notifications"
            className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
          >
            {t("নোটিফিকেশন পেজ", "Open notifications")}
          </Link>
        </div>
      )}

      <div className="mt-3 space-y-2">
        {items.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => {
              if (!n.read) markRead.mutate(n.id);
            }}
            className={`w-full rounded-xl border border-border p-3 text-left ${
              n.read ? "bg-card" : "bg-secondary/40"
            }`}
          >
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold">{n.title}</p>
              {!n.read && (
                <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
                  {t("নতুন", "New")}
                </span>
              )}
              <span className="ml-auto text-[10px] text-muted-foreground">
                {new Date(n.createdAt).toLocaleString(t.en ? "en-US" : "bn-BD")}
              </span>
            </div>
            {n.body && (
              <p className="mt-1 whitespace-pre-wrap text-[11px] text-muted-foreground">{n.body}</p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

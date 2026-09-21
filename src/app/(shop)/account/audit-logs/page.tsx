"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowLeft, FileText, Package } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/lib/i18n";

type AuditPayload = {
  prescriptions: {
    id: string;
    status: string;
    note: string | null;
    createdAt: string;
    kind: "prescription";
  }[];
  orderEvents: {
    id: string;
    orderId: string;
    orderNo: string;
    status: string;
    note: string;
    createdAt: string;
    kind: "order_event";
  }[];
};

export default function AccountAuditLogsPage() {
  const t = useT();
  const { user, loading } = useAuth();

  const auditQ = useQuery({
    queryKey: ["account-audit"],
    enabled: !!user,
    queryFn: async () => {
      const res = await fetch("/api/account/audit", { cache: "no-store" });
      if (!res.ok) throw new Error("audit fetch failed");
      return res.json() as Promise<AuditPayload>;
    },
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
        <p className="text-4xl">📋</p>
        <h1 className="mt-3 text-base font-bold">
          {t("কার্যক্রম দেখতে লগইন করুন", "Log in to view activity")}
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

  const prescriptions = auditQ.data?.prescriptions ?? [];
  const orderEvents = auditQ.data?.orderEvents ?? [];
  const empty = !auditQ.isLoading && prescriptions.length === 0 && orderEvents.length === 0;

  const timeline = [
    ...prescriptions.map((p) => ({
      id: `rx-${p.id}`,
      at: p.createdAt,
      title: t("প্রেসক্রিপশন", "Prescription"),
      detail: p.status + (p.note ? ` · ${p.note}` : ""),
      href: `/prescription/${p.id}`,
      icon: FileText as typeof FileText,
    })),
    ...orderEvents.map((e) => ({
      id: `oe-${e.id}`,
      at: e.createdAt,
      title: e.orderNo
        ? `${t("অর্ডার", "Order")} ${e.orderNo}`
        : t("অর্ডার আপডেট", "Order update"),
      detail: e.status + (e.note ? ` · ${e.note}` : ""),
      href: "/orders",
      icon: Package as typeof Package,
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <div className="pt-4">
      <Link href="/account" className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
        <ArrowLeft className="h-3.5 w-3.5" /> {t("একাউন্ট", "Account")}
      </Link>
      <h1 className="mt-3 flex items-center gap-2 text-base font-bold">
        <Activity className="h-4 w-4 text-primary" />
        {t("কার্যক্রম লগ", "Activity log")}
      </h1>
      <p className="mt-1 text-xs text-muted-foreground">
        {t(
          "আপনার প্রেসক্রিপশন ও অর্ডার আপডেটের সাম্প্রতিক ইতিহাস।",
          "Recent prescription and order activity for your account.",
        )}
      </p>

      {auditQ.isLoading && (
        <p className="mt-3 text-xs text-muted-foreground">{t("লোড হচ্ছে...", "Loading...")}</p>
      )}

      {empty && (
        <div className="mt-8 text-center">
          <p className="text-3xl">📋</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {t(
              "এখনো কোনো কার্যক্রম নেই। অর্ডার বা প্রেসক্রিপশন জমা দিলে এখানে দেখা যাবে।",
              "No activity yet. Place an order or upload a prescription to see it here.",
            )}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link
              href="/orders"
              className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold"
            >
              {t("অর্ডার", "Orders")}
            </Link>
            <Link
              href="/prescription"
              className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
            >
              {t("প্রেসক্রিপশন", "Prescriptions")}
            </Link>
          </div>
        </div>
      )}

      <div className="mt-3 space-y-2">
        {timeline.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-3"
            >
              <Icon className="mt-0.5 h-4 w-4 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold">{item.title}</p>
                <p className="text-[11px] text-muted-foreground">{item.detail}</p>
              </div>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {new Date(item.at).toLocaleString(t.en ? "en-US" : "bn-BD")}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

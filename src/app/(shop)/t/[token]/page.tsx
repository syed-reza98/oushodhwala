"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Lock, TimerOff, Truck } from "lucide-react";
import { useT } from "@/lib/i18n";

type TrackPayload = {
  found: boolean;
  reason?: string;
  order_no?: string;
  status?: string;
  payment_method?: string;
  payment_status?: string;
  total?: number;
  customer_name?: string;
  created_at?: string;
  items?: { name: string; qty: number }[];
};

export default function PublicTrackTokenPage() {
  const t = useT();
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [data, setData] = useState<TrackPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const res = await fetch(`/api/public/track-token?token=${encodeURIComponent(token)}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as TrackPayload;
      if (!cancelled) setData(json);
    };
    void load();
    const id = setInterval(() => void load(), 15_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [token]);

  if (!data) {
    return <p className="pt-16 text-center text-sm text-muted-foreground">{t("লোড হচ্ছে...", "Loading...")}</p>;
  }

  if (!data.found) {
    const reason = data.reason ?? "invalid";
    const Icon = reason === "expired" ? TimerOff : reason === "invalid" ? Truck : Lock;
    const msg: Record<string, [string, string]> = {
      invalid: ["ট্র্যাকিং লিংকটি সঠিক নয়", "This tracking link is not valid"],
      revoked: ["এই ট্র্যাকিং লিংকটি বাতিল করা হয়েছে", "This tracking link has been revoked"],
      expired: ["ট্র্যাকিং লিংকের মেয়াদ শেষ হয়েছে", "This tracking link has expired"],
    };
    const [bnMsg, enMsg] = msg[reason] ?? msg.invalid!;
    return (
      <div className="pt-16 text-center">
        <Icon className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-bold">{t(bnMsg, enMsg)}</p>
        <Link href="/" className="mt-4 inline-block rounded-lg border border-border px-4 py-2 text-xs font-semibold">
          {t("হোম", "Home")}
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-4 pb-10">
      <h1 className="text-base font-bold">{t("পাবলিক ট্র্যাক", "Public track")}</h1>
      <p className="mt-2 text-xs text-muted-foreground">
        {t("অর্ডার", "Order")} <span className="font-bold text-navy">#{data.order_no}</span>
      </p>
      <div className="mt-4 rounded-2xl border border-border bg-card p-4 text-xs space-y-2">
        <p>
          <span className="text-muted-foreground">{t("স্ট্যাটাস", "Status")}: </span>
          <span className="font-bold">{data.status}</span>
        </p>
        <p>
          <span className="text-muted-foreground">{t("পেমেন্ট", "Payment")}: </span>
          {data.payment_method} · {data.payment_status}
        </p>
        <p>
          <span className="text-muted-foreground">{t("মোট", "Total")}: </span>৳{data.total}
        </p>
        {data.customer_name && (
          <p>
            <span className="text-muted-foreground">{t("গ্রাহক", "Customer")}: </span>
            {data.customer_name}
          </p>
        )}
      </div>
      {!!data.items?.length && (
        <ul className="mt-3 space-y-1 text-xs">
          {data.items.map((it, i) => (
            <li key={`${it.name}-${i}`} className="rounded-lg border border-border bg-card px-3 py-2">
              {it.name} × {it.qty}
            </li>
          ))}
        </ul>
      )}
      <Link href="/orders" className="mt-4 inline-block text-xs font-semibold text-primary underline">
        {t("অর্ডার", "Orders")}
      </Link>
    </div>
  );
}

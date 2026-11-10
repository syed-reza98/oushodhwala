"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Lock, TimerOff, Truck, Navigation } from "lucide-react";
import { useT } from "@/lib/i18n";
import { LiveMap } from "@/components/LiveMap";

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
  delivery?: {
    status: string;
    etaMinutes: number;
    lastLat: number | null;
    lastLng: number | null;
    lastSeenAt: string | null;
    destLat?: number | null;
    destLng?: number | null;
  } | null;
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
    const id = setInterval(() => void load(), 12_000);
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
    <div className="pt-4 pb-12 max-w-2xl mx-auto px-2 sm:px-4">
      <h1 className="text-base font-bold text-foreground">{t("পাবলিক ডেলিভারি ট্র্যাকিং", "Public Delivery Track")}</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        {t("অর্ডার", "Order")} <span className="font-bold text-navy">#{data.order_no}</span>
      </p>

      <div className="mt-4 rounded-2xl border border-border bg-card p-4 text-xs space-y-2 shadow-xs">
        <p>
          <span className="text-muted-foreground">{t("স্ট্যাটাস", "Status")}: </span>
          <span className="font-bold text-primary capitalize">{data.status}</span>
        </p>
        <p>
          <span className="text-muted-foreground">{t("পেমেন্ট", "Payment")}: </span>
          {data.payment_method} · {data.payment_status}
        </p>
        <p>
          <span className="text-muted-foreground">{t("মোট", "Total")}: </span>
          <span className="font-bold">৳{data.total}</span>
        </p>
        {data.customer_name && (
          <p>
            <span className="text-muted-foreground">{t("গ্রাহক", "Customer")}: </span>
            {data.customer_name}
          </p>
        )}
      </div>

      {data.delivery && data.delivery.lastLat != null && data.delivery.lastLng != null && (
        <div className="mt-4 rounded-2xl border border-primary/20 bg-card p-4 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground mb-2">
            <Navigation className="h-4 w-4 text-primary" />
            <span>{t("রাইডারের অবস্থান", "Rider Location")} (ETA ~{data.delivery.etaMinutes}m)</span>
          </div>
          <LiveMap
            riderLat={data.delivery.lastLat}
            riderLng={data.delivery.lastLng}
            destLat={data.delivery.destLat}
            destLng={data.delivery.destLng}
            lastSeen={data.delivery.lastSeenAt}
          />
        </div>
      )}

      {!!data.items?.length && (
        <div className="mt-4 rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
          <div className="border-b border-border bg-secondary/30 px-4 py-2 text-xs font-bold">
            {t("পণ্যসমূহ", "Items")}
          </div>
          <ul className="divide-y divide-border">
            {data.items.map((it, i) => (
              <li key={`${it.name}-${i}`} className="flex justify-between px-4 py-2 text-xs">
                <span>{it.name}</span>
                <span className="font-bold text-muted-foreground">× {it.qty}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <Link href="/orders" className="text-xs font-semibold text-primary underline">
          {t("আমার অর্ডার", "My Orders")}
        </Link>
        <Link href="/" className="text-xs font-semibold text-muted-foreground hover:text-foreground">
          {t("হোম", "Home")}
        </Link>
      </div>
    </div>
  );
}

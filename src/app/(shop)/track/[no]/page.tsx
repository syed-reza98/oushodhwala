"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useT } from "@/lib/i18n";

type TrackPayload = {
  orderNo: string;
  status: string;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  total: number;
  createdAt: string;
  items: { name: string; qty: number; lineTotal: number }[];
  events?: { id: string; status: string; note: string; createdAt: string }[];
  delivery?: {
    status: string;
    etaMinutes: number;
    lastLat: number | null;
    lastLng: number | null;
    lastSeenAt: string | null;
    rider: { name: string; phone: string; vehicle: string } | null;
    events: { id: string; status: string; note: string; createdAt: string }[];
    otp: string | null;
    pod: { photoUrl?: string; signatureUrl?: string; receiverName?: string } | null;
  } | null;
};

const STATUS_BN: Record<string, [string, string]> = {
  pending: ["অপেক্ষমাণ", "Pending"],
  confirmed: ["নিশ্চিত", "Confirmed"],
  processing: ["প্রসেসিং", "Processing"],
  shipped: ["পাঠানো হয়েছে", "Shipped"],
  delivered: ["ডেলিভারড", "Delivered"],
  cancelled: ["বাতিল", "Cancelled"],
};

export default function TrackPage() {
  const t = useT();
  const params = useParams<{ no: string }>();
  const no = decodeURIComponent(params.no ?? "");
  const [data, setData] = useState<TrackPayload | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await fetch(`/api/public/track?no=${encodeURIComponent(no)}`, { cache: "no-store" });
        if (res.status === 404) {
          if (!cancelled) setErr(t("অর্ডার পাওয়া যায়নি", "Order not found"));
          return;
        }
        if (!res.ok) throw new Error("track failed");
        const json = (await res.json()) as TrackPayload;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setErr(t("ট্র্যাক লোড করা যায়নি", "Could not load tracking"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [no, t]);

  const statusLabel = data
    ? t(STATUS_BN[data.status]?.[0] ?? data.status, STATUS_BN[data.status]?.[1] ?? data.status)
    : "";

  return (
    <div className="pt-4 pb-10">
      <h1 className="text-base font-bold">{t("অর্ডার ট্র্যাক", "Track order")}</h1>
      <p className="mt-2 text-xs text-muted-foreground">
        {t("অর্ডার নম্বর:", "Order number:")} <span className="font-bold text-navy">{no}</span>
      </p>

      {loading && <p className="mt-6 text-xs text-muted-foreground">{t("লোড হচ্ছে...", "Loading...")}</p>}
      {err && <p className="mt-6 text-xs font-semibold text-destructive">{err}</p>}

      {data && (
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-bold text-navy">{statusLabel}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t("মোট", "Total")}: ৳{Math.round(data.total).toLocaleString("en-US")} ·{" "}
              {data.paymentMethod ?? "—"} · {data.paymentStatus ?? "—"}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">{data.createdAt}</p>
          </div>
          <ul className="rounded-2xl border border-border bg-card divide-y divide-border">
            {data.items.map((it, i) => (
              <li key={`${it.name}-${i}`} className="flex justify-between px-4 py-2 text-xs">
                <span>
                  {it.name} × {it.qty}
                </span>
                <span className="font-semibold">৳{Math.round(it.lineTotal).toLocaleString("en-US")}</span>
              </li>
            ))}
          </ul>

          {data.delivery && (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-navy">{t("ডেলিভারি ট্র্যাকিং", "Delivery Tracking")}</p>
                  <p className="mt-0.5 text-muted-foreground">
                    {t("স্ট্যাটাস:", "Status:")} <span className="font-semibold text-primary">{data.delivery.status}</span> · ETA ~{data.delivery.etaMinutes}m
                  </p>
                </div>
                {data.delivery.otp && data.delivery.status !== "delivered" && (
                  <div className="rounded-xl border border-primary/40 bg-card px-3 py-1.5 text-center shadow-xs">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">{t("ডেলিভারি OTP", "Delivery OTP")}</p>
                    <p className="text-base font-extrabold tracking-widest text-primary font-mono">{data.delivery.otp}</p>
                  </div>
                )}
              </div>

              {data.delivery.rider && (
                <div className="mt-3 pt-3 border-t border-primary/20 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{data.delivery.rider.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {data.delivery.rider.vehicle} · {data.delivery.rider.phone}
                    </p>
                  </div>
                  {data.delivery.rider.phone && (
                    <a
                      href={`tel:${data.delivery.rider.phone}`}
                      className="rounded-lg bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground"
                    >
                      {t("কল করুন", "Call")}
                    </a>
                  )}
                </div>
              )}

              {data.delivery.pod && (
                <div className="mt-3 pt-3 border-t border-primary/20 space-y-2">
                  <p className="font-semibold text-[11px] text-navy">{t("ডেলিভারি প্রমাণ (POD)", "Proof of Delivery (POD)")}</p>
                  {data.delivery.pod.receiverName && (
                    <p className="text-[11px] text-muted-foreground">
                      {t("পণ্য গ্রহণকারী:", "Receiver:")} <span className="font-medium text-foreground">{data.delivery.pod.receiverName}</span>
                    </p>
                  )}
                  <div className="flex gap-2">
                    {data.delivery.pod.photoUrl && (
                      <a href={data.delivery.pod.photoUrl} target="_blank" rel="noreferrer" className="text-primary underline font-medium">
                        📷 {t("ছবি দেখুন", "View Photo")}
                      </a>
                    )}
                    {data.delivery.pod.signatureUrl && (
                      <a href={data.delivery.pod.signatureUrl} target="_blank" rel="noreferrer" className="text-primary underline font-medium">
                        ✍️ {t("স্বাক্ষর দেখুন", "View Signature")}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {(data.events?.length ?? 0) > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-sm font-bold">{t("টাইমলাইন", "Timeline")}</p>
              <ol className="mt-3 space-y-3">
                {data.events!.map((e) => (
                  <li key={e.id} className="flex gap-3 text-xs">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {t(
                          STATUS_BN[e.status]?.[0] ?? e.status,
                          STATUS_BN[e.status]?.[1] ?? e.status,
                        )}
                      </p>
                      {e.note && <p className="text-muted-foreground">{e.note}</p>}
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(e.createdAt).toLocaleString(t.en ? "en-US" : "bn-BD")}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      <Link href="/orders" className="mt-4 inline-block text-xs font-semibold text-primary underline">
        {t("আমার অর্ডার", "My orders")}
      </Link>
    </div>
  );
}

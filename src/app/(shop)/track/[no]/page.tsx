"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Lock, ShieldCheck, Printer, MapPin, Navigation, Clock, Phone, AlertCircle } from "lucide-react";
import { useT } from "@/lib/i18n";
import { RouteMap, type PathPoint } from "@/components/RouteMap";
import { LiveMap } from "@/components/LiveMap";
import { printTrackReport, type TrackReport } from "@/lib/track-report";

type TrackPayload = {
  orderNo: string;
  status: string;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  total: number;
  createdAt: string;
  customerName?: string | null;
  deliveryAddress?: string | null;
  isAuthorized?: boolean;
  items: { name: string; qty: number; lineTotal: number }[];
  events?: { id: string; status: string; note: string; createdAt: string }[];
  delivery?: {
    status: string;
    etaMinutes: number;
    lastLat: number | null;
    lastLng: number | null;
    lastSeenAt: string | null;
    destLat?: number | null;
    destLng?: number | null;
    rider: { name: string; phone: string; vehicle: string } | null;
    events: { id: string; status: string; note: string; createdAt: string; lat?: number | null; lng?: number | null }[];
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
  const searchParams = useSearchParams();
  const no = decodeURIComponent(params.no ?? "");
  const token = searchParams.get("token") ?? "";
  const [data, setData] = useState<TrackPayload | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  // Adaptive polling interval: 4s if in_transit, 15s otherwise
  const pollInterval = data?.delivery?.status === "in_transit" ? 4_000 : 15_000;

  useEffect(() => {
    let cancelled = false;
    const fetchStatus = async (initial = false) => {
      if (initial) setLoading(true);
      try {
        const queryUrl = token
          ? `/api/public/track?no=${encodeURIComponent(no)}&token=${encodeURIComponent(token)}`
          : `/api/public/track?no=${encodeURIComponent(no)}`;
        const res = await fetch(queryUrl, { cache: "no-store" });
        if (res.status === 404) {
          if (!cancelled) setErr(t("অর্ডার পাওয়া যায়নি", "Order not found"));
          return;
        }
        if (!res.ok) throw new Error("track failed");
        const json = (await res.json()) as TrackPayload;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled && initial) setErr(t("ট্র্যাক লোড করা যায়নি", "Could not load tracking"));
      } finally {
        if (!cancelled && initial) setLoading(false);
      }
    };

    void fetchStatus(true);
    const intervalId = setInterval(() => void fetchStatus(false), pollInterval);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [no, token, pollInterval, t]);

  const statusLabel = data
    ? t(STATUS_BN[data.status]?.[0] ?? data.status, STATUS_BN[data.status]?.[1] ?? data.status)
    : "";

  const handlePrint = () => {
    if (!data) return;
    const reportData: TrackReport = {
      order_no: data.orderNo,
      status: data.status,
      status_label: statusLabel,
      eta_minutes: data.delivery?.etaMinutes,
      rider_name: data.delivery?.rider?.name,
      rider_vehicle: data.delivery?.rider?.vehicle,
      customer_name: data.customerName,
      place: data.deliveryAddress || undefined,
      created_at: data.createdAt,
      last_seen_at: data.delivery?.lastSeenAt,
      events: (data.delivery?.events || []).map((e) => ({
        status: e.status,
        note: e.note,
        created_at: e.createdAt,
      })),
      statusLabel: (s) => t(STATUS_BN[s]?.[0] ?? s, STATUS_BN[s]?.[1] ?? s),
    };

    printTrackReport(reportData, false);
  };

  // Build path points for RouteMap
  const pathPoints: PathPoint[] = [];
  if (data?.delivery?.events) {
    data.delivery.events.forEach((ev) => {
      if (ev.lat != null && ev.lng != null) {
        pathPoints.push({ lat: ev.lat, lng: ev.lng, at: ev.createdAt });
      }
    });
  }
  if (data?.delivery?.lastLat != null && data?.delivery?.lastLng != null) {
    pathPoints.push({
      lat: data.delivery.lastLat,
      lng: data.delivery.lastLng,
      at: data.delivery.lastSeenAt,
    });
  }

  return (
    <div className="pt-4 pb-12 max-w-4xl mx-auto px-2 sm:px-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-base font-bold text-foreground">{t("অর্ডার ট্র্যাক", "Track order")}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("অর্ডার নম্বর:", "Order number:")} <span className="font-bold text-navy">#{no}</span>
          </p>
        </div>

        {data && (
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition shadow-2xs"
          >
            <Printer className="h-3.5 w-3.5 text-primary" />
            {t("প্রিন্ট রিপোর্ট", "Print Report")}
          </button>
        )}
      </div>

      {loading && !data && <p className="mt-6 text-xs text-muted-foreground">{t("লোড হচ্ছে...", "Loading...")}</p>}
      {err && <p className="mt-6 text-xs font-semibold text-destructive">{err}</p>}

      {data && (
        <div className="mt-4 space-y-4">
          {/* Main Status Header Card */}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <span className="text-xs text-muted-foreground">{t("বর্তমান অবস্থা", "Current Status")}</span>
                <p className="text-base font-extrabold text-navy">{statusLabel}</p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                {t("অর্ডার তারিখ:", "Ordered:")} {new Date(data.createdAt).toLocaleDateString()}
              </span>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              {t("মোট", "Total")}: <span className="font-bold text-foreground">৳{Math.round(data.total).toLocaleString("en-US")}</span> ·{" "}
              {data.paymentMethod ?? "—"} · {data.paymentStatus ?? "—"}
            </p>
          </div>

          {!data.isAuthorized && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
              <Lock className="h-4 w-4 shrink-0" />
              <div className="flex-1">
                <span>
                  {t(
                    "স্বাস্থ্য সুরক্ষার স্বার্থে ঔষধের বিস্তারিত তালিকা ও ডেলিভারি OTP গোপন রাখা হয়েছে।",
                    "For privacy and security, specific medication names and Delivery OTP are protected.",
                  )}
                </span>{" "}
                <Link href={`/auth?callbackUrl=/track/${encodeURIComponent(no)}`} className="font-bold underline">
                  {t("লগইন করুন", "Log in")}
                </Link>
              </div>
            </div>
          )}

          {/* Delivery & Live Map Section */}
          {data.delivery && (
            <div className="rounded-2xl border border-primary/30 bg-card p-4 sm:p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-primary" />
                    <p className="font-bold text-sm text-foreground">{t("লাইভ ডেলিভারি ট্র্যাকিং", "Live Delivery Tracking")}</p>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t("স্ট্যাটাস:", "Status:")} <span className="font-semibold text-primary">{data.delivery.status}</span> · ETA ~{data.delivery.etaMinutes}m
                  </p>
                </div>

                {data.delivery.otp && data.delivery.status !== "delivered" && (
                  <div className="rounded-xl border border-primary/40 bg-primary/5 px-4 py-2 text-center shadow-xs">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">{t("ডেলিভারি OTP", "Delivery OTP")}</p>
                    <p className="text-lg font-black tracking-widest text-primary font-mono">{data.delivery.otp}</p>
                  </div>
                )}
              </div>

              {/* Live Map or Route Map Visualization */}
              {data.delivery.lastLat != null && data.delivery.lastLng != null && (
                <div className="mt-4">
                  {pathPoints.length > 1 ? (
                    <RouteMap
                      path={pathPoints}
                      destLat={data.delivery.destLat}
                      destLng={data.delivery.destLng}
                      lastSeen={data.delivery.lastSeenAt}
                      height="h-72"
                    />
                  ) : (
                    <LiveMap
                      riderLat={data.delivery.lastLat}
                      riderLng={data.delivery.lastLng}
                      destLat={data.delivery.destLat}
                      destLng={data.delivery.destLng}
                      lastSeen={data.delivery.lastSeenAt}
                    />
                  )}
                </div>
              )}

              {data.delivery.rider && (
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                  <div>
                    <p className="font-bold text-xs text-foreground">{data.delivery.rider.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {data.delivery.rider.vehicle} · {data.delivery.rider.phone}
                    </p>
                  </div>
                  {data.delivery.rider.phone && (
                    <a
                      href={`tel:${data.delivery.rider.phone}`}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition shadow-2xs"
                    >
                      {t("কল করুন", "Call Rider")}
                    </a>
                  )}
                </div>
              )}

              {data.delivery.pod && (
                <div className="mt-3 pt-3 border-t border-border space-y-1.5 text-xs">
                  <p className="font-bold text-foreground">{t("ডেলিভারি প্রমাণ (Proof of Delivery)", "Proof of Delivery (POD)")}</p>
                  {data.delivery.pod.receiverName && (
                    <p className="text-muted-foreground">
                      {t("পণ্য গ্রহণকারী:", "Receiver:")} <span className="font-semibold text-foreground">{data.delivery.pod.receiverName}</span>
                    </p>
                  )}
                  <div className="flex gap-3 pt-1">
                    {data.delivery.pod.photoUrl && (
                      <a href={data.delivery.pod.photoUrl} target="_blank" rel="noreferrer" className="text-primary underline font-semibold">
                        📷 {t("ডেলিভারি ফটো দেখুন", "View Photo")}
                      </a>
                    )}
                    {data.delivery.pod.signatureUrl && (
                      <a href={data.delivery.pod.signatureUrl} target="_blank" rel="noreferrer" className="text-primary underline font-semibold">
                        ✍️ {t("গ্রাহকের স্বাক্ষর দেখুন", "View Signature")}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Ordered Products List */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
            <div className="border-b border-border bg-secondary/30 px-4 py-2.5">
              <h2 className="text-xs font-bold text-foreground">{t("অর্ডারকৃত পণ্যসমূহ", "Ordered Items")}</h2>
            </div>
            <ul className="divide-y divide-border">
              {data.items.map((it, i) => (
                <li key={`${it.name}-${i}`} className="flex justify-between px-4 py-2.5 text-xs">
                  <span className="font-medium text-foreground">
                    {it.name} <span className="text-muted-foreground">× {it.qty}</span>
                  </span>
                  <span className="font-bold text-foreground">৳{Math.round(it.lineTotal).toLocaleString("en-US")}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Order Event Timeline */}
          {(data.events?.length ?? 0) > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
              <h2 className="text-sm font-bold text-foreground mb-3">{t("অর্ডার টাইমলাইন", "Order Timeline")}</h2>
              <ol className="space-y-3">
                {data.events!.map((e) => (
                  <li key={e.id} className="flex gap-3 text-xs">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-foreground">
                        {t(
                          STATUS_BN[e.status]?.[0] ?? e.status,
                          STATUS_BN[e.status]?.[1] ?? e.status,
                        )}
                      </p>
                      {e.note && <p className="text-muted-foreground mt-0.5">{e.note}</p>}
                      <p className="text-[10px] text-muted-foreground/80 mt-0.5">
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

      <div className="mt-6 flex items-center justify-between">
        <Link href="/orders" className="text-xs font-semibold text-primary underline">
          ← {t("আমার সব অর্ডার", "My all orders")}
        </Link>
        <Link href="/" className="text-xs font-semibold text-muted-foreground hover:text-foreground">
          {t("হোমে ফিরুন", "Back to home")}
        </Link>
      </div>
    </div>
  );
}

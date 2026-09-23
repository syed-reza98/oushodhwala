"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bike } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/lib/i18n";

import { useState } from "react";
import { Camera, CheckCircle2, ShieldCheck, MapPin } from "lucide-react";
import { SignaturePad } from "@/components/SignaturePad";

type DeliveryRow = {
  id: string;
  orderNo: string;
  status: string;
  riderName: string | null;
  etaMinutes: number;
  otp?: string | null;
  podPhotoUrl?: string | null;
  podSignatureUrl?: string | null;
  podReceiverName?: string | null;
  lastEvent: { status: string; note: string; createdAt: string } | null;
};

export default function DeliveryPage() {
  const t = useT();
  const { user, loading, isStaff } = useAuth();
  const qc = useQueryClient();

  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});
  const [receiverNames, setReceiverNames] = useState<Record<string, string>>({});
  const [podPhotos, setPodPhotos] = useState<Record<string, string>>({});
  const [podSigns, setPodSigns] = useState<Record<string, string>>({});
  const [activePodId, setActivePodId] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const listQ = useQuery({
    queryKey: ["staff-delivery"],
    enabled: !!user && isStaff,
    refetchInterval: 15_000,
    queryFn: async () => {
      const res = await fetch("/api/admin/delivery", { cache: "no-store" });
      if (!res.ok) throw new Error("load failed");
      return res.json() as Promise<{ deliveries: DeliveryRow[] }>;
    },
  });

  const handlePhotoUpload = async (deliveryId: string, file: File) => {
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("bucket", "pod");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Upload failed");
      }
      const data = await res.json();
      setPodPhotos((prev) => ({ ...prev, [deliveryId]: data.path || data.url }));
      toast.success(t("ছবি আপলোড হয়েছে", "Photo uploaded"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Photo upload failed");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const setStatus = useMutation({
    mutationFn: async ({
      deliveryId,
      status,
      otp,
      podPhotoUrl,
      podSignatureUrl,
      podReceiverName,
    }: {
      deliveryId: string;
      status: string;
      otp?: string;
      podPhotoUrl?: string;
      podSignatureUrl?: string;
      podReceiverName?: string;
    }) => {
      const res = await fetch("/api/admin/delivery", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "status",
          deliveryId,
          status,
          otp,
          podPhotoUrl,
          podSignatureUrl,
          podReceiverName,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "status failed");
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["staff-delivery"] });
      toast.success(t("স্ট্যাটাস আপডেট সম্পন্ন", "Status updated successfully"));
      setActivePodId(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("আপডেট ব্যর্থ", "Update failed")),
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
      <div className="pt-16 text-center text-sm">
        <p className="text-muted-foreground">
          {t("ডেলিভারি প্যানেল দেখতে লগইন করুন।", "Log in to open the delivery panel.")}
        </p>
        <Link
          href="/auth"
          className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
        >
          {t("লগইন", "Log in")}
        </Link>
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="pt-16 text-center text-sm text-muted-foreground">
        {t("এই প্যানেল শুধু রাইডার/স্টাফদের জন্য।", "This panel is for riders/staff only.")}
      </div>
    );
  }

  const rows = listQ.data?.deliveries ?? [];

  return (
    <div className="pt-4 pb-10">
      <h1 className="flex items-center gap-2 font-display text-lg font-extrabold">
        <Bike className="h-5 w-5 text-primary" />
        {t("ডেলিভারি প্যানেল", "Delivery panel")}
      </h1>
      <p className="mt-1 text-xs text-muted-foreground">
        {t("অ্যাসাইন করা অর্ডার ও স্ট্যাটাস আপডেট।", "Assigned orders and status updates.")}
      </p>

      {listQ.isLoading ? (
        <p className="mt-8 text-center text-xs text-muted-foreground">{t("লোড হচ্ছে...", "Loading...")}</p>
      ) : rows.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <Bike className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-xs text-muted-foreground">
            {t("এখন কোনো অ্যাসাইনমেন্ট নেই।", "No assignments yet.")}
          </p>
          <Link href="/admin" className="mt-3 inline-block text-xs font-semibold text-primary underline">
            {t("অ্যাডমিন ডেলিভারি", "Admin delivery")}
          </Link>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((d) => (
            <li key={d.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/track/${encodeURIComponent(d.orderNo)}`}
                  className="font-semibold text-navy underline"
                >
                  #{d.orderNo}
                </Link>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold">
                  {d.status}
                </span>
                <span className="ml-auto text-[11px] text-muted-foreground">
                  ETA {d.etaMinutes}m · {d.riderName || "—"}
                </span>
              </div>
              {d.lastEvent && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {d.lastEvent.note || d.lastEvent.status}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {["picked_up", "in_transit"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={setStatus.isPending || d.status === s}
                    onClick={() => setStatus.mutate({ deliveryId: d.id, status: s })}
                    className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-40"
                  >
                    {s === "picked_up" ? t("তোলা হয়েছে", "Picked up") : t("পথে", "In transit")}
                  </button>
                ))}

                {d.status !== "delivered" && (
                  <button
                    type="button"
                    onClick={() => setActivePodId(activePodId === d.id ? null : d.id)}
                    className="rounded-lg bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground"
                  >
                    {t("ডেলিভারি সম্পন্ন (POD)", "Complete Delivery (POD)")}
                  </button>
                )}
              </div>

              {activePodId === d.id && d.status !== "delivered" && (
                <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                  <p className="text-xs font-bold text-navy flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    {t("ডেলিভারি প্রমাণ ও ওটিপি যাচাই", "Proof of Delivery & OTP Verification")}
                  </p>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <label className="text-[11px] font-semibold block mb-1">
                        {t("গ্রাহকের ৪ ডিজিটের OTP *", "Customer 4-digit OTP *")}
                      </label>
                      <input
                        type="text"
                        maxLength={4}
                        value={otpInputs[d.id] ?? ""}
                        onChange={(e) => setOtpInputs({ ...otpInputs, [d.id]: e.target.value })}
                        placeholder="e.g. 1234"
                        className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-mono font-bold tracking-wider"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold block mb-1">
                        {t("পণ্য গ্রহণকারীর নাম", "Receiver Name")}
                      </label>
                      <input
                        type="text"
                        value={receiverNames[d.id] ?? ""}
                        onChange={(e) => setReceiverNames({ ...receiverNames, [d.id]: e.target.value })}
                        placeholder={t("যেমন: তারিকুল ইসলাম", "e.g. Tarikul Islam")}
                        className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold block mb-1">
                      {t("ডেলিভারি ছবি (ঐচ্ছিক)", "Delivery Photo (Optional)")}
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:border-primary">
                        <Camera className="h-3.5 w-3.5 text-primary" />
                        {uploadingPhoto ? t("আপলোড হচ্ছে...", "Uploading...") : t("ক্যামেরা / ছবি তুলুন", "Take/Upload Photo")}
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          disabled={uploadingPhoto}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void handlePhotoUpload(d.id, file);
                          }}
                          className="hidden"
                        />
                      </label>
                      {podPhotos[d.id] && (
                        <span className="text-[11px] text-primary font-semibold">✓ {t("ছবি সংযুক্ত", "Photo attached")}</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold block mb-1">
                      {t("গ্রাহকের স্বাক্ষর (ঐচ্ছিক)", "Customer Signature (Optional)")}
                    </label>
                    <SignaturePad
                      onSave={(dataUrl) => setPodSigns({ ...podSigns, [d.id]: dataUrl })}
                      onClear={() => setPodSigns({ ...podSigns, [d.id]: "" })}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setActivePodId(null)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold"
                    >
                      {t("বাতিল", "Cancel")}
                    </button>
                    <button
                      type="button"
                      disabled={setStatus.isPending || !(otpInputs[d.id]?.trim())}
                      onClick={() =>
                        setStatus.mutate({
                          deliveryId: d.id,
                          status: "delivered",
                          otp: otpInputs[d.id]?.trim(),
                          podPhotoUrl: podPhotos[d.id],
                          podSignatureUrl: podSigns[d.id],
                          podReceiverName: receiverNames[d.id]?.trim(),
                        })
                      }
                      className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
                    >
                      {setStatus.isPending ? t("যাচাই হচ্ছে...", "Verifying...") : t("নিশ্চিত ও সমাপ্ত", "Verify & Complete")}
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

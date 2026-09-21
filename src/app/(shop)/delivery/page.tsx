"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bike } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/lib/i18n";

type DeliveryRow = {
  id: string;
  orderNo: string;
  status: string;
  riderName: string | null;
  etaMinutes: number;
  lastEvent: { status: string; note: string; createdAt: string } | null;
};

export default function DeliveryPage() {
  const t = useT();
  const { user, loading, isStaff } = useAuth();
  const qc = useQueryClient();

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

  const setStatus = useMutation({
    mutationFn: async ({ deliveryId, status }: { deliveryId: string; status: string }) => {
      const res = await fetch("/api/admin/delivery", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "status", deliveryId, status }),
      });
      if (!res.ok) throw new Error("status failed");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["staff-delivery"] });
      toast.success(t("স্ট্যাটাস আপডেট", "Status updated"));
    },
    onError: () => toast.error(t("আপডেট ব্যর্থ", "Update failed")),
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
                {["picked_up", "in_transit", "delivered"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={setStatus.isPending || d.status === s}
                    onClick={() => setStatus.mutate({ deliveryId: d.id, status: s })}
                    className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-40"
                  >
                    {s === "picked_up"
                      ? t("তোলা হয়েছে", "Picked up")
                      : s === "in_transit"
                        ? t("পথে", "In transit")
                        : t("ডেলিভারড", "Delivered")}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

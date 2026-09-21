"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useStore } from "@/lib/store";
import { useAuth } from "@/hooks/useAuth";
import { cancelMyOrder, listMyOrders, submitOrderReturn } from "@/server/actions/orders";
import { useT } from "@/lib/i18n";

const STEPS = [
  { key: "confirmed", bn: "নিশ্চিত হয়েছে", en: "Confirmed" },
  { key: "processing", bn: "প্রস্তুত হচ্ছে", en: "Processing" },
  { key: "shipped", bn: "পথে আছে", en: "Shipped" },
  { key: "delivered", bn: "ডেলিভারি হয়েছে", en: "Delivered" },
];

const LABEL: Record<string, { bn: string; en: string }> = {
  confirmed: { bn: "নিশ্চিত হয়েছে", en: "Confirmed" },
  processing: { bn: "প্রস্তুত হচ্ছে", en: "Processing" },
  shipped: { bn: "পথে আছে", en: "Shipped" },
  delivered: { bn: "ডেলিভারি হয়েছে", en: "Delivered" },
  cancelled: { bn: "বাতিল", en: "Cancelled" },
  pending: { bn: "অপেক্ষমাণ", en: "Pending" },
};

const REASONS = [
  { key: "damaged", bn: "পণ্য ক্ষতিগ্রস্ত", en: "Item damaged" },
  { key: "wrong_item", bn: "ভুল পণ্য এসেছে", en: "Wrong item delivered" },
  { key: "expired", bn: "মেয়াদোত্তীর্ণ", en: "Expired product" },
  { key: "not_needed", bn: "আর প্রয়োজন নেই", en: "No longer needed" },
  { key: "other", bn: "অন্যান্য", en: "Other" },
];

export default function OrdersPage() {
  const t = useT();
  const { add } = useStore();
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ id: string; text: string } | null>(null);
  const [returnFor, setReturnFor] = useState<string | null>(null);
  const [reason, setReason] = useState("damaged");
  const [details, setDetails] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["my-orders"],
    enabled: !!user,
    queryFn: () => listMyOrders(),
  });

  async function cancelOrder(id: string, no: string) {
    if (!window.confirm(t(`অর্ডার #${no} বাতিল করতে চান?`, `Cancel order #${no}?`))) return;
    setBusy(id);
    try {
      await cancelMyOrder(no);
      setMsg({ id, text: t("অর্ডার বাতিল হয়েছে।", "Order cancelled.") });
      void qc.invalidateQueries({ queryKey: ["my-orders"] });
    } catch {
      setMsg({ id, text: t("বাতিল করা যায়নি।", "Could not cancel.") });
    } finally {
      setBusy(null);
    }
  }

  async function submitReturn(id: string, no: string) {
    setBusy(id);
    try {
      await submitOrderReturn({
        orderId: id,
        orderNo: no,
        reason,
        details: details.trim() || undefined,
      });
      setReturnFor(null);
      setDetails("");
      setMsg({ id, text: t("রিটার্ন অনুরোধ জমা হয়েছে।", "Return request submitted.") });
    } catch {
      setMsg({ id, text: t("অনুরোধ পাঠানো যায়নি।", "Could not submit.") });
    } finally {
      setBusy(null);
    }
  }

  if (loading || isLoading) {
    return <p className="pt-16 text-center text-sm text-muted-foreground">{t("লোড হচ্ছে...", "Loading...")}</p>;
  }

  if (!user) {
    return (
      <div className="pt-16 text-center">
        <h1 className="text-base font-bold">{t("অর্ডার দেখতে লগইন করুন", "Log in to view orders")}</h1>
        <Link
          href="/auth"
          className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
        >
          {t("লগইন", "Log in")}
        </Link>
      </div>
    );
  }

  const orders = data ?? [];

  return (
    <div className="pt-4">
      <h1 className="text-base font-bold">{t("আমার অর্ডার", "My orders")}</h1>
      {orders.length === 0 ? (
        <div className="pt-12 text-center">
          <p className="text-xs text-muted-foreground">{t("কোনো অর্ডার নেই।", "No orders yet.")}</p>
          <Link
            href="/products"
            className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
          >
            {t("কেনাকাটা শুরু করুন", "Start shopping")}
          </Link>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {orders.map((o) => {
            const status = o.status;
            const label = LABEL[status] ?? { bn: status, en: status };
            const stepIdx = STEPS.findIndex((s) => s.key === status);
            return (
              <div key={o.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold">#{o.orderNo}</p>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-primary-dark">
                    {t(label.bn, label.en)}
                  </span>
                  <span className="ml-auto text-xs font-bold text-primary">{t.money(Number(o.total))}</span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {(o.order_items ?? []).map((i) => `${i.name} ×${i.qty}`).join(", ")}
                </p>
                {status !== "cancelled" && stepIdx >= 0 && (
                  <div className="mt-2 flex gap-1">
                    {STEPS.map((s, i) => (
                      <div
                        key={s.key}
                        className={`h-1.5 flex-1 rounded-full ${i <= stepIdx ? "bg-primary" : "bg-muted"}`}
                        title={t(s.bn, s.en)}
                      />
                    ))}
                  </div>
                )}
                {(o.order_events?.length ?? 0) > 0 && (
                  <ul className="mt-2 space-y-1 border-t border-border pt-2">
                    {[...(o.order_events ?? [])]
                      .slice(0, 3)
                      .map((ev) => (
                        <li key={ev.id} className="text-[10px] text-muted-foreground">
                          <span className="font-semibold text-navy">
                            {t(LABEL[ev.status]?.bn ?? ev.status, LABEL[ev.status]?.en ?? ev.status)}
                          </span>
                          {ev.note ? ` — ${ev.note}` : ""}
                        </li>
                      ))}
                  </ul>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link
                    href={`/track/${encodeURIComponent(o.orderNo)}`}
                    className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold"
                  >
                    {t("ট্র্যাক", "Track")}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      for (const i of o.order_items ?? []) {
                        if (i.productId) {
                          add(
                            {
                              id: i.productId,
                              name: i.name,
                              price: Number(i.unitPrice),
                              kind: "product",
                            },
                            i.qty,
                          );
                        }
                      }
                    }}
                    className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold"
                  >
                    {t("আবার অর্ডার", "Reorder")}
                  </button>
                  {!["shipped", "delivered", "cancelled"].includes(status) && (
                    <button
                      type="button"
                      disabled={busy === o.id}
                      onClick={() => void cancelOrder(o.id, o.orderNo)}
                      className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold text-sale disabled:opacity-50"
                    >
                      {t("বাতিল", "Cancel")}
                    </button>
                  )}
                  {status === "delivered" && (
                    <button
                      type="button"
                      onClick={() => setReturnFor(returnFor === o.id ? null : o.id)}
                      className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold"
                    >
                      {t("রিটার্ন/রিফান্ড", "Return / refund")}
                    </button>
                  )}
                </div>
                {returnFor === o.id && (
                  <div className="mt-3 rounded-lg border border-border bg-secondary/40 p-3">
                    <p className="text-xs font-semibold">{t("রিটার্নের কারণ", "Reason for return")}</p>
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-border bg-background px-2 py-2 text-xs"
                    >
                      {REASONS.map((r) => (
                        <option key={r.key} value={r.key}>
                          {t(r.bn, r.en)}
                        </option>
                      ))}
                    </select>
                    <textarea
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      rows={2}
                      placeholder={t("বিস্তারিত লিখুন (ঐচ্ছিক)", "Add details (optional)")}
                      className="mt-2 w-full rounded-lg border border-border bg-background p-2 text-xs"
                    />
                    <button
                      type="button"
                      disabled={busy === o.id}
                      onClick={() => void submitReturn(o.id, o.orderNo)}
                      className="mt-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                    >
                      {t("রিটার্ন অনুরোধ পাঠান", "Submit request")}
                    </button>
                  </div>
                )}
                {msg?.id === o.id && (
                  <p className="mt-1 text-[11px] font-semibold text-muted-foreground">{msg.text}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useDismissable } from "@/hooks/useDismissable";
import { useRouter } from "next/navigation";
import { MapPin, ChevronDown, Check, Trash2, Plus, Truck } from "lucide-react";

import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { AddressPicker, emptyAddress, formatAddress, type PickedAddress } from "@/components/AddressPicker";

const OPEN_KEY = "ow-deliver-bar-open";

/** হেডারের "ডেলিভারি" বার — হাইড/আনহাইড প্যানেলসহ, লগইন ছাড়াই ঠিকানা বদলানো যায় */
export function DeliverToBar({ full = false }: { full?: boolean }) {
  const t = useT();
  const router = useRouter();
  const { addresses, activeAddress, setActiveAddress, addAddress, removeAddress } = useStore();
  const { user } = useAuth();

  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<PickedAddress>(emptyAddress);
  const [orderNo, setOrderNo] = useState("");

  useEffect(() => {
    try {
      setOpen(localStorage.getItem(OPEN_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const setOpenPersist = useCallback((next: boolean) => {
    setOpen(next);
    try {
      localStorage.setItem(OPEN_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const close = useCallback(() => setOpenPersist(false), [setOpenPersist]);
  const toggle = () => setOpenPersist(!open);
  const { ref: wrapRef, triggerRef } = useDismissable<HTMLDivElement>(open, close);

  const addr = addresses.find((a) => a.id === activeAddress) ?? addresses[0];

  const save = () => {
    if (!draft.district && !draft.details) return;
    addAddress({
      label: t("ঠিকানা", "Address"),
      area: [draft.area, draft.thana, draft.district].filter(Boolean).join(", ") || formatAddress(draft, t.en),
      details: draft.details,
      phone: "",
      district: draft.district,
      cityZone: draft.cityZone,
      thana: draft.thana,
      lat: draft.lat,
      lng: draft.lng,
    });
    setDraft(emptyAddress);
    setAdding(false);
  };

  return (
    <div className={`relative ${full ? "w-full" : ""}`} ref={wrapRef}>
      <button
        type="button"
        ref={triggerRef}
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`flex items-center gap-1.5 rounded-full border border-border bg-muted text-navy transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
          full
            ? "min-h-11 w-full px-3.5 py-2 text-xs"
            : "max-w-[190px] px-2.5 py-1.5 text-[11px]"
        }`}
      >
        <MapPin className="h-4 w-4 shrink-0 text-primary" />
        <span className="shrink-0 font-semibold text-muted-foreground">{t("ডেলিভারি:", "Deliver to:")}</span>
        <span className="min-w-0 flex-1 truncate text-left font-semibold">
          {addr ? addr.area : t("ঠিকানা যোগ করুন", "Add address")}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label={t("বন্ধ", "Close")}
            onClick={close}
            className="fixed inset-0 z-30 cursor-default bg-navy/20"
          />
          <div
            role="dialog"
            aria-label={t("ডেলিভারি ঠিকানা", "Delivery address")}
            className="fixed inset-x-3 top-24 z-40 max-h-[70vh] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card px-4 py-3 shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[380px]"
          >
            <p className="text-[11px] font-bold text-navy">{t("ডেলিভারি ঠিকানা", "Delivery address")}</p>
            <ul className="mt-2 space-y-1.5">
              {addresses.map((a) => (
                <li key={a.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveAddress(a.id)}
                    className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-[11px] ${
                      a.id === (addr?.id ?? "") ? "border-primary bg-secondary" : "border-border"
                    }`}
                  >
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-navy">{a.area}</span>
                      {a.details && <span className="block truncate text-muted-foreground">{a.details}</span>}
                    </span>
                    {a.id === (addr?.id ?? "") && <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-primary" />}
                  </button>
                  {addresses.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAddress(a.id)}
                      aria-label={t("মুছুন", "Remove")}
                      className="shrink-0 rounded-lg border border-border p-2 text-muted-foreground"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>

            {adding ? (
              <div className="mt-3 rounded-xl border border-border p-3">
                <AddressPicker value={draft} onChange={setDraft} compact />
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={save}
                    className="rounded-lg bg-primary px-3 py-2 text-[11px] font-bold text-primary-foreground"
                  >
                    {t("ঠিকানা সংরক্ষণ", "Save address")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdding(false)}
                    className="px-3 py-2 text-[11px] font-semibold text-muted-foreground"
                  >
                    {t("বাতিল", "Cancel")}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="mt-2 flex items-center gap-1.5 rounded-lg border border-dashed border-primary px-3 py-2 text-[11px] font-semibold text-primary"
              >
                <Plus className="h-3.5 w-3.5" /> {t("জিপিএস দিয়ে নতুন ঠিকানা", "Add address with GPS")}
              </button>
            )}

            <p className="mt-4 flex items-center gap-1.5 text-[11px] font-bold text-navy">
              <Truck className="h-3.5 w-3.5 text-primary" /> {t("অর্ডার ট্র্যাক", "Track order")}
            </p>
            <div className="mt-2 flex gap-2">
              <input
                value={orderNo}
                onChange={(e) => setOrderNo(e.target.value)}
                placeholder={t("অর্ডার নম্বর", "Order number")}
                className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-[11px]"
              />
              <button
                type="button"
                disabled={!orderNo.trim()}
                onClick={() => router.push(`/track/${encodeURIComponent(orderNo.trim())}`)}
                className="rounded-lg bg-primary px-3 py-2 text-[11px] font-bold text-primary-foreground disabled:opacity-50"
              >
                {t("ট্র্যাক", "Track")}
              </button>
            </div>
            {!user && (
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                {t("অর্ডার হিস্ট্রি দেখতে ", "To view order history, ")}
                <button type="button" onClick={() => router.push("/auth")} className="font-semibold text-primary underline">
                  {t("লগইন করুন", "log in")}
                </button>
                {t("।", ".")}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

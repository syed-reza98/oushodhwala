"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useCatalog, catalogQueryKey, deliveryChargeFor } from "@/lib/catalog-db";
import { useAuth } from "@/hooks/useAuth";
import { placeOrder } from "@/server/actions/orders";
import { useT } from "@/lib/i18n";

const ALL_PAYMENTS = [
  { id: "cod", t: "ক্যাশ অন ডেলিভারি", tEn: "Cash on delivery", d: "পণ্য হাতে পেয়ে টাকা দিন", dEn: "Pay when you receive the product", e: "💵", key: "cod" as const },
  { id: "bkash", t: "bKash", tEn: "bKash", d: "মোবাইল ব্যাংকিং", dEn: "Mobile banking", e: "📱", key: "bkash" as const },
  { id: "nagad", t: "Nagad", tEn: "Nagad", d: "মোবাইল ব্যাংকিং", dEn: "Mobile banking", e: "📲", key: "nagad" as const },
  { id: "card", t: "কার্ড", tEn: "Card", d: "ক্রেডিট / ডেবিট কার্ড", dEn: "Credit / Debit card", e: "💳", key: "card" as const },
];

export default function CheckoutPage() {
  const t = useT();
  const {
    cart,
    subtotal,
    addresses,
    activeAddress,
    setActiveAddress,
    addAddress,
    clear,
    couponCode,
    setCouponCode,
  } = useStore();
  const { offers, products, settings } = useCatalog();
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [payRef, setPayRef] = useState("");
  const [payment, setPayment] = useState("cod");
  const [note, setNote] = useState("");
  const SLOTS = [
    { bn: "যত দ্রুত সম্ভব", en: "As soon as possible" },
    { bn: "আজ সন্ধ্যা ৬-৯", en: "Today evening 6-9" },
    { bn: "আগামীকাল সকাল ৯-১২", en: "Tomorrow morning 9-12" },
  ] as const;
  const [slot, setSlot] = useState<string>(SLOTS[0].bn);
  const [express, setExpress] = useState(false);
  const [usePoints, setUsePoints] = useState(false);
  const [form, setForm] = useState({ label: "", area: "", details: "", phone: "" });
  const [showForm, setShowForm] = useState(false);
  const [placed, setPlaced] = useState<string | null>(null);

  const loyaltyQ = useQuery({
    queryKey: ["my-loyalty"],
    enabled: !!user,
    queryFn: async () => {
      const res = await fetch("/api/account/loyalty", { cache: "no-store" });
      if (!res.ok) return { balance: 0, tier: "silver" };
      return res.json() as Promise<{ balance: number; tier: string }>;
    },
  });

  const appliedOffer = offers.find((o) => o.code === couponCode && subtotal >= o.minOrder) ?? null;
  const couponCut = appliedOffer
    ? Math.min(Math.round((subtotal * appliedOffer.discountPct) / 100), appliedOffer.maxDiscount || Infinity)
    : 0;
  const expressOn = settings.expressEnabled && express;
  const expressFee = expressOn ? settings.expressFee : 0;
  const delivery = deliveryChargeFor(subtotal - couponCut, settings) + expressFee;
  const slotLabel = SLOTS.find((s) => s.bn === slot);
  const effectiveSlot = expressOn
    ? t(`জরুরি ডেলিভারি (${settings.expressEta})`, `Express delivery (${settings.expressEta})`)
    : t(slot, slotLabel?.en ?? slot);

  const payableBeforePoints = Math.max(0, subtotal - couponCut + delivery);
  const pointBalance = loyaltyQ.data?.balance ?? 0;
  const maxPoints = Math.min(pointBalance, Math.floor(payableBeforePoints * 0.5));
  const pointCut = usePoints ? maxPoints : 0;
  const total = Math.max(0, payableBeforePoints - pointCut);

  const payments = ALL_PAYMENTS.filter((m) => settings[m.key]);
  const method: string = payments.some((m) => m.id === payment) ? payment : (payments[0]?.id ?? "cod");
  const addr = addresses.find((a) => a.id === activeAddress) ?? addresses[0];
  const stockIssues = cart
    .filter((l) => l.kind === "product")
    .map((l) => ({ line: l, p: products.find((x) => x.id === l.id) }))
    .filter(({ line, p }) => p && p.stock < line.qty);
  const needsRef = method === "bkash" || method === "nagad" || method === "card";

  const submit = async () => {
    if (!user) {
      toast.error(t("অর্ডার করতে লগইন করুন", "Please log in to place an order"));
      router.push("/auth");
      return;
    }
    if (!addr) {
      toast.error(t("ডেলিভারি ঠিকানা যোগ করুন", "Please add a delivery address"));
      return;
    }
    if (stockIssues.length > 0) {
      toast.error(
        t("কিছু পণ্যের স্টক নেই — কার্ট আপডেট করুন", "Some products are out of stock — please update your cart"),
      );
      return;
    }
    setBusy(true);
    try {
      let ref = "";
      if (needsRef) {
        await new Promise((r) => setTimeout(r, 400));
        ref = payRef.trim() || `${method.toUpperCase()}${Math.floor(1e9 + Math.random() * 8e9)}`;
      }
      const data = await placeOrder({
        items: cart.map((l) => ({
          id: l.id,
          kind: l.kind,
          name: l.name,
          price: l.price,
          qty: l.qty,
        })),
        customerName: profile?.name || user.email || t("গ্রাহক", "Customer"),
        phone: addr.phone,
        address: `${addr.label} · ${addr.area} — ${addr.details}${note.trim() ? ` (${note.trim()})` : ""}`,
        slot: effectiveSlot,
        deliveryFee: delivery,
        discount: couponCut,
        paymentMethod: method,
        paymentRef: ref,
        usePoints,
      });
      clear();
      setCouponCode(null);
      void qc.invalidateQueries({ queryKey: catalogQueryKey });
      void qc.invalidateQueries({ queryKey: ["my-orders"] });
      void qc.invalidateQueries({ queryKey: ["my-loyalty"] });
      setPlaced(data.order_no);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("অর্ডার সম্পন্ন হয়নি", "Order could not be placed");
      if (msg.startsWith("OUT_OF_STOCK")) {
        const [, name, left] = msg.split(":");
        toast.error(
          t(`${name} এর পর্যাপ্ত স্টক নেই (বাকি ${left} টি)`, `${name} does not have enough stock (${left} left)`),
        );
        void qc.invalidateQueries({ queryKey: catalogQueryKey });
      } else if (msg.includes("AUTH_REQUIRED")) {
        toast.error(t("অর্ডার করতে লগইন করুন", "Please log in to place an order"));
      } else {
        toast.error(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  if (placed) {
    return (
      <div className="pt-16 text-center">
        <p className="text-4xl">✅</p>
        <h1 className="mt-3 text-lg font-bold">{t("অর্ডার সফল হয়েছে!", "Order placed successfully!")}</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("অর্ডার নম্বর:", "Order number:")} {placed}
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Link
            href="/orders"
            className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
          >
            {t("অর্ডার ট্র্যাক করুন", "Track order")}
          </Link>
          <Link href="/" className="rounded-lg border border-border px-4 py-2 text-xs font-semibold">
            {t("হোমে ফিরুন", "Back to home")}
          </Link>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="pt-16 text-center">
        <h1 className="text-base font-bold">
          {t("চেকআউট করার জন্য কার্টে পণ্য নেই", "There are no products in the cart to checkout")}
        </h1>
        <Link
          href="/products?q=&category=all&sort=popular"
          className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
        >
          {t("কেনাকাটা করুন", "Shop now")}
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-4">
      <h1 className="text-base font-bold">{t("চেকআউট", "Checkout")}</h1>
      <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <section className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-bold">{t("ডেলিভারি ঠিকানা", "Delivery address")}</p>
            <div className="mt-2 space-y-2">
              {addresses.map((a) => (
                <label key={a.id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-border p-2.5">
                  <input
                    type="radio"
                    checked={activeAddress === a.id}
                    onChange={() => setActiveAddress(a.id)}
                    className="mt-1"
                  />
                  <span className="text-xs">
                    <span className="block font-semibold">
                      {a.label} · {a.area}
                    </span>
                    <span className="block text-muted-foreground">
                      {a.details} · {a.phone}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            {showForm ? (
              <div className="mt-3 space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  {(
                    [
                      ["label", t("লেবেল", "Label")],
                      ["area", t("এলাকা", "Area")],
                      ["details", t("বিস্তারিত", "Details")],
                      ["phone", t("ফোন", "Phone")],
                    ] as const
                  ).map(([k, ph]) => (
                    <input
                      key={k}
                      value={form[k]}
                      onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                      placeholder={ph}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-xs"
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!form.area || !form.details || !form.phone) return;
                    addAddress({
                      label: form.label || t("বাড়ি", "Home"),
                      area: form.area,
                      details: form.details,
                      phone: form.phone,
                    });
                    setForm({ label: "", area: "", details: "", phone: "" });
                    setShowForm(false);
                  }}
                  className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
                >
                  {t("সংরক্ষণ", "Save")}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="mt-2 text-xs font-semibold text-primary underline"
              >
                {t("নতুন ঠিকানা যোগ করুন", "Add new address")}
              </button>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-bold">{t("ডেলিভারি স্লট", "Delivery slot")}</p>
            <div className="mt-2 space-y-2">
              {SLOTS.map((s) => (
                <label key={s.bn} className="flex items-center gap-2 text-xs">
                  <input
                    type="radio"
                    checked={slot === s.bn && !expressOn}
                    onChange={() => {
                      setSlot(s.bn);
                      setExpress(false);
                    }}
                  />
                  {t(s.bn, s.en)}
                </label>
              ))}
              {settings.expressEnabled && (
                <label className="flex items-center gap-2 text-xs font-semibold text-primary">
                  <input type="checkbox" checked={express} onChange={(e) => setExpress(e.target.checked)} />
                  {t(
                    `জরুরি (+${t.money(settings.expressFee)}) — ${settings.expressEta}`,
                    `Express (+${t.money(settings.expressFee)}) — ${settings.expressEta}`,
                  )}
                </label>
              )}
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("অর্ডার নোট (ঐচ্ছিক)", "Order note (optional)")}
              className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
              rows={2}
            />
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-bold">{t("পেমেন্ট মাধ্যম", "Payment method")}</p>
            <div className="mt-2 space-y-2">
              {payments.map((m) => (
                <label key={m.id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-border p-2.5">
                  <input type="radio" checked={method === m.id} onChange={() => setPayment(m.id)} className="mt-1" />
                  <span className="text-xs">
                    <span className="block font-semibold">
                      {m.e} {t(m.t, m.tEn)}
                    </span>
                    <span className="block text-muted-foreground">{t(m.d, m.dEn)}</span>
                  </span>
                </label>
              ))}
            </div>
            {needsRef && (
              <input
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                placeholder={t("ট্রানজেকশন আইডি (ঐচ্ছিক)", "Transaction ID (optional)")}
                className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
              />
            )}
          </section>
        </div>

        <aside className="h-fit rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-bold">{t("অর্ডার সারাংশ", "Order summary")}</p>
          <ul className="mt-2 space-y-1 text-xs">
            {cart.map((l) => (
              <li key={l.id} className="flex justify-between gap-2">
                <span className="truncate">
                  {l.name} ×{t.n(l.qty)}
                </span>
                <span className="font-semibold">{t.money(l.price * l.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1.5 border-t border-border pt-3 text-xs">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t("সাবটোটাল", "Subtotal")}</dt>
              <dd className="font-semibold">{t.money(subtotal)}</dd>
            </div>
            {couponCut > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("কুপন ছাড়", "Coupon discount")}</dt>
                <dd className="font-semibold">− {t.money(couponCut)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t("ডেলিভারি", "Delivery")}</dt>
              <dd className="font-semibold">{delivery === 0 ? t("ফ্রি", "Free") : t.money(delivery)}</dd>
            </div>

            {pointBalance > 0 && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-2 mt-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="flex items-center gap-1.5 text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={usePoints}
                      onChange={(e) => setUsePoints(e.target.checked)}
                      className="rounded text-primary"
                    />
                    {t(`লয়ালটি পয়েন্ট ব্যবহার (${t.n(pointBalance)})`, `Use loyalty points (${t.n(pointBalance)})`)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {t(`সর্বোচ্চ ৳${maxPoints}`, `Max ৳${maxPoints}`)}
                  </span>
                </label>
              </div>
            )}

            {pointCut > 0 && (
              <div className="flex justify-between text-primary">
                <dt className="font-medium">{t("পয়েন্ট ছাড়", "Points discount")}</dt>
                <dd className="font-semibold">− {t.money(pointCut)}</dd>
              </div>
            )}

            <div className="flex justify-between border-t border-border pt-2 text-sm font-bold">
              <dt>{t("সর্বমোট", "Total")}</dt>
              <dd className="text-primary-dark">{t.money(total)}</dd>
            </div>
          </dl>
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="mt-4 w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? t("প্রসেস হচ্ছে...", "Processing...") : t("অর্ডার নিশ্চিত করুন", "Confirm order")}
          </button>
        </aside>
      </div>
    </div>
  );
}

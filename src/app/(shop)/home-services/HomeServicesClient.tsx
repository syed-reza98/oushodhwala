"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, HomeIcon } from "lucide-react";
import { useCatalog } from "@/lib/catalog-db";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/lib/i18n";
import { useLang, pick } from "@/lib/lang";
import { bookHomeService } from "@/server/actions/bookings";

const SLOTS = [
  { v: "সকাল ৮টা–১১টা", en: "8 AM – 11 AM" },
  { v: "দুপুর ১১টা–২টা", en: "11 AM – 2 PM" },
  { v: "বিকেল ২টা–৫টা", en: "2 PM – 5 PM" },
  { v: "সন্ধ্যা ৫টা–৮টা", en: "5 PM – 8 PM" },
  { v: "রাত ৮টা–১১টা", en: "8 PM – 11 PM" },
];

export default function HomeServicesClient() {
  const t = useT();
  const { lang } = useLang();
  const sp = useSearchParams();
  const { categories, settings } = useCatalog();
  const { user } = useAuth();

  const services = useMemo(
    () => categories.filter((c) => c.kind === "service" && c.serviceRoute !== "/home-diagnostics"),
    [categories],
  );
  const initial = sp.get("s") || services[0]?.slug || "";
  const [slug, setSlug] = useState(initial);
  const active = services.find((c) => c.slug === slug) ?? services[0];

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    date: "",
    slot: SLOTS[0]!.v,
    note: "",
  });
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user) {
      toast.error(t("বুকিংয়ের জন্য লগইন করুন", "Please log in to book"));
      return;
    }
    if (!active) {
      toast.error(t("সেবা নির্বাচন করুন", "Select a service"));
      return;
    }
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
      toast.error(t("নাম, ফোন ও ঠিকানা দিন", "Enter name, phone and address"));
      return;
    }
    setBusy(true);
    try {
      const res = await bookHomeService({
        serviceSlug: active.slug,
        serviceName: pick(lang, active.bn, active.en),
        patientName: form.name,
        phone: form.phone,
        address: form.address,
        scheduledDate: form.date || undefined,
        slot: form.slot,
        fee: active.baseFee ?? 0,
        note: form.note || undefined,
      });
      setDone(res.requestNo);
      toast.success(t("হোম সার্ভিস বুক হয়েছে", "Home service booked"));
    } catch {
      toast.error(t("বুকিং ব্যর্থ", "Booking failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pt-4 pb-10">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-secondary to-card p-4">
        <p className="flex items-center gap-2 font-display text-lg font-extrabold text-navy">
          <HomeIcon className="h-5 w-5 text-primary" /> {t("হোম সার্ভিস", "Home services")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("প্রশিক্ষিত টিম আপনার বাসায় এসে সেবা দেবে।", "Our trained team delivers care at your doorstep.")}
        </p>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {t("হটলাইন:", "Hotline:")} {settings.supportPhone}
        </p>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {services.map((c) => (
          <button
            key={c.slug}
            type="button"
            onClick={() => setSlug(c.slug)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
              slug === c.slug ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
            }`}
          >
            {c.emoji} {pick(lang, c.bn, c.en)}
          </button>
        ))}
      </div>

      {services.length === 0 && (
        <p className="mt-4 text-xs text-muted-foreground">{t("এখন কোনো সেবা নেই।", "No services available.")}</p>
      )}

      {active && (
        <div className="mt-4 rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-bold">
            {active.emoji} {pick(lang, active.bn, active.en)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{pick(lang, active.desc, active.descEn)}</p>
          {active.baseFee > 0 && (
            <p className="mt-2 text-sm font-bold text-primary">
              {t(`শুরু ৳${t.n(active.baseFee)}`, `from ৳${t.n(active.baseFee)}`)}
            </p>
          )}
        </div>
      )}

      {done ? (
        <div className="mt-4 rounded-xl border border-primary bg-secondary p-4 text-center">
          <CheckCircle2 className="mx-auto h-7 w-7 text-primary" />
          <p className="mt-2 text-sm font-bold">{t("বুকিং গ্রহণ করা হয়েছে", "Booking received")}</p>
          <p className="mt-1 text-xs text-muted-foreground">#{done}</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-2 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={t("রোগীর নাম", "Patient name")}
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs"
          />
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder={t("ফোন", "Phone")}
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs"
          />
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs"
          />
          <select
            value={form.slot}
            onChange={(e) => setForm({ ...form, slot: e.target.value })}
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs"
          >
            {SLOTS.map((s) => (
              <option key={s.v} value={s.v}>
                {t(s.v, s.en)}
              </option>
            ))}
          </select>
          <textarea
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder={t("ঠিকানা", "Address")}
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs sm:col-span-2"
            rows={2}
          />
          <textarea
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder={t("নোট", "Note")}
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs sm:col-span-2"
            rows={2}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50 sm:col-span-2"
          >
            {busy ? t("বুক হচ্ছে…", "Booking…") : t("বুক করুন", "Book now")}
          </button>
        </div>
      )}

      <Link href="/lab-test" className="mt-4 inline-block text-xs font-semibold text-primary">
        {t("ল্যাব টেস্ট দেখুন", "See lab tests")} →
      </Link>
    </div>
  );
}

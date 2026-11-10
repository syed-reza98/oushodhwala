"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  HomeIcon,
  Clock,
  Calendar,
  MapPin,
  History,
  Phone,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { useCatalog } from "@/lib/catalog-db";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/lib/i18n";
import { useLang, pick } from "@/lib/lang";
import { bookHomeService, listMyHomeServiceRequests } from "@/server/actions/bookings";

const SLOTS = [
  { v: "সকাল ৮টা–১১টা", en: "8 AM – 11 AM" },
  { v: "দুপুর ১১টা–২টা", en: "11 AM – 2 PM" },
  { v: "বিকেল ২টা–৫টা", en: "2 PM – 5 PM" },
  { v: "সন্ধ্যা ৫টা–৮টা", en: "5 PM – 8 PM" },
  { v: "রাত ৮টা–১১টা", en: "8 PM – 11 PM" },
];

const POPULAR_THANAS = [
  { bn: "ধানমন্ডি", en: "Dhanmondi" },
  { bn: "গুলশান", en: "Gulshan" },
  { bn: "বনানী", en: "Banani" },
  { bn: "উত্তরা", en: "Uttara" },
  { bn: "মিরপুর", en: "Mirpur" },
  { bn: "মোহাম্মদপুর", en: "Mohammadpur" },
  { bn: "বাড্ডা", en: "Badda" },
  { bn: "খিলগাঁও", en: "Khilgaon" },
  { bn: "মতিঝিল", en: "Motijheel" },
  { bn: "তেজগাঁও", en: "Tejgaon" },
  { bn: "লালবাগ", en: "Lalbagh" },
  { bn: "যাত্রাবাড়ী", en: "Jatrabari" },
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
    thana: POPULAR_THANAS[0]!.bn,
    areaDetails: "",
    date: "",
    slot: SLOTS[0]!.v,
    note: "",
  });
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: myRequests, refetch: refetchRequests } = useQuery({
    queryKey: ["my-home-service-requests"],
    enabled: !!user,
    queryFn: () => listMyHomeServiceRequests(),
  });

  const submit = async () => {
    if (!user) {
      toast.error(t("বুকিংয়ের জন্য লগইন করুন", "Please log in to book"));
      return;
    }
    if (!active) {
      toast.error(t("সেবা নির্বাচন করুন", "Select a service"));
      return;
    }
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error(t("নাম ও মোবাইল নম্বর দিন", "Enter name and phone"));
      return;
    }
    if (!form.thana.trim() || !form.areaDetails.trim()) {
      toast.error(t("থানা ও বিস্তারিত ঠিকানা লিখুন", "Select thana and provide detailed address"));
      return;
    }

    const fullAddress = `${form.thana}, ${form.areaDetails.trim()}`;

    setBusy(true);
    try {
      const res = await bookHomeService({
        serviceSlug: active.slug,
        serviceName: pick(lang, active.bn, active.en),
        patientName: form.name.trim(),
        phone: form.phone.trim(),
        address: fullAddress,
        scheduledDate: form.date || undefined,
        slot: form.slot,
        fee: active.baseFee ?? 0,
        note: form.note.trim() || undefined,
      });
      setDone(res.requestNo);
      void refetchRequests();
      toast.success(t("হোম সার্ভিস বুক হয়েছে", "Home service booked successfully"));
    } catch {
      toast.error(t("বুকিং ব্যর্থ", "Booking failed"));
    } finally {
      setBusy(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { labelBn: string; labelEn: string; cls: string }> = {
      requested: { labelBn: "অপেক্ষমান", labelEn: "Requested", cls: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
      assigned: { labelBn: "কর্মী নির্ধারিত", labelEn: "Assigned", cls: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
      in_progress: { labelBn: "সেবা চলমান", labelEn: "In Progress", cls: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
      completed: { labelBn: "সম্পন্ন", labelEn: "Completed", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
      cancelled: { labelBn: "বাতিল", labelEn: "Cancelled", cls: "bg-destructive/10 text-destructive border-destructive/30" },
    };
    return badges[status] || { labelBn: status, labelEn: status, cls: "bg-secondary text-foreground" };
  };

  return (
    <div className="pt-4 pb-12 max-w-3xl mx-auto px-2 sm:px-4">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-secondary to-card p-4">
        <p className="flex items-center gap-2 font-display text-lg font-extrabold text-navy">
          <HomeIcon className="h-5 w-5 text-primary" /> {t("হোম হেলথকেয়ার সার্ভিস", "Home Healthcare Services")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("প্রশিক্ষিত নার্স ও টেকনিশিয়ান টিম আপনার বাসায় এসে স্বাস্থ্যসেবা প্রদান করবে।", "Trained nurses and care teams deliver professional care at your doorstep.")}
        </p>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {t("জরুরি হটলাইন:", "Emergency Hotline:")} <span className="font-semibold text-primary">{settings.supportPhone}</span>
        </p>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {services.map((c) => (
          <button
            key={c.slug}
            type="button"
            onClick={() => setSlug(c.slug)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
              slug === c.slug
                ? "border-primary bg-primary text-primary-foreground shadow-xs"
                : "border-border bg-card hover:bg-secondary"
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
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold flex items-center gap-2">
              <span className="text-xl">{active.emoji}</span> {pick(lang, active.bn, active.en)}
            </p>
            {active.baseFee > 0 && (
              <p className="text-sm font-bold text-primary">
                {t(`ফি: ৳${t.n(active.baseFee)}`, `Fee: ৳${t.n(active.baseFee)}`)}
              </p>
            )}
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {pick(lang, active.desc, active.descEn)}
          </p>
        </div>
      )}

      {done ? (
        <div className="mt-4 rounded-xl border border-primary/50 bg-primary/5 p-5 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-primary" />
          <p className="mt-2 text-sm font-bold text-navy">{t("বুকিং সফলভাবে গ্রহণ করা হয়েছে", "Booking Received Successfully")}</p>
          <p className="mt-1 font-mono text-xs font-bold text-primary">#{done}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("আমাদের প্রতিনিধি দ্রুত আপনার সাথে যোগাযোগ করবে।", "Our care team will call you shortly to confirm timing.")}
          </p>
          <button
            type="button"
            onClick={() => {
              setDone(null);
              setForm({ ...form, areaDetails: "", note: "" });
            }}
            className="mt-4 inline-block rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground"
          >
            {t("আরেকটি সেবা বুক করুন", "Book another service")}
          </button>
        </div>
      ) : (
        <div className="mt-4 grid gap-2.5 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
              {t("রোগীর নাম *", "Patient Name *")}
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t("পুরো নাম", "Full Name")}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
              {t("মোবাইল নম্বর *", "Mobile Phone *")}
            </label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder={t("০১৭xxxxxxxx", "017xxxxxxxx")}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
              {t("থানা / এলাকা *", "Thana / Area *")}
            </label>
            <select
              value={form.thana}
              onChange={(e) => setForm({ ...form, thana: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
            >
              {POPULAR_THANAS.map((th) => (
                <option key={th.bn} value={th.bn}>
                  {t(th.bn, th.en)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
              {t("তারিখ ও সময় স্লট", "Date & Time Slot")}
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none focus:border-primary"
              />
              <select
                value={form.slot}
                onChange={(e) => setForm({ ...form, slot: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none focus:border-primary"
              >
                {SLOTS.map((s) => (
                  <option key={s.v} value={s.v}>
                    {t(s.v, s.en)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
              {t("বাসা নং, রোড ও বিস্তারিত ঠিকানা *", "House, Road, Block & Full Address *")}
            </label>
            <input
              value={form.areaDetails}
              onChange={(e) => setForm({ ...form, areaDetails: e.target.value })}
              placeholder={t("বাড়ি ১২, রোড ৫, ব্লক ডি...", "House 12, Road 5, Block D...")}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
              {t("রোগীর অবস্থা / বিশেষ নির্দেশনা (ঐচ্ছিক)", "Patient condition / Special instructions (optional)")}
            </label>
            <textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder={t("যেমন: ড্রেসিং পরিবর্তনের জন্য গজ ও ব্যান্ডেজ প্রয়োজন...", "e.g. Dressing change, requires sterile gauze...")}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
              rows={2}
            />
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="rounded-lg bg-primary py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50 sm:col-span-2 transition hover:bg-primary-dark"
          >
            {busy ? t("বুকিং জমা হচ্ছে…", "Submitting booking…") : t("হোম সার্ভিস বুক করুন", "Book Home Service")}
          </button>
        </div>
      )}

      {/* Service Request History Timeline */}
      {user && myRequests && myRequests.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold flex items-center gap-1.5 text-navy">
              <History className="h-4 w-4 text-primary" />
              {t("আমার সেবা বুকিং হিস্ট্রি", "My Service Request History")}
            </h2>
            <span className="text-[11px] text-muted-foreground">
              {myRequests.length} {t("টি আবেদন", "requests")}
            </span>
          </div>

          <div className="space-y-3">
            {myRequests.map((req) => {
              const badge = getStatusBadge(req.status);
              return (
                <div key={req.id} className="rounded-xl border border-border bg-card p-4 transition hover:border-primary/40">
                  <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-border/60">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-foreground">#{req.requestNo}</span>
                        <span className={`rounded-full border px-2 py-0.2 text-[10px] font-bold ${badge.cls}`}>
                          {t(badge.labelBn, badge.labelEn)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-primary">{req.serviceName}</p>
                    </div>
                    {req.fee > 0 && (
                      <span className="text-xs font-bold text-foreground">
                        ৳{t.n(req.fee)}
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                    <p className="flex items-center gap-1.5 truncate">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{req.address}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>{req.scheduledDate || t("শীঘ্রই", "Soon")} · {req.slot}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>{req.phone} ({req.patientName})</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>{new Date(req.createdAt).toLocaleDateString("bn-BD")}</span>
                    </p>
                  </div>

                  {req.note && (
                    <p className="mt-2 rounded-lg bg-secondary/50 p-2 text-[10px] text-muted-foreground italic">
                      "{req.note}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="mt-6 flex justify-between items-center text-xs">
        <Link href="/lab-test" className="font-semibold text-primary hover:underline">
          ← {t("হোম ডায়াগনস্টিক ল্যাব টেস্ট", "Home Diagnostic Lab Tests")}
        </Link>
        <Link href="/doctors" className="font-semibold text-primary hover:underline">
          {t("অনলাইন ডাক্তার পরামর্শ", "Online Doctor Consultation")} →
        </Link>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircle2, HomeIcon, CalendarDays, TestTube2 } from "lucide-react";
import { useCatalog } from "@/lib/catalog-db";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/lib/i18n";
import { matchesQuery } from "@/lib/bn-search";
import { bookDiagnostics } from "@/server/actions/bookings";

const COLLECTION_FEE = 150;

const SLOTS = [
  { id: "07-09", bn: "সকাল ৭টা – ৯টা", en: "7 AM – 9 AM" },
  { id: "09-12", bn: "সকাল ৯টা – দুপুর ১২টা", en: "9 AM – 12 PM" },
  { id: "12-16", bn: "দুপুর ১২টা – বিকাল ৪টা", en: "12 PM – 4 PM" },
  { id: "16-20", bn: "বিকাল ৪টা – রাত ৮টা", en: "4 PM – 8 PM" },
];

function nextDays(n: number) {
  const out: { iso: string; day: number; month: string }[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    out.push({
      iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      day: d.getDate(),
      month: d.toLocaleString("en-US", { month: "short" }),
    });
  }
  return out;
}

export default function HomeDiagnosticsPage() {
  const t = useT();
  const { user, profile } = useAuth();
  const { labTests } = useCatalog();

  const days = useMemo(() => nextDays(10), []);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [date, setDate] = useState(days[0]!.iso);
  const [slot, setSlot] = useState(SLOTS[0]!.id);
  const [form, setForm] = useState({ name: "", phone: "", address: "", note: "" });
  const [pay, setPay] = useState("cod");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<{ no: string; total: number } | null>(null);

  const list = labTests.filter((x) => matchesQuery(q, x.bn, x.en));
  const chosen = labTests.filter((x) => picked.includes(x.id));
  const subtotal = chosen.reduce((s, x) => s + x.price, 0);
  const total = subtotal + (chosen.length ? COLLECTION_FEE : 0);

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const submit = async () => {
    setErr("");
    if (!chosen.length) return setErr(t("অন্তত একটি টেস্ট নির্বাচন করুন।", "Select at least one test."));
    const name = form.name || profile?.name || "";
    const phone = form.phone || profile?.phone || "";
    if (!name.trim() || !phone.trim() || !form.address.trim()) {
      return setErr(t("নাম, ফোন ও ঠিকানা দিন।", "Name, phone and address are required."));
    }
    setBusy(true);
    try {
      const res = await bookDiagnostics({
        patientName: name,
        phone,
        address: form.address,
        scheduledDate: date,
        slot,
        tests: chosen.map((x) => ({ id: x.id, bn: x.bn, en: x.en, price: x.price })),
        collectionFee: COLLECTION_FEE,
        paymentMethod: pay,
        note: form.note || undefined,
      });
      setDone({ no: res.bookingNo, total: res.total });
      setPicked([]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "FAILED";
      setErr(
        msg === "AUTH_REQUIRED"
          ? t("লগইন প্রয়োজন", "Please log in")
          : t("বুকিং ব্যর্থ হয়েছে", "Booking failed"),
      );
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <div className="pt-16 text-center">
        <p className="text-4xl">🏠</p>
        <h1 className="mt-3 font-display text-lg font-extrabold">
          {t("বাসায় গিয়ে ডায়াগনস্টিক", "Home diagnostics")}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("বুকিং দিতে লগইন করুন।", "Please log in to book a home sample collection.")}
        </p>
        <Link
          href="/auth"
          className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
        >
          {t("লগইন করুন", "Log in")}
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-4 pb-10">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-secondary to-card p-4">
        <p className="flex items-center gap-2 font-display text-lg font-extrabold text-navy">
          <HomeIcon className="h-5 w-5 text-primary" /> {t("বাসায় গিয়ে ডায়াগনস্টিক", "Home diagnostics")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t(
            "প্রশিক্ষিত কালেক্টর আপনার বাসায় গিয়ে স্যাম্পল সংগ্রহ করবেন · ২৪ ঘণ্টায় ডিজিটাল রিপোর্ট",
            "A trained phlebotomist collects the sample at your home · digital report within 24 hours",
          )}
        </p>
        <p className="mt-2 text-[11px] font-semibold text-primary-dark">
          {t("হোম কালেকশন ফি", "Home collection fee")}: {t.money(COLLECTION_FEE)}
        </p>
      </div>

      {done && (
        <div className="mt-4 rounded-2xl border border-primary bg-secondary p-4 text-center">
          <CheckCircle2 className="mx-auto h-7 w-7 text-primary" />
          <p className="mt-2 text-sm font-bold text-navy">{t("বুকিং নিশ্চিত হয়েছে", "Booking confirmed")}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            #{done.no} · {t.money(done.total)}
          </p>
        </div>
      )}

      <h2 className="mt-6 flex items-center gap-2 text-sm font-bold text-navy">
        <TestTube2 className="h-4 w-4 text-primary" /> {t("টেস্ট নির্বাচন করুন", "Select tests")}
      </h2>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("টেস্টের নাম লিখুন (বাংলা/English)...", "Search test name...")}
        className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
      />
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((x) => {
          const on = picked.includes(x.id);
          return (
            <button
              key={x.id}
              type="button"
              onClick={() => toggle(x.id)}
              className={`rounded-xl border p-3 text-left transition ${on ? "border-primary bg-secondary" : "border-border bg-card"}`}
            >
              <p className="text-xs font-bold text-navy">{t(x.bn, x.en)}</p>
              <p className="text-[10px] text-muted-foreground">{x.prep}</p>
              <p className="mt-1 text-sm font-extrabold text-primary">{t.money(x.price)}</p>
            </button>
          );
        })}
      </div>

      <h2 className="mt-6 flex items-center gap-2 text-sm font-bold text-navy">
        <CalendarDays className="h-4 w-4 text-primary" /> {t("তারিখ ও সময়", "Date & time")}
      </h2>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {days.map((d) => (
          <button
            key={d.iso}
            type="button"
            onClick={() => setDate(d.iso)}
            className={`shrink-0 rounded-xl border px-3 py-2 text-center ${
              date === d.iso ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
            }`}
          >
            <span className="block text-sm font-extrabold">{t.n(d.day)}</span>
            <span className="block text-[10px]">{d.month}</span>
          </button>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SLOTS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSlot(s.id)}
            className={`rounded-xl border px-3 py-2 text-[11px] font-semibold ${
              slot === s.id ? "border-primary bg-secondary text-primary-dark" : "border-border bg-card"
            }`}
          >
            {t(s.bn, s.en)}
          </button>
        ))}
      </div>

      <h2 className="mt-6 text-sm font-bold text-navy">{t("রোগী ও ঠিকানা", "Patient & address")}</h2>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder={t("নাম", "Name")}
          className="rounded-lg border border-border bg-card px-3 py-2 text-xs"
        />
        <input
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder={t("ফোন", "Phone")}
          className="rounded-lg border border-border bg-card px-3 py-2 text-xs"
        />
        <textarea
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          placeholder={t("ঠিকানা", "Address")}
          className="rounded-lg border border-border bg-card px-3 py-2 text-xs sm:col-span-2"
          rows={2}
        />
        <textarea
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
          placeholder={t("নোট (ঐচ্ছিক)", "Note (optional)")}
          className="rounded-lg border border-border bg-card px-3 py-2 text-xs sm:col-span-2"
          rows={2}
        />
      </div>

      <div className="mt-3 flex gap-3 text-xs">
        {(["cod", "bkash"] as const).map((m) => (
          <label key={m} className="flex items-center gap-1.5">
            <input type="radio" checked={pay === m} onChange={() => setPay(m)} />
            {m === "cod" ? t("ক্যাশ", "Cash") : "bKash"}
          </label>
        ))}
      </div>

      {chosen.length > 0 && (
        <p className="mt-3 text-xs font-semibold text-navy">
          {t.n(chosen.length)} {t("টি টেস্ট", "tests")} · {t.money(subtotal)} + {t.money(COLLECTION_FEE)} ={" "}
          <span className="text-primary">{t.money(total)}</span>
        </p>
      )}

      {err && <p className="mt-2 text-xs font-semibold text-destructive">{err}</p>}

      <button
        type="button"
        disabled={busy}
        onClick={() => void submit()}
        className="mt-4 w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
      >
        {busy ? t("বুক হচ্ছে...", "Booking...") : t("হোম কালেকশন বুক করুন", "Book home collection")}
      </button>

      <Link href="/lab-test" className="mt-4 inline-block text-xs font-semibold text-primary">
        ← {t("ল্যাব টেস্ট তালিকা", "Lab test list")}
      </Link>
    </div>
  );
}

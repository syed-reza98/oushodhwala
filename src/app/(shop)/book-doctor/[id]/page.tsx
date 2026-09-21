"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarDays, Clock, Phone, MessageCircle, Video } from "lucide-react";
import { useCatalog } from "@/lib/catalog-db";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/lib/i18n";
import {
  MODE_LABEL,
  PAYMENT_LABEL,
  REFUND_POLICY_BN,
  REFUND_POLICY_EN,
  WEEKDAYS,
  WEEKDAYS_EN,
  dayKey,
  isWorkingDay,
  nextDays,
  slotDate,
  slotTimes,
  type CallMode,
} from "@/lib/appointments";
import { bookAppointment } from "@/server/actions/appointments";

const MODES: { id: CallMode; icon: typeof Phone }[] = [
  { id: "phone", icon: Phone },
  { id: "whatsapp", icon: MessageCircle },
  { id: "video", icon: Video },
];

const ALL_PAYMENTS: { id: "cod" | "bkash" | "nagad" | "card"; e: string }[] = [
  { id: "cod", e: "💵" },
  { id: "bkash", e: "📱" },
  { id: "nagad", e: "📲" },
  { id: "card", e: "💳" },
];

export default function BookDoctorPage() {
  const t = useT();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { doctors, settings } = useCatalog();
  const { user, profile } = useAuth();

  const doctor = doctors.find((d) => d.id === id);
  const days = useMemo(() => nextDays(14), []);
  const [day, setDay] = useState(days[0]!);
  const [time, setTime] = useState("");
  const [mode, setMode] = useState<CallMode>("video");
  const [payment, setPayment] = useState("bkash");
  const [payRef, setPayRef] = useState("");
  const [note, setNote] = useState("");
  const [name, setName] = useState(profile?.name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [busy, setBusy] = useState(false);

  const availQ = useQuery({
    queryKey: ["doctor-availability", id, dayKey(day)],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(
        `/api/doctors/${encodeURIComponent(id)}/availability?day=${dayKey(day)}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error("availability failed");
      return res.json() as Promise<{
        blackouts: { day: string; reason: string }[];
        taken: string[];
      }>;
    },
  });

  const blackoutDays = useMemo(
    () => new Set((availQ.data?.blackouts ?? []).map((b) => b.day)),
    [availQ.data?.blackouts],
  );
  const blackoutReason =
    (availQ.data?.blackouts ?? []).find((b) => b.day === dayKey(day))?.reason ?? "";
  const taken = new Set(availQ.data?.taken ?? []);

  const payments = ALL_PAYMENTS.filter((m) => settings[m.id]);
  const weekdays = t.en ? WEEKDAYS_EN : WEEKDAYS;
  const locale = t.en ? "en-US" : "bn-BD";
  const now = Date.now();
  const closed = doctor
    ? !isWorkingDay(day, doctor) || blackoutDays.has(dayKey(day))
    : true;

  if (!doctor) {
    return (
      <div className="pt-16 text-center text-sm text-muted-foreground">
        {t("ডাক্তার পাওয়া যায়নি।", "Doctor not found.")}{" "}
        <Link href="/doctor-consultation" className="font-semibold text-primary underline">
          {t("তালিকায় ফিরে যান", "Go back to the list")}
        </Link>
      </div>
    );
  }

  const submit = async () => {
    if (!user) {
      toast.error(t("বুকিং করতে লগইন করুন", "Please log in to book"));
      router.push("/auth");
      return;
    }
    if (!time) {
      toast.error(t("সময় নির্বাচন করুন", "Select a time"));
      return;
    }
    if (!name.trim() || !phone.trim()) {
      toast.error(t("নাম ও মোবাইল নম্বর দিন", "Enter name and mobile number"));
      return;
    }
    if (payment !== "cod" && !payRef.trim()) {
      toast.error(t("পেমেন্ট ট্রানজেকশন আইডি দিন", "Enter payment transaction ID"));
      return;
    }
    setBusy(true);
    try {
      const when = slotDate(day, time);
      const created = await bookAppointment({
        doctorId: doctor.id,
        doctorName: doctor.name,
        doctorSpec: doctor.spec ?? "",
        mode,
        scheduledAt: when.toISOString(),
        patientName: name.trim(),
        phone: phone.trim(),
        note: note.trim() || undefined,
        fee: Number(doctor.fee ?? 0),
        paymentMethod: payment,
        paymentRef: payRef.trim() || undefined,
      });
      toast.success(
        t(
          `অ্যাপয়েন্টমেন্ট নিশ্চিত — ইনভয়েস #${created.invoiceNo}`,
          `Appointment confirmed — Invoice #${created.invoiceNo}`,
        ),
      );
      router.push(`/consultation/${created.id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "AUTH_REQUIRED") {
        toast.error(t("বুকিং করতে লগইন করুন", "Please log in to book"));
        router.push("/auth");
      } else if (msg === "BLACKOUT") {
        toast.error(t("এই দিনে ডাক্তার উপলব্ধ নন", "Doctor unavailable this day"));
      } else if (msg === "SLOT_TAKEN") {
        toast.error(t("এই স্লট ইতিমধ্যে বুকড", "This slot is already taken"));
      } else if (msg === "PAST_SLOT") {
        toast.error(t("অতীতের সময় বেছে নেওয়া যায় না", "Cannot book a past time"));
      } else {
        toast.error(t("বুকিং ব্যর্থ", "Booking failed"));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pt-4 pb-10">
      <Link
        href="/doctor-consultation"
        className="text-[11px] font-semibold text-muted-foreground hover:text-primary"
      >
        ← {t("ডাক্তার তালিকা", "Doctor list")}
      </Link>

      <section className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
        {doctor.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={doctor.photo} alt={doctor.name} className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <span className="grid h-14 w-14 place-items-center rounded-full bg-secondary text-2xl">
            {doctor.emoji}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="font-display text-base font-extrabold text-navy">{doctor.name}</h1>
          <p className="text-[11px] text-muted-foreground">
            {doctor.spec} · {doctor.degree}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {t("অভিজ্ঞতা", "Experience")}: {doctor.exp}
          </p>
        </div>
        <span className="ml-auto font-display text-lg font-extrabold text-primary">
          {t.money(doctor.fee)}
        </span>
      </section>

      <section className="mt-3 rounded-xl border border-border bg-card p-4">
        <p className="flex items-center gap-1 text-sm font-bold">
          <CalendarDays className="h-4 w-4 text-primary" />{" "}
          {t("তারিখ নির্বাচন করুন", "Select a date")}
        </p>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {days.map((d) => {
            const on = dayKey(d) === dayKey(day);
            const off = !isWorkingDay(d, doctor) || blackoutDays.has(dayKey(d));
            return (
              <button
                key={dayKey(d)}
                type="button"
                disabled={off}
                onClick={() => {
                  setDay(d);
                  setTime("");
                }}
                className={`shrink-0 rounded-xl border px-3 py-2 text-center ${
                  on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
                } ${off ? "cursor-not-allowed opacity-35 line-through" : ""}`}
              >
                <span className="block text-[10px] opacity-80">
                  {d.toLocaleDateString(locale, { weekday: "short" })}
                </span>
                <span className="block text-sm font-bold">
                  {d.toLocaleDateString(locale, { day: "numeric" })}
                </span>
                <span className="block text-[9px] opacity-80">
                  {d.toLocaleDateString(locale, { month: "short" })}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          {t("কর্মদিবস", "Working days")}:{" "}
          {(Array.isArray(doctor.workDays) ? doctor.workDays : [0, 1, 2, 3, 4, 5, 6])
            .map((n) => weekdays[n])
            .join(", ")}{" "}
          · {t("সময়", "Time")}: {doctor.workStart}–{doctor.workEnd}
        </p>
      </section>

      <section className="mt-3 rounded-xl border border-border bg-card p-4">
        <p className="flex items-center gap-1 text-sm font-bold">
          <Clock className="h-4 w-4 text-primary" /> {t("সময় নির্বাচন করুন", "Select a time")}
        </p>
        {closed ? (
          <p className="mt-2 rounded-xl border border-border bg-secondary p-3 text-[11px] font-semibold">
            {t("এই দিনে ডাক্তার উপলব্ধ নন", "The doctor is not available on this day")}
            {blackoutReason ? ` — ${blackoutReason}` : ""}।{" "}
            {t("অন্য তারিখ নির্বাচন করুন।", "Please select another date.")}
          </p>
        ) : (
          <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6">
            {slotTimes(doctor).map((s) => {
              const ts = slotDate(day, s).getTime();
              const disabled = ts < now || taken.has(s);
              const on = time === s;
              return (
                <button
                  key={s}
                  type="button"
                  disabled={disabled}
                  onClick={() => setTime(s)}
                  className={`rounded-lg border py-2 text-[11px] font-semibold ${
                    on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
                  } ${disabled ? "cursor-not-allowed opacity-35 line-through" : ""}`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-3 rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-bold">{t("কল মোড", "Call mode")}</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={`flex flex-col items-center gap-1 rounded-xl border py-2 text-[10px] font-semibold ${
                mode === m.id ? "border-primary bg-primary/10 text-primary" : "border-border"
              }`}
            >
              <m.icon className="h-4 w-4" />
              {t(MODE_LABEL[m.id].bn, MODE_LABEL[m.id].en)}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-3 grid gap-2 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("রোগীর নাম", "Patient name")}
          className="rounded-lg border border-border bg-background px-3 py-2 text-xs"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t("মোবাইল", "Mobile")}
          className="rounded-lg border border-border bg-background px-3 py-2 text-xs"
        />
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("নোট (ঐচ্ছিক)", "Note (optional)")}
          className="rounded-lg border border-border bg-background px-3 py-2 text-xs sm:col-span-2"
          rows={2}
        />
      </section>

      <section className="mt-3 rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-bold">{t("পেমেন্ট", "Payment")}</p>
        <div className="mt-2 space-y-2">
          {payments.map((m) => (
            <label key={m.id} className="flex items-center gap-2 text-xs">
              <input type="radio" checked={payment === m.id} onChange={() => setPayment(m.id)} />
              {m.e} {t(PAYMENT_LABEL[m.id]?.bn ?? m.id, PAYMENT_LABEL[m.id]?.en ?? m.id)}
            </label>
          ))}
        </div>
        {payment !== "cod" && (
          <input
            value={payRef}
            onChange={(e) => setPayRef(e.target.value)}
            placeholder={t("ট্রানজেকশন আইডি", "Transaction ID")}
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
          />
        )}
        <p className="mt-3 text-[10px] text-muted-foreground">{t(REFUND_POLICY_BN, REFUND_POLICY_EN)}</p>
      </section>

      <button
        type="button"
        disabled={busy || !time || closed}
        onClick={() => void submit()}
        className="mt-4 w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
      >
        {busy
          ? t("বুক হচ্ছে...", "Booking...")
          : t(
              `${MODE_LABEL[mode].bn} · ${t.money(doctor.fee)} · বুক করুন`,
              `${MODE_LABEL[mode].en} · ${t.money(doctor.fee)} · Book`,
            )}
      </button>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Printer, AlertCircle, ArrowLeft, Pill, Clock } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";

type RxItem = { name: string; dose?: string; duration?: string; instruction?: string };

type ConsultationPrescriptionData = {
  appointment: {
    id: string;
    invoiceNo: string;
    scheduledAt: string;
    phone: string;
    patientName?: string;
    doctorName?: string;
    doctorSpec?: string;
  };
  rx: {
    id: string;
    doctorName?: string;
    patientName?: string;
    diagnosis?: string;
    advice?: string;
    followUp?: string;
    items?: RxItem[];
    createdAt: string;
  } | null;
};

export default function RxPrintPage() {
  const t = useT();
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [data, setData] = useState<ConsultationPrescriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/consultations/${params.id}`);
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error || "Failed to load prescription");
        }
        const json = await res.json();
        if (!cancelled) {
          setData({
            appointment: {
              id: json.appointment.id,
              invoiceNo: json.appointment.invoiceNo,
              scheduledAt: json.appointment.scheduledAt,
              phone: json.appointment.phone || "",
              patientName: json.appointment.patientName,
              doctorName: json.doctor?.name,
              doctorSpec: json.doctor?.specialty,
            },
            rx: json.prescription
              ? {
                  id: json.prescription.id,
                  doctorName: json.prescription.doctorName,
                  patientName: json.prescription.patientName,
                  diagnosis: json.prescription.diagnosis,
                  advice: json.prescription.advice,
                  followUp: json.prescription.followUp,
                  items: json.prescription.items,
                  createdAt: json.prescription.createdAt,
                }
              : null,
          });
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error loading");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (!user) {
    return (
      <div className="pt-16 text-center text-sm">
        <p className="text-muted-foreground">{t("প্রেসক্রিপশন দেখতে লগইন করুন।", "Log in to view prescription.")}</p>
        <Link
          href="/auth"
          className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
        >
          {t("লগইন", "Log in")}
        </Link>
      </div>
    );
  }

  if (loading) {
    return <p className="pt-16 text-center text-sm text-muted-foreground">{t("লোড হচ্ছে...", "Loading...")}</p>;
  }

  if (error || !data) {
    return (
      <div className="pt-16 text-center text-sm">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-500 mb-2" />
        <p className="text-muted-foreground">
          {error === "NOT_FOUND" ? t("প্রেসক্রিপশন বা অ্যাপয়েন্টমেন্ট পাওয়া যায়নি।", "Prescription not found.") : error}
        </p>
        <Link href="/appointments" className="mt-3 inline-block text-xs font-semibold text-primary underline">
          {t("অ্যাপয়েন্টমেন্টে ফিরুন", "Back to appointments")}
        </Link>
      </div>
    );
  }

  if (!data.rx) {
    return (
      <div className="pt-16 text-center text-sm text-muted-foreground">
        <p>{t("এই কনসালটেশনের প্রেসক্রিপশন এখনো ডাক্তার প্রস্তুত করেননি।", "Doctor has not prepared the prescription for this consultation yet.")}</p>
        <Link href={`/consultation/${params.id}`} className="mt-3 inline-block font-semibold text-primary underline">
          {t("কনসালটেশন রুমে যান", "Go to consultation room")}
        </Link>
      </div>
    );
  }

  const { rx, appointment: appt } = data;
  const items = rx.items ?? [];

  return (
    <div className="pt-4 pb-12 max-w-3xl mx-auto px-2">
      <div className="flex items-center justify-between print:hidden mb-4">
        <Link
          href={`/consultation/${params.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("কনসালটেশন রুম", "Consultation room")}
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:opacity-95"
        >
          <Printer className="h-3.5 w-3.5" />
          {t("প্রিন্ট / PDF সংরক্ষণ", "Print / Save PDF")}
        </button>
      </div>

      <article className="rounded-2xl border border-border bg-card p-6 sm:p-8 print:border-0 print:p-0 shadow-xs">
        <header className="flex flex-wrap items-start justify-between border-b-2 border-primary pb-4 gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-primary">ঔষধওয়ালা · Oushodhwala</h1>
            <p className="text-xs text-muted-foreground">{t("ডিজিটাল ডক্টর কনসালটেশন প্রেসক্রিপশন", "Digital Doctor Consultation Prescription")}</p>
            <p className="text-xs text-muted-foreground">হটলাইন: 09612-000000</p>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold text-base text-foreground">{rx.doctorName || appt.doctorName || "ডাক্তার"}</p>
            <p className="text-muted-foreground">{appt.doctorSpec || "বিশেষজ্ঞ"}</p>
            <p className="font-mono text-[11px] text-muted-foreground mt-0.5">#{appt.invoiceNo}</p>
          </div>
        </header>

        <section className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl bg-secondary/50 p-3 text-xs">
          <div>
            <span className="text-muted-foreground block text-[11px]">{t("রোগীর নাম", "Patient")}</span>
            <span className="font-bold text-foreground">{rx.patientName || appt.patientName || "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">{t("মোবাইল", "Phone")}</span>
            <span className="font-semibold text-foreground">{appt.phone || "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">{t("সেশনের সময়", "Scheduled")}</span>
            <span className="text-foreground">{new Date(appt.scheduledAt).toLocaleDateString()}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">{t("ইস্যু তারিখ", "Issued Date")}</span>
            <span className="text-foreground">{new Date(rx.createdAt).toLocaleDateString()}</span>
          </div>
        </section>

        {rx.diagnosis && (
          <section className="mt-5 border-l-2 border-primary/50 pl-3">
            <h2 className="text-xs font-bold text-foreground">{t("রোগ নির্ণয় / Diagnosis", "Diagnosis")}</h2>
            <p className="mt-1 text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">{rx.diagnosis}</p>
          </section>
        )}

        <section className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-serif text-3xl font-extrabold text-primary">℞</span>
            <h2 className="text-sm font-bold text-foreground">{t("ঔষধের তালিকা ও নির্দেশনা", "Prescribed Medications")}</h2>
          </div>

          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">{t("কোনো ঔষধ যোগ করা হয়নি।", "No medicines prescribed.")}</p>
          ) : (
            <ol className="divide-y divide-border/60">
              {items.map((it, i) => (
                <li key={i} className="py-2.5 text-xs">
                  <div className="flex items-center justify-between font-bold text-foreground">
                    <span>
                      {i + 1}. {it.name}
                    </span>
                    {it.dose && <span className="font-mono text-primary">{it.dose}</span>}
                  </div>
                  <div className="ml-4 mt-0.5 flex flex-wrap gap-x-4 text-[11px] text-muted-foreground">
                    {it.duration && <span>{t("সময়কাল:", "Duration:")} {it.duration}</span>}
                    {it.instruction && <span>{t("নির্দেশনা:", "Instruction:")} {it.instruction}</span>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        {rx.advice && (
          <section className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <h2 className="text-xs font-bold text-primary">{t("ডাক্তারের পরামর্শ / Clinical Advice", "Doctor's Advice")}</h2>
            <p className="mt-1 text-xs text-foreground leading-relaxed whitespace-pre-wrap">{rx.advice}</p>
          </section>
        )}

        {rx.followUp && (
          <p className="mt-4 text-xs font-bold text-foreground">
            {t("পরবর্তী ফলো-আপ:", "Next Follow-up:")}{" "}
            <span className="text-primary">{new Date(rx.followUp).toLocaleDateString()}</span>
          </p>
        )}

        <footer className="mt-12 flex flex-wrap items-end justify-between gap-4 border-t border-border pt-4 text-[10px] text-muted-foreground">
          <p className="max-w-md">
            {t(
              "এই প্রেসক্রিপশনটি অনলাইন টেলিমেডিসিন কনসালটেশনের ভিত্তিতে তৈরি। জরুরি পরিস্থিতিতে নিকটস্থ হাসপাতালের জরুরি বিভাগে যোগাযোগ করুন।",
              "Generated via verified online telemedicine consultation. In an emergency, please visit your nearest hospital emergency department.",
            )}
          </p>
          <div className="text-center min-w-[160px]">
            <div className="mb-1 border-t border-foreground/60 w-full" />
            <span className="font-semibold">{t("ডাক্তারের ডিজিটাল স্বাক্ষর", "Doctor's Digital Signature")}</span>
          </div>
        </footer>
      </article>
    </div>
  );
}

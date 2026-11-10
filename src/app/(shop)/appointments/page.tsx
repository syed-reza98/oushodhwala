"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/lib/i18n";
import { MODE_LABEL, fmtDateTime, type CallMode } from "@/lib/appointments";
import { listMyAppointments } from "@/server/actions/appointments";

const STATUS_T: Record<string, { bn: string; en: string }> = {
  confirmed: { bn: "নিশ্চিত", en: "Confirmed" },
  completed: { bn: "সম্পন্ন", en: "Completed" },
  cancelled: { bn: "বাতিল", en: "Cancelled" },
};

type Appt = Awaited<ReturnType<typeof listMyAppointments>>[number];

export default function AppointmentsPage() {
  const t = useT();
  const { user, loading } = useAuth();
  const [list, setList] = useState<Appt[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setBusy(true);
    void listMyAppointments()
      .then(setList)
      .finally(() => setBusy(false));
  }, [user]);

  if (loading) {
    return <p className="pt-16 text-center text-sm text-muted-foreground">{t("লোড হচ্ছে...", "Loading...")}</p>;
  }

  if (!user) {
    return (
      <div className="pt-16 text-center text-sm">
        <p className="text-muted-foreground">{t("অ্যাপয়েন্টমেন্ট দেখতে লগইন করুন।", "Log in to view appointments.")}</p>
        <Link
          href="/auth"
          className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
        >
          {t("লগইন", "Log in")}
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-4">
      <h1 className="font-display text-lg font-extrabold">{t("আমার অ্যাপয়েন্টমেন্ট", "My Appointments")}</h1>
      <p className="text-xs text-muted-foreground">
        {t(
          "কল, চ্যাট, রেকর্ডিং ও ইনভয়েস দেখতে যেকোনো অ্যাপয়েন্টমেন্টে ক্লিক করুন।",
          "Click any appointment to view call, chat, recording and invoice.",
        )}
      </p>

      {busy && <p className="mt-6 text-center text-xs text-muted-foreground">{t("লোড হচ্ছে...", "Loading...")}</p>}

      {!busy && list.length === 0 && (
        <div className="mt-10 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-xs text-muted-foreground">{t("এখনো কোনো অ্যাপয়েন্টমেন্ট নেই।", "No appointments yet.")}</p>
          <Link
            href="/doctor-consultation"
            className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
          >
            {t("ডাক্তার দেখুন", "See doctors")}
          </Link>
        </div>
      )}

      <ul className="mt-4 space-y-2">
        {list.map((a) => {
          const mode = (a.mode as CallMode) || "video";
          return (
            <li key={a.id}>
              <Link
                href={`/consultation/${a.id}`}
                className="block rounded-2xl border border-border bg-card p-4 transition hover:border-primary"
              >
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-navy">{a.doctorName}</p>
                  <span
                    className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      a.status === "cancelled" ? "bg-destructive/10 text-destructive" : "bg-secondary text-primary-dark"
                    }`}
                  >
                    {t(STATUS_T[a.status]?.bn ?? a.status, STATUS_T[a.status]?.en ?? a.status)}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">{a.doctorSpec}</p>
                <p className="mt-1 text-[11px] font-semibold">
                  🗓️ {fmtDateTime(a.scheduledAt)} · {t(MODE_LABEL[mode].bn, MODE_LABEL[mode].en)}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">#{a.invoiceNo}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

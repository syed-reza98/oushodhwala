"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  MessageCircle,
  Phone,
  Send,
  Star,
  Video,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCatalog } from "@/lib/catalog-db";
import { useT } from "@/lib/i18n";
import {
  MODE_LABEL,
  PAYMENT_LABEL,
  REFUND_LABEL,
  REFUND_POLICY_BN,
  REFUND_POLICY_EN,
  STATUS_LABEL,
  fmtDateTime,
  refundPreview,
  telNumber,
  waNumber,
  type CallMode,
} from "@/lib/appointments";

type Room = {
  appointment: {
    id: string;
    invoiceNo: string;
    doctorId: string;
    doctorName: string;
    doctorSpec: string;
    mode: string;
    scheduledAt: string;
    patientName: string;
    phone: string;
    note: string | null;
    fee: number;
    paymentMethod: string;
    paymentStatus: string;
    paymentRef: string;
    status: string;
    joinUrl: string;
    cancelReason: string;
    refundStatus: string;
    refundAmount: number;
  };
  doctor: {
    id: string;
    name: string;
    emoji: string;
    phone: string;
    whatsapp: string;
    videoUrl: string;
  } | null;
  messages: {
    id: string;
    sender: string;
    body: string;
    fileUrl: string;
    fileName: string;
    createdAt: string;
  }[];
  media: { id: string; kind: string; url: string; name: string; createdAt: string }[];
  rx: {
    id: string;
    diagnosis: string;
    advice: string;
    items: { name: string; dose: string; duration: string }[];
    followUp: string;
    doctorName: string;
    patientName: string;
  } | null;
  review: { id: string; rating: number; comment: string } | null;
};

export default function ConsultationClient() {
  const t = useT();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user, loading, isStaff } = useAuth();
  const { settings } = useCatalog();
  const qc = useQueryClient();
  const [msg, setMsg] = useState("");
  const [reason, setReason] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaName, setMediaName] = useState("");

  const roomQ = useQuery({
    queryKey: ["consultation-room", id],
    enabled: !!user && !!id,
    refetchInterval: 8000,
    queryFn: async () => {
      const res = await fetch(`/api/consultations/${id}`, { cache: "no-store" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("load failed");
      return res.json() as Promise<Room>;
    },
  });

  const act = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch(`/api/consultations/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "failed");
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["consultation-room", id] });
      void qc.invalidateQueries({ queryKey: ["my-appointments"] });
    },
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
          {t("কনসালটেশন দেখতে লগইন করুন।", "Log in to view the consultation.")}
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

  if (roomQ.isLoading) {
    return (
      <p className="pt-16 text-center text-sm text-muted-foreground">
        {t("লোড হচ্ছে...", "Loading...")}
      </p>
    );
  }

  const room = roomQ.data;
  if (!room) {
    return (
      <div className="pt-16 text-center text-sm text-muted-foreground">
        {t("অ্যাপয়েন্টমেন্ট পাওয়া যায়নি।", "Appointment not found.")}{" "}
        <Link href="/appointments" className="font-semibold text-primary underline">
          {t("আমার অ্যাপয়েন্টমেন্ট", "My appointments")}
        </Link>
      </div>
    );
  }

  const appt = room.appointment;
  const doctor = room.doctor;
  const mode = (appt.mode as CallMode) ?? "video";
  const phone = telNumber(doctor?.phone || settings.supportPhone || "");
  const wa = waNumber(doctor?.whatsapp || doctor?.phone || settings.supportPhone || "");
  const waText = encodeURIComponent(
    t.en
      ? `Hello, I am ${appt.patientName} from Oushodhwala. I have an appointment with ${appt.doctorName} at ${fmtDateTime(appt.scheduledAt)} (invoice #${appt.invoiceNo}).`
      : `আসসালামু আলাইকুম, আমি ঔষধওয়ালা থেকে ${appt.patientName}। ${appt.doctorName} এর সাথে ${fmtDateTime(appt.scheduledAt)} সময়ে অ্যাপয়েন্টমেন্ট (ইনভয়েস #${appt.invoiceNo})।`,
  );
  const video = appt.joinUrl || doctor?.videoUrl || "";
  const started = new Date(appt.scheduledAt).getTime() - 10 * 60000 <= Date.now();
  const preview = refundPreview(
    appt.fee,
    appt.scheduledAt,
    appt.paymentStatus === "paid",
    t.en,
  );

  return (
    <div className="pt-4 pb-10">
      <Link
        href="/appointments"
        className="text-[11px] font-semibold text-muted-foreground hover:text-primary"
      >
        ← {t("আমার অ্যাপয়েন্টমেন্ট", "My appointments")}
      </Link>

      <section className="mt-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-secondary text-xl">
            {doctor?.emoji ?? "🩺"}
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-base font-extrabold text-navy">{appt.doctorName}</h1>
            <p className="text-[11px] text-muted-foreground">{appt.doctorSpec}</p>
          </div>
          <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-primary-dark">
            {t(
              STATUS_LABEL[appt.status]?.bn ?? appt.status,
              STATUS_LABEL[appt.status]?.en ?? appt.status,
            )}
          </span>
        </div>
        <p className="mt-2 text-xs font-semibold">
          🗓️ {fmtDateTime(appt.scheduledAt)} · {MODE_LABEL[mode]?.emoji}{" "}
          {t(MODE_LABEL[mode]?.bn ?? mode, MODE_LABEL[mode]?.en ?? mode)}
        </p>
        {appt.note && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t("সমস্যা", "Issue")}: {appt.note}
          </p>
        )}

        <div className="mt-3 grid grid-cols-3 gap-2">
          <CallBtn href={phone ? `tel:${phone}` : ""} icon={Phone} label={t("ফোন", "Phone")} active={started} />
          <CallBtn
            href={wa ? `https://wa.me/${wa}?text=${waText}` : ""}
            icon={MessageCircle}
            label={t("হোয়াটসঅ্যাপ", "WhatsApp")}
            active={started}
            external
          />
          <CallBtn
            href={video}
            icon={Video}
            label={t("ভিডিও কল", "Video call")}
            active={started}
            external
          />
        </div>
        {!started && (
          <p className="mt-2 text-[10px] text-muted-foreground">
            {t(
              "নির্ধারিত সময়ের ১০ মিনিট আগে কল বাটনগুলো সক্রিয় হবে।",
              "Call buttons activate 10 minutes before the scheduled time.",
            )}
          </p>
        )}
      </section>

      {appt.status === "cancelled" ? (
        <section className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-xs">
          <h2 className="text-sm font-bold text-destructive">
            {t("অ্যাপয়েন্টমেন্ট বাতিল", "Appointment cancelled")}
          </h2>
          {appt.cancelReason && (
            <p className="mt-1 text-muted-foreground">
              {t("কারণ", "Reason")}: {appt.cancelReason}
            </p>
          )}
          <p className="mt-1 font-semibold">
            {t("রিফান্ড", "Refund")}:{" "}
            {t(
              REFUND_LABEL[appt.refundStatus]?.bn ?? appt.refundStatus,
              REFUND_LABEL[appt.refundStatus]?.en ?? appt.refundStatus,
            )}
            {appt.refundAmount > 0 ? ` · ${t.money(appt.refundAmount)}` : ""}
          </p>
        </section>
      ) : appt.status !== "completed" ? (
        <section className="mt-4 rounded-2xl border border-border bg-card p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <XCircle className="h-4 w-4 text-destructive" />{" "}
            {t("অ্যাপয়েন্টমেন্ট বাতিল করুন", "Cancel appointment")}
          </h2>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {t(REFUND_POLICY_BN, REFUND_POLICY_EN)}
          </p>
          <p className="mt-2 rounded-lg bg-secondary p-2.5 text-[11px] font-semibold">
            {t("এখন বাতিল করলে", "If you cancel now")}: {preview.text}{" "}
            {preview.amount > 0 ? `(${t.money(preview.amount)})` : ""}
          </p>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={200}
            placeholder={t("বাতিলের কারণ (ঐচ্ছিক)", "Reason for cancellation (optional)")}
            className="mt-2 w-full rounded-lg border border-border bg-background p-2.5 text-xs outline-none"
          />
          <button
            type="button"
            disabled={act.isPending}
            onClick={() =>
              act.mutate(
                { action: "cancel", reason },
                {
                  onSuccess: () => toast.success(t("অ্যাপয়েন্টমেন্ট বাতিল হয়েছে", "Appointment cancelled")),
                  onError: (e) => toast.error(e.message),
                },
              )
            }
            className="mt-2 w-full rounded-lg border border-destructive py-2 text-xs font-bold text-destructive disabled:opacity-50"
          >
            {act.isPending
              ? t("বাতিল হচ্ছে...", "Cancelling...")
              : t("বাতিল নিশ্চিত করুন", "Confirm cancellation")}
          </button>
        </section>
      ) : null}

      <section className="mt-4 rounded-2xl border border-border bg-card p-4 text-xs">
        <h2 className="text-sm font-bold">{t("ইনভয়েস", "Invoice")}</h2>
        <p className="mt-2 font-mono text-[11px]">#{appt.invoiceNo}</p>
        <p className="mt-1">
          {t("ফি", "Fee")}: {t.money(appt.fee)} ·{" "}
          {t(
            PAYMENT_LABEL[appt.paymentMethod]?.bn ?? appt.paymentMethod,
            PAYMENT_LABEL[appt.paymentMethod]?.en ?? appt.paymentMethod,
          )}
        </p>
        <p className="mt-1 text-muted-foreground">
          {t("পেমেন্ট", "Payment")}: {appt.paymentStatus}
          {appt.paymentRef ? ` · ${appt.paymentRef}` : ""}
        </p>
      </section>

      {room.rx && (
        <section className="mt-4 rounded-2xl border border-border bg-card p-4 text-xs">
          <h2 className="text-sm font-bold">{t("প্রেসক্রিপশন", "Prescription")}</h2>
          {room.rx.diagnosis && (
            <p className="mt-2">
              <span className="font-semibold">{t("ডায়াগনোসিস", "Diagnosis")}:</span>{" "}
              {room.rx.diagnosis}
            </p>
          )}
          {room.rx.advice && (
            <p className="mt-1">
              <span className="font-semibold">{t("পরামর্শ", "Advice")}:</span> {room.rx.advice}
            </p>
          )}
          <ul className="mt-2 space-y-1">
            {room.rx.items.map((it, i) => (
              <li key={i} className="rounded-lg bg-secondary px-2 py-1.5">
                <span className="font-semibold">{it.name}</span>
                {(it.dose || it.duration) && (
                  <span className="text-muted-foreground">
                    {" "}
                    — {[it.dose, it.duration].filter(Boolean).join(" · ")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">{t("চ্যাট", "Chat")}</h2>
        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
          {room.messages.length === 0 && (
            <p className="text-[11px] text-muted-foreground">
              {t("এখনো কোনো মেসেজ নেই।", "No messages yet.")}
            </p>
          )}
          {room.messages.map((m) => (
            <div
              key={m.id}
              className={`rounded-lg px-3 py-2 text-xs ${
                m.sender === "patient" ? "bg-primary/10 ml-6" : "bg-secondary mr-6"
              }`}
            >
              <p>{m.body}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {new Date(m.createdAt).toLocaleString(t.en ? "en-US" : "bn-BD")}
              </p>
            </div>
          ))}
        </div>
        {appt.status !== "cancelled" && (
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const text = msg.trim();
              if (!text) return;
              act.mutate(
                { action: "message", text },
                {
                  onSuccess: () => setMsg(""),
                  onError: (err) => toast.error(err.message),
                },
              );
            }}
          >
            <input
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder={t("মেসেজ লিখুন…", "Write a message…")}
              className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none"
            />
            <button
              type="submit"
              disabled={act.isPending || !msg.trim()}
              className="rounded-lg bg-primary px-3 py-2 text-primary-foreground disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4 text-xs">
        <h2 className="text-sm font-bold">{t("রিপোর্ট / মিডিয়া", "Reports / media")}</h2>
        <ul className="mt-2 space-y-1">
          {room.media.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2 rounded-lg bg-secondary px-2 py-1.5">
              <a href={m.url} target="_blank" rel="noreferrer" className="truncate text-primary underline">
                {m.name || m.url}
              </a>
              <button
                type="button"
                className="text-[10px] text-destructive"
                onClick={() =>
                  act.mutate(
                    { action: "media_delete", mediaId: m.id },
                    { onError: (e) => toast.error(e.message) },
                  )
                }
              >
                {t("মুছুন", "Delete")}
              </button>
            </li>
          ))}
          {room.media.length === 0 && (
            <p className="text-muted-foreground">{t("কোনো ফাইল নেই", "No files yet")}</p>
          )}
        </ul>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            value={mediaName}
            onChange={(e) => setMediaName(e.target.value)}
            placeholder={t("নাম", "Name")}
            className="w-28 rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none"
          />
          <input
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder={t("ফাইল URL", "File URL")}
            className="min-w-[10rem] flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none"
          />
          <button
            type="button"
            disabled={!mediaUrl.trim() || act.isPending}
            onClick={() =>
              act.mutate(
                { action: "media_add", url: mediaUrl.trim(), name: mediaName.trim(), kind: "report" },
                {
                  onSuccess: () => {
                    setMediaUrl("");
                    setMediaName("");
                    toast.success(t("যোগ হয়েছে", "Added"));
                  },
                  onError: (e) => toast.error(e.message),
                },
              )
            }
            className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            {t("যোগ", "Add")}
          </button>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4 text-xs">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Star className="h-4 w-4 text-sale" /> {t("রিভিউ", "Review")}
        </h2>
        {room.review ? (
          <p className="mt-2">
            {"★".repeat(room.review.rating)}
            {room.review.comment ? ` — ${room.review.comment}` : ""}
          </p>
        ) : (
          <>
            <div className="mt-2 flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className={`text-lg ${n <= rating ? "text-sale" : "text-muted-foreground"}`}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              placeholder={t("মন্তব্য (ঐচ্ছিক)", "Comment (optional)")}
              className="mt-2 w-full rounded-lg border border-border bg-background p-2.5 text-xs outline-none"
            />
            <button
              type="button"
              disabled={act.isPending}
              onClick={() =>
                act.mutate(
                  { action: "review", rating, comment },
                  {
                    onSuccess: () => toast.success(t("রিভিউ সংরক্ষিত", "Review saved")),
                    onError: (e) => toast.error(e.message),
                  },
                )
              }
              className="mt-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              {t("রিভিউ দিন", "Submit review")}
            </button>
          </>
        )}
        {isStaff && (
          <p className="mt-2 text-[10px] text-muted-foreground">
            {t("স্টাফ: প্রেসক্রিপশন অ্যাডমিন কনসালটস ট্যাব থেকে যোগ করুন।", "Staff: save Rx from admin Consults tab.")}
          </p>
        )}
      </section>
    </div>
  );
}

function CallBtn({
  href,
  icon: Icon,
  label,
  active,
  external,
}: {
  href: string;
  icon: typeof Phone;
  label: string;
  active: boolean;
  external?: boolean;
}) {
  const disabled = !href || !active;
  const cls = `flex flex-col items-center gap-1 rounded-xl border border-border py-3 text-[10px] font-bold ${
    disabled ? "opacity-40" : "bg-secondary hover:border-primary"
  }`;
  if (disabled) {
    return (
      <span className={cls}>
        <Icon className="h-4 w-4" />
        {label}
      </span>
    );
  }
  return (
    <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className={cls}>
      <Icon className="h-4 w-4" />
      {label}
    </a>
  );
}

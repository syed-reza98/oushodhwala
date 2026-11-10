"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  MessageCircle,
  Phone,
  Send,
  Star,
  Video,
  XCircle,
  Mic,
  Square,
  Paperclip,
  Volume2,
  Loader2,
  Printer,
  Plus,
  Trash2,
  FileText,
  Check,
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
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Digital Prescription composer state
  const [isEditingRx, setIsEditingRx] = useState(false);
  const [rxDiagnosis, setRxDiagnosis] = useState("");
  const [rxAdvice, setRxAdvice] = useState("");
  const [rxFollowUp, setRxFollowUp] = useState("");
  const [rxItems, setRxItems] = useState<{ name: string; dose: string; duration: string }[]>([
    { name: "", dose: "", duration: "" },
  ]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatFileInputRef = useRef<HTMLInputElement | null>(null);

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

  const initRxEditor = () => {
    if (room?.rx) {
      setRxDiagnosis(room.rx.diagnosis || "");
      setRxAdvice(room.rx.advice || "");
      setRxFollowUp(room.rx.followUp || "");
      setRxItems(
        room.rx.items && room.rx.items.length > 0
          ? room.rx.items
          : [{ name: "", dose: "", duration: "" }],
      );
    } else {
      setRxDiagnosis("");
      setRxAdvice("");
      setRxFollowUp("");
      setRxItems([{ name: "", dose: "", duration: "" }]);
    }
    setIsEditingRx(true);
  };

  const handleSaveRx = () => {
    const validItems = rxItems.filter((i) => i.name.trim());
    act.mutate(
      {
        action: "rx_save",
        diagnosis: rxDiagnosis.trim(),
        advice: rxAdvice.trim(),
        items: validItems,
        followUp: rxFollowUp.trim(),
      },
      {
        onSuccess: () => {
          toast.success(t("ডিজিটাল প্রেসক্রিপশন সফলভাবে সংরক্ষণ করা হয়েছে", "Prescription saved successfully"));
          setIsEditingRx(false);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const uploadAndAttach = async (file: File, kind: "report" | "audio" = "report") => {
    try {
      setUploadingFile(true);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("bucket", "consultations");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || "Upload failed");
      }
      const data = (await res.json()) as { url?: string; publicUrl?: string; path?: string };
      const url = data.url || data.publicUrl || data.path || "";
      await act.mutateAsync({
        action: "media_add",
        url,
        name: file.name,
        kind,
      });
      toast.success(
        kind === "audio"
          ? t("ভয়েস রেকর্ড পাঠানো হয়েছে", "Voice note recorded and uploaded")
          : t("ফাইল সফলভাবে আপলোড হয়েছে", "File uploaded successfully"),
      );
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err.message || t("আপলোড ব্যর্থ হয়েছে", "Upload failed"));
    } finally {
      setUploadingFile(false);
    }
  };

  const uploadAndSendChatMessage = async (file: File) => {
    try {
      setUploadingFile(true);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("bucket", "consultations");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || "Upload failed");
      }
      const data = (await res.json()) as { url?: string; publicUrl?: string; path?: string };
      const url = data.url || data.publicUrl || data.path || "";
      await act.mutateAsync({
        action: "message",
        text: file.name,
        fileUrl: url,
        fileName: file.name,
      });
      toast.success(t("ফাইল পাঠানো হয়েছে", "File sent"));
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err.message || t("আপলোড ব্যর্থ হয়েছে", "Upload failed"));
    } finally {
      setUploadingFile(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const file = new File([audioBlob], `voice_note_${Date.now()}.webm`, { type: "audio/webm" });
        await uploadAndAttach(file, "audio");
      };
      mr.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch {
      toast.error(t("মাইক্রোফোনের অনুমতি পাওয়া যায়নি", "Microphone access denied"));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

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

      {(room.rx || isStaff) && (
        <section className="mt-4 rounded-2xl border border-border bg-card p-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
            <div>
              <h2 className="text-sm font-bold flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-primary" />
                {t("ডিজিটাল প্রেসক্রিপশন", "Digital Prescription")}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {room.rx
                  ? t("ডাক্তার কর্তৃক স্বাক্ষরিত ও অনুমোদিত প্রেসক্রিপশন", "Prescription signed & authorized by doctor")
                  : t("এখনো কোনো প্রেসক্রিপশন ইস্যু করা হয়নি", "No prescription issued yet")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {room.rx && (
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition"
                  title={t("প্রেসক্রিপশন প্রিন্ট করুন", "Print prescription")}
                >
                  <Printer className="h-3.5 w-3.5 text-primary" />
                  {t("প্রিন্ট / ডাউনলোড", "Print / Download")}
                </button>
              )}
              {isStaff && (
                <button
                  type="button"
                  onClick={() => {
                    if (isEditingRx) {
                      setIsEditingRx(false);
                    } else {
                      initRxEditor();
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {isEditingRx
                    ? t("বাতিল করুন", "Cancel")
                    : room.rx
                    ? t("সম্পাদন করুন", "Edit Rx")
                    : t("প্রেসক্রিপশন লিখুন", "Write Rx")}
                </button>
              )}
            </div>
          </div>

          {/* Rx Editing Form for Staff/Doctor */}
          {isEditingRx && isStaff && (
            <div className="mt-4 space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-3.5">
              <h3 className="text-xs font-bold text-primary">
                {t("প্রেসক্রিপশন রচনা করুন", "Compose Prescription")}
              </h3>

              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                  {t("রোগ নির্ণয় / ডায়াগনোসিস", "Diagnosis")}
                </label>
                <input
                  type="text"
                  value={rxDiagnosis}
                  onChange={(e) => setRxDiagnosis(e.target.value)}
                  placeholder={t("যেমন: Acute Pharyngitis, Fever", "e.g., Acute Pharyngitis, Fever")}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-primary"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground">
                    {t("ঔষধের তালিকা", "Medications List")}
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setRxItems([...rxItems, { name: "", dose: "", duration: "" }])
                    }
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                  >
                    <Plus className="h-3 w-3" /> {t("ঔষধ যোগ করুন", "Add Medicine")}
                  </button>
                </div>

                <div className="space-y-2">
                  {rxItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => {
                          const updated = [...rxItems];
                          const cur = updated[idx];
                          if (cur) cur.name = e.target.value;
                          setRxItems(updated);
                        }}
                        placeholder={t("ঔষধের নাম (যেমন Napa 500mg)", "Medicine name")}
                        className="flex-[2] rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary"
                      />
                      <input
                        type="text"
                        value={item.dose}
                        onChange={(e) => {
                          const updated = [...rxItems];
                          const cur = updated[idx];
                          if (cur) cur.dose = e.target.value;
                          setRxItems(updated);
                        }}
                        placeholder={t("ডোজ (যেমন 1+0+1 খাবারের পর)", "Dose")}
                        className="flex-[1.5] rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary"
                      />
                      <input
                        type="text"
                        value={item.duration}
                        onChange={(e) => {
                          const updated = [...rxItems];
                          const cur = updated[idx];
                          if (cur) cur.duration = e.target.value;
                          setRxItems(updated);
                        }}
                        placeholder={t("মেয়াদ (যেমন ৫ দিন)", "Duration")}
                        className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (rxItems.length > 1) {
                            setRxItems(rxItems.filter((_, i) => i !== idx));
                          } else {
                            setRxItems([{ name: "", dose: "", duration: "" }]);
                          }
                        }}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition"
                        title={t("মুছুন", "Delete")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                  {t("পরামর্শ / উপদেশ", "Advice & Instructions")}
                </label>
                <textarea
                  value={rxAdvice}
                  onChange={(e) => setRxAdvice(e.target.value)}
                  rows={2}
                  placeholder={t("যেমন: প্রচুর পানি ও তরল খাবার গ্রহণ করুন। বিশ্রামে থাকুন।", "e.g., Drink plenty of water and fluids. Rest well.")}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                  {t("পরবর্তী সাক্ষাৎ / ফলো-আপ", "Follow-up")}
                </label>
                <input
                  type="text"
                  value={rxFollowUp}
                  onChange={(e) => setRxFollowUp(e.target.value)}
                  placeholder={t("যেমন: ৭ দিন পর যোগাযোগ করবেন", "e.g., Follow up after 7 days")}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingRx(false)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary"
                >
                  {t("বাতিল", "Cancel")}
                </button>
                <button
                  type="button"
                  disabled={act.isPending}
                  onClick={handleSaveRx}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {act.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  {t("প্রেসক্রিপশন সংরক্ষণ করুন", "Save Prescription")}
                </button>
              </div>
            </div>
          )}

          {/* Rx View Display */}
          {room.rx ? (
            <div className="mt-3 space-y-3">
              {room.rx.diagnosis && (
                <div>
                  <span className="font-semibold text-muted-foreground">{t("ডায়াগনোসিস", "Diagnosis")}:</span>{" "}
                  <span className="font-medium">{room.rx.diagnosis}</span>
                </div>
              )}
              {room.rx.items && room.rx.items.length > 0 && (
                <div>
                  <span className="font-semibold text-muted-foreground block mb-1">{t("ঔষধসমূহ", "Medicines")}:</span>
                  <div className="divide-y divide-border/60 rounded-xl border border-border/80 bg-background overflow-hidden">
                    {room.rx.items.map((it, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 hover:bg-secondary/30 transition">
                        <div>
                          <p className="font-bold text-foreground">{it.name}</p>
                          <p className="text-[11px] text-muted-foreground">{it.dose || "—"}</p>
                        </div>
                        {it.duration && (
                          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            {it.duration}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {room.rx.advice && (
                <div>
                  <span className="font-semibold text-muted-foreground">{t("পরামর্শ", "Advice")}:</span>{" "}
                  <span className="text-muted-foreground whitespace-pre-line">{room.rx.advice}</span>
                </div>
              )}
              {room.rx.followUp && (
                <div className="text-[11px] text-primary font-medium">
                  <span className="font-semibold">{t("ফলো-আপ", "Follow-up")}:</span> {room.rx.followUp}
                </div>
              )}
            </div>
          ) : !isEditingRx ? (
            <div className="py-4 text-center text-muted-foreground text-xs">
              {t("কনসালটেশন শেষে ডাক্তার প্রেসক্রিপশন প্রদান করবেন।", "Doctor will issue prescription upon completion of consultation.")}
            </div>
          ) : null}
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
          {room.messages.map((m) => {
            const isAudio = m.fileUrl?.match(/\.(webm|mp3|wav|ogg|m4a)$/i);
            return (
              <div
                key={m.id}
                className={`rounded-lg px-3 py-2 text-xs ${
                  m.sender === "patient" ? "bg-primary/10 ml-6" : "bg-secondary mr-6"
                }`}
              >
                {m.body && <p>{m.body}</p>}
                {m.fileUrl && isAudio && (
                  <audio controls src={m.fileUrl} className="mt-1.5 w-full h-8" preload="metadata" />
                )}
                {m.fileUrl && !isAudio && (
                  <a
                    href={m.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-primary underline"
                  >
                    <Paperclip className="h-3 w-3" /> {m.fileName || t("ফাইল দেখুন", "View file")}
                  </a>
                )}
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {new Date(m.createdAt).toLocaleString(t.en ? "en-US" : "bn-BD")}
                </p>
              </div>
            );
          })}
        </div>
        {appt.status !== "cancelled" && (
          <form
            className="mt-3 flex items-center gap-2"
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
              type="file"
              ref={chatFileInputRef}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  void uploadAndSendChatMessage(f);
                  e.target.value = "";
                }
              }}
            />
            <button
              type="button"
              disabled={uploadingFile}
              onClick={() => chatFileInputRef.current?.click()}
              className="rounded-lg border border-border p-2 text-muted-foreground hover:text-primary transition disabled:opacity-50"
              title={t("ফাইল সংযুক্ত করুন", "Attach file")}
            >
              {uploadingFile ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Paperclip className="h-4 w-4" />}
            </button>
            <input
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder={t("মেসেজ লিখুন…", "Write a message…")}
              className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none"
            />
            <button
              type="submit"
              disabled={act.isPending || !msg.trim()}
              className="rounded-lg bg-primary px-3 py-2 text-primary-foreground disabled:opacity-50 transition"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4 text-xs">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold">{t("রিপোর্ট ও ভয়েস নোট", "Reports & Voice Notes")}</h2>
          <span className="text-[11px] text-muted-foreground">{room.media.length} {t("টি ফাইল", "files")}</span>
        </div>

        <ul className="mt-3 space-y-2">
          {room.media.map((m) => {
            const isAudio = m.kind === "audio" || m.url.match(/\.(webm|mp3|wav|ogg|m4a)$/i);
            return (
              <li key={m.id} className="rounded-xl border border-border/80 bg-secondary/40 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {isAudio ? (
                      <Volume2 className="h-4 w-4 text-primary shrink-0" />
                    ) : (
                      <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-xs font-semibold text-primary hover:underline"
                    >
                      {m.name || m.url}
                    </a>
                  </div>
                  <button
                    type="button"
                    className="text-[11px] font-medium text-destructive hover:underline shrink-0"
                    onClick={() =>
                      act.mutate(
                        { action: "media_delete", mediaId: m.id },
                        { onError: (e) => toast.error(e.message) },
                      )
                    }
                  >
                    {t("মুছুন", "Delete")}
                  </button>
                </div>
                {isAudio && (
                  <audio controls src={m.url} className="mt-2 w-full h-8 rounded" preload="metadata" />
                )}
              </li>
            );
          })}
          {room.media.length === 0 && (
            <p className="py-2 text-center text-muted-foreground">
              {t("কোনো রিপোর্ট বা প্রেসক্রিপশন আপলোড করা হয়নি", "No reports or files uploaded yet")}
            </p>
          )}
        </ul>

        {/* Upload and Voice Recorder Controls */}
        <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*,.pdf,audio/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                void uploadAndAttach(f, f.type.startsWith("audio/") ? "audio" : "report");
                e.target.value = "";
              }
            }}
          />

          <button
            type="button"
            disabled={uploadingFile}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold hover:border-primary/50 transition disabled:opacity-50"
          >
            {uploadingFile ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            ) : (
              <Paperclip className="h-3.5 w-3.5 text-primary" />
            )}
            {t("রিপোর্ট/প্রেসক্রিপশন আপলোড", "Upload Report / File")}
          </button>

          {!isRecording ? (
            <button
              type="button"
              disabled={uploadingFile}
              onClick={startRecording}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-rose-600 hover:border-rose-300 transition disabled:opacity-50"
            >
              <Mic className="h-3.5 w-3.5" />
              {t("ভয়েস রেকর্ড করুন", "Record Voice Note")}
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 text-xs text-rose-600 font-semibold animate-pulse">
              <span className="h-2 w-2 rounded-full bg-rose-600"></span>
              <span>
                {Math.floor(recordingSeconds / 60)
                  .toString()
                  .padStart(2, "0")}
                :{(recordingSeconds % 60).toString().padStart(2, "0")}
              </span>
              <button
                type="button"
                onClick={stopRecording}
                className="ml-2 flex items-center gap-1 rounded bg-rose-600 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-rose-700"
              >
                <Square className="h-3 w-3 fill-current" /> {t("বন্ধ ও পাঠান", "Stop & Send")}
              </button>
            </div>
          )}
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
      </section>

      {room.rx && (
        <div
          id="rx-printable-sheet"
          className="hidden print:block print:w-full print:p-8 bg-white text-black font-sans"
        >
          <div className="flex items-center justify-between border-b-2 border-emerald-800 pb-4">
            <div>
              <h1 className="text-2xl font-black text-emerald-800">ঔষধওয়ালা (Oushodhwala)</h1>
              <p className="text-xs text-gray-600">টেলিমেডিসিন ও ডিজিটাল স্বাস্থ্যসেবা</p>
              <p className="text-xs text-gray-500">
                হটলাইন: {settings.supportPhone || "16263"} | support@oushodhwala.com
              </p>
            </div>
            <div className="text-right">
              <h2 className="text-base font-bold text-gray-900">
                {room.doctor?.name || appt.doctorName}
              </h2>
              <p className="text-xs text-gray-600">{appt.doctorSpec}</p>
              <p className="text-xs text-gray-500">
                তারিখ: {new Date(appt.scheduledAt).toLocaleDateString("bn-BD")}
              </p>
              <p className="text-xs font-mono text-gray-500">ইনভয়েস: #{appt.invoiceNo}</p>
            </div>
          </div>

          <div className="my-4 rounded-lg bg-gray-50 p-3 text-xs border border-gray-200 flex justify-between">
            <div>
              <span className="font-bold">রোগীর নাম:</span> {appt.patientName}
            </div>
            <div>
              <span className="font-bold">মোবাইল:</span> {appt.phone}
            </div>
            <div>
              <span className="font-bold">কনসালটেশন মাধ্যম:</span>{" "}
              {t(
                MODE_LABEL[appt.mode as CallMode]?.bn ?? appt.mode,
                MODE_LABEL[appt.mode as CallMode]?.en ?? appt.mode,
              )}
            </div>
          </div>

          <div className="mb-4">
            <span className="text-3xl font-serif font-black text-emerald-900">℞</span>
          </div>

          {room.rx.diagnosis && (
            <div className="mb-4">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                ডায়াগনোসিস / Diagnosis
              </h3>
              <p className="mt-1 text-sm text-gray-900 bg-emerald-50/50 p-2 rounded border border-emerald-100 font-medium">
                {room.rx.diagnosis}
              </p>
            </div>
          )}

          {room.rx.items && room.rx.items.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                ঔষধের তালিকা / Prescribed Medications
              </h3>
              <table className="w-full text-left text-xs border-collapse border border-gray-300">
                <thead>
                  <tr className="border-b border-gray-300 bg-gray-100">
                    <th className="py-2 px-3 w-8 border-r border-gray-300">#</th>
                    <th className="py-2 px-3 border-r border-gray-300">ঔষধের নাম (Medicine Name)</th>
                    <th className="py-2 px-3 border-r border-gray-300">ডোজ / সেবনবিধি (Dosage)</th>
                    <th className="py-2 px-3">মেয়াদ (Duration)</th>
                  </tr>
                </thead>
                <tbody>
                  {room.rx.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-200">
                      <td className="py-2 px-3 font-mono border-r border-gray-200">{idx + 1}</td>
                      <td className="py-2 px-3 font-semibold text-gray-900 border-r border-gray-200">
                        {item.name}
                      </td>
                      <td className="py-2 px-3 text-gray-700 border-r border-gray-200">
                        {item.dose || "—"}
                      </td>
                      <td className="py-2 px-3 text-gray-700">{item.duration || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {room.rx.advice && (
            <div className="mb-4">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                পরামর্শ ও উপদেশ / Advice
              </h3>
              <p className="mt-1 text-xs text-gray-800 whitespace-pre-line bg-gray-50 p-2.5 rounded border border-gray-200">
                {room.rx.advice}
              </p>
            </div>
          )}

          {room.rx.followUp && (
            <div className="mb-8">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                পরবর্তী সাক্ষাৎ / Follow Up
              </h3>
              <p className="mt-1 text-xs font-medium text-gray-900">{room.rx.followUp}</p>
            </div>
          )}

          <div className="mt-12 pt-6 border-t border-gray-300 flex justify-between items-end text-xs text-gray-500">
            <div>
              <p>এই প্রেসক্রিপশনটি ওষধওয়ালা টেলিমেডিসিন সিস্টেম দ্বারা সংরক্ষিত ও ডিজিটালভাবে প্রস্তুতকৃত।</p>
              <p className="text-[10px] mt-0.5 text-gray-400">
                ঔষধ ক্রয়ের জন্য ওষধওয়ালা অনলাইন বা পার্টনার ফার্মেসিতে ব্যবহারযোগ্য।
              </p>
            </div>
            <div className="text-center">
              <div className="w-40 border-b border-gray-400 mb-1"></div>
              <p className="font-semibold text-gray-800">{room.doctor?.name || appt.doctorName}</p>
              <p className="text-[10px]">স্বাক্ষরিত (ডিজিটাল প্রেসক্রিপশন)</p>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #rx-printable-sheet,
          #rx-printable-sheet * {
            visibility: visible;
          }
          #rx-printable-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: block !important;
            margin: 0;
            padding: 20px;
          }
        }
      `}</style>
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

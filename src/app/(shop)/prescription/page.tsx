"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  Camera,
  FileText,
  ShieldCheck,
  Clock,
  FlaskConical,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/lib/i18n";
import {
  createPrescription,
  listMyPrescriptions,
  claimGuestPrescriptions,
  deletePrescription,
} from "@/server/actions/prescriptions";
import { getGuestToken, rememberGuestRx, forgetGuestRx } from "@/lib/rx-guest";
import { checkRxImage, rxQualityMessage, type RxImageQuality } from "@/lib/rx-image-quality";

const MAX_FILES = 5;
const MAX_MB = 20;
const OK_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];

type Picked = {
  file: File;
  url: string;
  id: string;
  quality?: RxImageQuality;
};

export default function PrescriptionPage() {
  const t = useT();
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  const [note, setNote] = useState("");
  const [phone, setPhone] = useState("");
  const [picked, setPicked] = useState<Picked[]>([]);
  const [checkingQuality, setCheckingQuality] = useState(false);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"idle" | "upload" | "save" | "read">("idle");
  const [guestToken, setGuestToken] = useState("");

  useEffect(() => {
    const tok = getGuestToken();
    setGuestToken(tok);
  }, []);

  // Claim guest prescriptions when user logs in
  const claimedRef = useRef(false);
  useEffect(() => {
    if (!user || claimedRef.current) return;
    const tok = getGuestToken();
    if (!tok) return;
    claimedRef.current = true;
    claimGuestPrescriptions(tok)
      .then((res) => {
        if (res.claimed > 0) {
          qc.invalidateQueries({ queryKey: ["my-prescriptions-list"] });
          toast.success(
            t(
              "আগের প্রেসক্রিপশনগুলো আপনার অ্যাকাউন্টে যুক্ত হয়েছে",
              "Earlier prescriptions moved to your account",
            ),
          );
        }
      })
      .catch(() => {});
  }, [user, qc, t]);

  const { data: myPrescriptions, isLoading: loadingList } = useQuery({
    queryKey: ["my-prescriptions-list", user?.id || guestToken],
    enabled: !!user || !!guestToken,
    queryFn: () => listMyPrescriptions(user ? undefined : guestToken),
  });

  const onPick = async (files: FileList | null) => {
    if (!files?.length) return;
    setCheckingQuality(true);
    const next: Picked[] = [];

    for (const file of Array.from(files)) {
      if (picked.length + next.length >= MAX_FILES) break;
      if (!OK_TYPES.includes(file.type) && !file.name.match(/\.(jpe?g|png|webp|heic|pdf)$/i)) {
        toast.error(t("শুধু ছবি বা PDF দিন", "Only images or PDF allowed"));
        continue;
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        toast.error(t(`ফাইল ${MAX_MB}MB এর বেশি`, `File exceeds ${MAX_MB}MB`));
        continue;
      }

      const id = crypto.randomUUID();
      const url = URL.createObjectURL(file);
      let quality: RxImageQuality | undefined;

      if (file.type.startsWith("image/")) {
        try {
          quality = await checkRxImage(file);
        } catch {
          quality = undefined;
        }
      }

      next.push({ file, url, id, quality });
    }

    setPicked((p) => [...p, ...next]);
    setCheckingQuality(false);
  };

  const remove = (id: string) => {
    setPicked((p) => {
      const hit = p.find((x) => x.id === id);
      if (hit) URL.revokeObjectURL(hit.url);
      return p.filter((x) => x.id !== id);
    });
  };

  const submit = async () => {
    if (!picked.length) {
      toast.error(t("অন্তত একটি ফাইল দিন", "Attach at least one file"));
      return;
    }

    const currentGuestToken = !user ? guestToken || getGuestToken() : undefined;

    setBusy(true);
    setPhase("upload");

    try {
      const paths: string[] = [];
      for (const item of picked) {
        const fd = new FormData();
        fd.set("file", item.file);
        fd.set("bucket", "prescriptions");
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error || t("আপলোড ব্যর্থ", "Upload failed"));
        }
        const saved = (await res.json()) as { path?: string; url?: string };
        paths.push(saved.path || saved.url || item.file.name);
      }

      setPhase("save");
      const created = await createPrescription({
        filePaths: paths,
        phone: phone.trim() || undefined,
        note: note.trim() || undefined,
        guestToken: currentGuestToken,
      });

      if (!user && created.id) {
        rememberGuestRx(created.id);
      }

      setPhase("read");

      setPicked([]);
      setNote("");
      qc.invalidateQueries({ queryKey: ["my-prescriptions-list"] });
      toast.success(
        t(
          "প্রেসক্রিপশন জমা হয়েছে — ফার্মাসিস্ট যাচাই করবেন",
          "Prescription submitted — a pharmacist will review it",
        ),
      );
      router.push(`/prescription/${created.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("আপলোড ব্যর্থ", "Upload failed"));
    } finally {
      setBusy(false);
      setPhase("idle");
    }
  };

  const handleDeletePrescription = async (id: string) => {
    if (!confirm(t("এই প্রেসক্রিপশনটি মুছে ফেলতে চান?", "Delete this prescription?"))) return;
    try {
      await deletePrescription(id, user ? undefined : guestToken);
      if (!user) forgetGuestRx(id);
      qc.invalidateQueries({ queryKey: ["my-prescriptions-list"] });
      toast.success(t("মুছে ফেলা হয়েছে", "Prescription deleted"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("মুছে ফেলা ব্যর্থ", "Delete failed"));
    }
  };

  return (
    <div className="pt-4 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="font-display text-lg font-extrabold">{t("প্রেসক্রিপশন আপলোড", "Upload prescription")}</h1>
          <p className="text-xs text-muted-foreground">
            {t(
              "ডাক্তারের প্রেসক্রিপশনের ছবি আপলোড করুন — লাইসেন্সপ্রাপ্ত ফার্মাসিস্ট যাচাই করে ঔষধ সাজাবেন।",
              "Upload a photo of your prescription — a licensed pharmacist will verify and prepare your medicines.",
            )}
          </p>
        </div>
        {!user && (
          <div className="self-start rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-[11px] font-semibold text-amber-600">
            {t("গেস্ট মোড সক্রিয় (লগইন ঐচ্ছিক)", "Guest mode active (login optional)")}
          </div>
        )}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {[
          { icon: ShieldCheck, bn: "ফার্মাসিস্ট যাচাই", en: "Pharmacist verified" },
          { icon: Clock, bn: "৩০ মিনিটে রিভিউ", en: "Reviewed in ~30 min" },
          { icon: Sparkles, bn: "এআই তাৎক্ষণিক রিডিং", en: "Instant AI Reading" },
        ].map((x) => (
          <div key={x.en} className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-[11px] font-semibold">
            <x.icon className="h-4 w-4 text-primary" />
            {t(x.bn, x.en)}
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-dashed border-primary/40 bg-secondary/40 p-6 text-center">
        <Upload className="mx-auto h-8 w-8 text-primary" />
        <p className="mt-2 text-sm font-bold">{t("ছবি বা PDF এখানে দিন", "Drop images or PDF here")}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {t(`সর্বোচ্চ ${MAX_FILES} ফাইল · ${MAX_MB}MB`, `Up to ${MAX_FILES} files · ${MAX_MB}MB`)}
        </p>
        <div className="mt-3 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition"
          >
            {t("ফাইল বাছুন", "Choose files")}
          </button>
          <button
            type="button"
            onClick={() => camRef.current?.click()}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-secondary transition"
          >
            <Camera className="h-3.5 w-3.5" /> {t("ক্যামেরা", "Camera")}
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            void onPick(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={camRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            void onPick(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {checkingQuality && (
        <div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          {t("ছবির মান যাচাই করা হচ্ছে...", "Checking image quality...")}
        </div>
      )}

      {picked.length > 0 && (
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {picked.map((p) => {
            const hasQuality = !!p.quality;
            const isOk = !hasQuality || p.quality?.ok;
            const qualityMsg = p.quality ? rxQualityMessage(p.quality, false) : "";

            return (
              <li key={p.id} className="relative overflow-hidden rounded-xl border border-border bg-card shadow-xs">
                {p.file.type.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.url} alt="" className="h-28 w-full object-cover" />
                ) : (
                  <div className="grid h-28 place-items-center text-xs font-semibold text-muted-foreground">PDF</div>
                )}
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  className="absolute right-1 top-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-bold text-destructive hover:bg-destructive hover:text-white transition"
                >
                  ✕
                </button>

                {hasQuality && (
                  <div className={`px-2 py-1 text-[10px] flex items-center gap-1 font-semibold ${
                    isOk ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/15 text-amber-700"
                  }`}>
                    {isOk ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                        <span>{t("ছবির মান উপযুক্ত", "Good quality")}</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        <span className="truncate" title={qualityMsg}>{qualityMsg}</span>
                      </>
                    )}
                  </div>
                )}

                <p className="truncate px-2 py-1 text-[10px] font-mono text-muted-foreground">{p.file.name}</p>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t("মোবাইল নম্বর (যোগাযোগের জন্য)", "Mobile number (for updates)")}
          className="rounded-lg border border-border bg-card px-3 py-2 text-xs"
        />
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("বিশেষ কোনো নির্দেশ বা প্রয়োজনীয় ব্র্যান্ডের নাম (ঐচ্ছিক)", "Special instructions or preferred brand (optional)")}
          className="rounded-lg border border-border bg-card px-3 py-2 text-xs sm:col-span-2"
          rows={2}
        />
      </div>

      {busy && (
        <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center justify-between text-xs font-bold text-primary mb-2">
            <span>{t("প্রেসক্রিপশন প্রসেসিং চলছে...", "Processing prescription...")}</span>
            <span className="capitalize">{phase}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-semibold">
            <div className={`p-2 rounded-lg ${phase === "upload" ? "bg-primary text-white" : "bg-card text-muted-foreground border"}`}>
              1. {t("ফাইল আপলোড", "Uploading")}
            </div>
            <div className={`p-2 rounded-lg ${phase === "save" ? "bg-primary text-white" : "bg-card text-muted-foreground border"}`}>
              2. {t("রেকর্ড তৈরি", "Saving Record")}
            </div>
            <div className={`p-2 rounded-lg ${phase === "read" ? "bg-primary text-white" : "bg-card text-muted-foreground border"}`}>
              3. {t("এআই রিডিং", "AI Reading")}
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        disabled={busy || picked.length === 0}
        onClick={() => void submit()}
        className="mt-4 w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50 hover:bg-primary/95 transition shadow-xs"
      >
        {busy ? t("প্রসেসিং হচ্ছে...", "Processing...") : t("প্রেসক্রিপশন জমা দিন", "Submit prescription")}
      </button>

      {!user && (
        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          {t("প্রেসক্রিপশন স্থায়ীভাবে অ্যাকাউন্টে সংরক্ষণ করতে চান?", "Want to save prescriptions permanently to an account?")}{" "}
          <Link href="/auth" className="font-semibold text-primary underline">
            {t("লগইন বা রেজিস্টার করুন", "Log in or Register")}
          </Link>
        </p>
      )}

      {/* Prescriptions Section */}
      <div className="mt-8 border-t border-border pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-primary" />
              {user
                ? t("আপনার সংরক্ষিত প্রেসক্রিপশনসমূহ", "Your Uploaded Prescriptions")
                : t("এই ডিভাইসের প্রেসক্রিপশন হিস্ট্রি", "Prescription History on this Device")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t(
                "পূর্ববর্তী প্রেসক্রিপশনের তালিকা, এআই স্ক্যানের ফলাফল ও অর্ডারের অবস্থা",
                "View submitted prescriptions, AI extraction results, and order status",
              )}
            </p>
          </div>
          {myPrescriptions && (
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              {t.n(myPrescriptions.length)} {t("টি", "records")}
            </span>
          )}
        </div>

        {loadingList ? (
          <p className="text-xs text-muted-foreground text-center py-6">{t("লোড হচ্ছে...", "Loading...")}</p>
        ) : myPrescriptions && myPrescriptions.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {myPrescriptions.map((rx) => {
              const statusBadge: Record<string, { cls: string; labelBn: string; labelEn: string }> = {
                pending: { cls: "bg-amber-500/10 text-amber-600 border-amber-500/30", labelBn: "অপেক্ষমান", labelEn: "Pending" },
                reviewing: { cls: "bg-blue-500/10 text-blue-600 border-blue-500/30", labelBn: "যাচাই চলছে", labelEn: "Reviewing" },
                approved: { cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", labelBn: "অনুমোদিত", labelEn: "Approved" },
                fulfilled: { cls: "bg-purple-500/10 text-purple-600 border-purple-500/30", labelBn: "অর্ডার সম্পন্ন", labelEn: "Fulfilled" },
              };
              const badge = statusBadge[rx.status] || { cls: "bg-secondary text-foreground", labelBn: rx.status, labelEn: rx.status };
              const firstImg = rx.filePaths.find((p) => p.match(/\.(jpe?g|png|webp)$/i));
              const imgUrl = firstImg ? `/uploads/${firstImg.replace(/^\/+/, "")}` : null;

              return (
                <div
                  key={rx.id}
                  className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition hover:border-primary/50 shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
                      <span className="font-mono text-xs font-bold text-foreground">
                        #{rx.id.slice(0, 8)}...
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${badge.cls}`}>
                          {t(badge.labelBn, badge.labelEn)}
                        </span>
                        <button
                          type="button"
                          onClick={() => void handleDeletePrescription(rx.id)}
                          className="text-muted-foreground hover:text-destructive transition p-1"
                          title={t("মুছে ফেলুন", "Delete")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex items-start gap-3">
                      {imgUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imgUrl}
                          alt="Prescription thumbnail"
                          className="h-16 w-16 rounded-lg object-cover border border-border shrink-0 bg-secondary"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-lg border border-border bg-secondary flex items-center justify-center shrink-0">
                          <FileText className="h-6 w-6 text-primary" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-xs text-foreground font-medium truncate">
                          {rx.note || t("প্রেসক্রিপশন আপলোড", "Prescription Upload")}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {rx.filePaths.length} {t("টি ফাইল সংযুক্ত", "file(s) attached")}
                        </p>
                        <p className="text-[10px] text-muted-foreground/80">
                          {new Date(rx.createdAt).toLocaleDateString("bn-BD", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/prescription/${rx.id}`}
                    className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary/10 py-2 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground transition"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {t("বিস্তারিত ও ঔষধের তালিকা দেখুন", "View Details & Order")}
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            {t("কোনো সংরক্ষিত প্রেসক্রিপশন পাওয়া যায়নি।", "No saved prescriptions found.")}
          </div>
        )}
      </div>
    </div>
  );
}

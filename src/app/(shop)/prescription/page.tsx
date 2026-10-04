"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Upload, Camera, FileText, ShieldCheck, Clock, FlaskConical, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/lib/i18n";
import { createPrescription, listMyPrescriptions } from "@/server/actions/prescriptions";

const MAX_FILES = 5;
const MAX_MB = 20;
const OK_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];

type Picked = { file: File; url: string; id: string };

export default function PrescriptionPage() {
  const t = useT();
  const { user } = useAuth();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState("");
  const [phone, setPhone] = useState("");
  const [picked, setPicked] = useState<Picked[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);

  const { data: myPrescriptions, isLoading: loadingList } = useQuery({
    queryKey: ["my-prescriptions-list"],
    enabled: !!user,
    queryFn: () => listMyPrescriptions(),
  });

  const onPick = (files: FileList | null) => {
    if (!files?.length) return;
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
      next.push({ file, url: URL.createObjectURL(file), id: crypto.randomUUID() });
    }
    setPicked((p) => [...p, ...next]);
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
    if (!user) {
      toast.error(t("আপলোডের জন্য লগইন করুন", "Please log in to upload"));
      router.push("/auth");
      return;
    }
    setBusy(true);
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
      const created = await createPrescription({
        filePaths: paths,
        phone: phone.trim() || undefined,
        note: note.trim() || undefined,
      });
      setDone((n) => n + paths.length);
      setPicked([]);
      setNote("");
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
    }
  };

  return (
    <div className="pt-4 pb-10">
      <h1 className="font-display text-lg font-extrabold">{t("প্রেসক্রিপশন আপলোড", "Upload prescription")}</h1>
      <p className="text-xs text-muted-foreground">
        {t(
          "ডাক্তারের প্রেসক্রিপশনের ছবি আপলোড করুন — লাইসেন্সপ্রাপ্ত ফার্মাসিস্ট যাচাই করে ঔষধ সাজাবেন।",
          "Upload a photo of your prescription — a licensed pharmacist will verify and prepare your medicines.",
        )}
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {[
          { icon: ShieldCheck, bn: "ফার্মাসিস্ট যাচাই", en: "Pharmacist verified" },
          { icon: Clock, bn: "৩০ মিনিটে রিভিউ", en: "Reviewed in ~30 min" },
          { icon: FileText, bn: "গোপনীয়তা সুরক্ষিত", en: "Privacy protected" },
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
            className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
          >
            {t("ফাইল বাছুন", "Choose files")}
          </button>
          <button
            type="button"
            onClick={() => camRef.current?.click()}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold"
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
            onPick(e.target.files);
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
            onPick(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {picked.length > 0 && (
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {picked.map((p) => (
            <li key={p.id} className="relative overflow-hidden rounded-xl border border-border bg-card">
              {p.file.type.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.url} alt="" className="h-28 w-full object-cover" />
              ) : (
                <div className="grid h-28 place-items-center text-xs font-semibold text-muted-foreground">PDF</div>
              )}
              <button
                type="button"
                onClick={() => remove(p.id)}
                className="absolute right-1 top-1 rounded bg-background/90 px-1.5 text-[10px] font-bold"
              >
                ✕
              </button>
              <p className="truncate px-2 py-1 text-[10px]">{p.file.name}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t("মোবাইল (ঐচ্ছিক)", "Mobile (optional)")}
          className="rounded-lg border border-border bg-card px-3 py-2 text-xs"
        />
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("নোট (ঐচ্ছিক)", "Note (optional)")}
          className="rounded-lg border border-border bg-card px-3 py-2 text-xs sm:col-span-2"
          rows={2}
        />
      </div>

      <button
        type="button"
        disabled={busy || picked.length === 0}
        onClick={() => void submit()}
        className="mt-4 w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
      >
        {busy ? t("জমা হচ্ছে...", "Submitting...") : t("প্রেসক্রিপশন জমা দিন", "Submit prescription")}
      </button>

      {done > 0 && (
        <p className="mt-3 text-center text-xs font-semibold text-primary">
          ✅ {t(`${t.n(done)} টি ফাইল জমা হয়েছে`, `${t.n(done)} file(s) submitted`)}
        </p>
      )}

      {!user && (
        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          {t("আপলোডের জন্য", "Need an account?")}{" "}
          <Link href="/auth" className="font-semibold text-primary underline">
            {t("লগইন করুন", "Log in")}
          </Link>
        </p>
      )}

      {/* Uploaded Prescriptions Section */}
      {user && (
        <div className="mt-8 border-t border-border pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-primary" />
                {t("আপনার সংরক্ষিত প্রেসক্রিপশনসমূহ", "Your Uploaded Prescriptions")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t(
                  "পূর্ববর্তী প্রেসক্রিপশনের তালিকা, এআই স্ক্যানের ফলাফল ও অর্ডারের অবস্থা",
                  "View previously submitted prescriptions, AI extraction results, and order status"
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
                        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${badge.cls}`}>
                          {t(badge.labelBn, badge.labelEn)}
                        </span>
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
      )}
    </div>
  );
}

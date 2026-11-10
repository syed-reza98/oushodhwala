"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  Camera,
  FileText,
  ShieldCheck,
  Clock,
  Trash2,
  RefreshCw,
  Loader2,
  Smartphone,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import {
  createPrescription,
  listMyPrescriptions,
  claimGuestPrescriptions,
  deletePrescription,
  runPrescriptionAiOcr,
  quickReorderRx,
} from "@/server/actions/prescriptions";
import { getGuestToken, rememberGuestRx, forgetGuestRx } from "@/lib/rx-guest";
import { checkRxImage, rxQualityMessage, type RxImageQuality } from "@/lib/rx-image-quality";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STATUS: Record<string, { bn: string; en: string }> = {
  pending: { bn: "যাচাই চলছে", en: "Under review" },
  approved: { bn: "অনুমোদিত", en: "Approved" },
  rejected: { bn: "বাতিল", en: "Rejected" },
  fulfilled: { bn: "অর্ডার তৈরি হয়েছে", en: "Order created" },
};

const MAX_FILES = 5;
const MAX_MB = 20;
const OK_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
/** প্রেসক্রিপশনের সাধারণ বৈধতা — ৩০ দিন */
const VALID_DAYS = 30;

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
  const { add } = useStore();

  const inputRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  const [note, setNote] = useState("");
  const [phone, setPhone] = useState("");
  const [picked, setPicked] = useState<Picked[]>([]);
  const [checking, setChecking] = useState(false);
  const [done, setDone] = useState(0);
  const [uploaded, setUploaded] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState<string[]>([]);
  const [retrying, setRetrying] = useState<Record<string, number>>({});
  const [delId, setDelId] = useState<string | null>(null);
  const [readId, setReadId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [retDays, setRetDays] = useState(0);

  /** গেস্ট আপলোডের পর প্রসেসিং অনুমতির ডায়ালগ */
  const [permOpen, setPermOpen] = useState(false);
  const [consent, setConsent] = useState(false);

  /** লাইভ প্রগ্রেসের ধাপ */
  const [phase, setPhase] = useState<"idle" | "upload" | "save" | "read">("idle");
  const [errMsg, setErrMsg] = useState("");
  const [guestToken, setGuestToken] = useState("");

  useEffect(() => {
    setGuestToken(getGuestToken());
  }, [user]);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      picked.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [picked]);

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
          qc.invalidateQueries({ queryKey: ["prescriptions-list"] });
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

  const { data: list, isLoading: loadingList, refetch: refetchList } = useQuery({
    queryKey: ["prescriptions-list", user ? "user" : "guest", user?.id || guestToken],
    enabled: !!user || !!guestToken,
    queryFn: () => listMyPrescriptions(user ? undefined : guestToken),
  });

  const totalMb = useMemo(
    () => picked.reduce((s, p) => s + p.file.size, 0) / (1024 * 1024),
    [picked],
  );

  /** ফাইল যাচাই — ধরন, আকার, সংখ্যা ও ছবির মান (ঝাপসা/কম কনট্রাস্ট বাতিল) */
  const addFiles = async (filesList: FileList | null) => {
    const incoming = Array.from(filesList ?? []);
    if (!incoming.length) return;
    const next: Picked[] = [];
    setChecking(true);

    for (const f of incoming) {
      const isImg = f.type.startsWith("image/");
      if (!isImg && !OK_TYPES.includes(f.type) && !f.name.match(/\.(jpe?g|png|webp|heic|pdf)$/i)) {
        toast.error(`${f.name} — ${t("শুধু ছবি বা PDF দিন", "images or PDF only")}`);
        continue;
      }
      if (f.size > MAX_MB * 1024 * 1024) {
        toast.error(`${f.name} — ${t(`সর্বোচ্চ ${MAX_MB}MB`, `max ${MAX_MB}MB`)}`);
        continue;
      }
      if (picked.some((p) => p.file.name === f.name && p.file.size === f.size)) continue;

      let q: RxImageQuality | undefined;
      if (isImg) {
        try {
          q = await checkRxImage(f);
          if (!q.ok) {
            toast.error(`${f.name} — ${rxQualityMessage(q, false)}`, { duration: 7000 });
            continue;
          }
        } catch {
          // If browser check throws, permit file
        }
      }
      next.push({
        file: f,
        url: URL.createObjectURL(f),
        id: `${f.name}-${f.size}-${Math.random()}`,
        ...(q ? { quality: q } : {}),
      });
    }

    setChecking(false);
    if (picked.length + next.length > MAX_FILES) {
      toast.error(t(`সর্বোচ্চ ${MAX_FILES}টি ফাইল`, `Up to ${MAX_FILES} files`));
    }
    setPicked((prev) => [...prev, ...next].slice(0, MAX_FILES));
  };

  /** এক ফাইল আপলোড — ব্যর্থ হলে ব্যাক-অফসহ সর্বোচ্চ ৩ বার স্বয়ংক্রিয় রিট্রাই */
  const uploadOne = async (p: Picked) => {
    let lastErr: Error | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const fd = new FormData();
        fd.set("file", p.file);
        fd.set("bucket", "prescriptions");
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (res.ok) {
          const saved = (await res.json()) as { path?: string; url?: string };
          return saved.path || saved.url || p.file.name;
        }
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        lastErr = new Error(body.error || "upload failed");
      } catch (e) {
        lastErr = e instanceof Error ? e : new Error("network error");
      }
      setRetrying((r) => ({ ...r, [p.id]: attempt }));
      await new Promise((res) => setTimeout(res, attempt * 1200));
    }
    throw lastErr ?? new Error("upload failed");
  };

  const submitPrescription = async () => {
    if (!picked.length) return;
    const uid = user?.id || null;
    const token = uid ? "" : guestToken || getGuestToken();

    const ok: Record<string, string> = { ...uploaded };
    const bad: string[] = [];
    setErrMsg("");
    setFailed([]);
    setPhase("upload");
    setDone(Object.keys(ok).length);

    for (const p of picked) {
      if (ok[p.id]) continue;
      try {
        ok[p.id] = await uploadOne(p);
        setUploaded({ ...ok });
        setDone((d) => d + 1);
      } catch {
        bad.push(p.id);
      }
    }
    setRetrying({});

    if (bad.length > 0) {
      setFailed(bad);
      setPhase("idle");
      setErrMsg(
        t(
          `${bad.length}টি ফাইল আপলোড হয়নি — ইন্টারনেট সংযোগ যাচাই করে "পুনরায় চেষ্টা করুন" চাপুন।`,
          `${bad.length} file(s) failed — check your connection and tap "Retry".`,
        ),
      );
      toast.error(
        t(
          `${bad.length}টি ফাইল আপলোড হয়নি — পুনরায় চেষ্টা করুন`,
          `${bad.length} file(s) failed — please retry`,
        ),
      );
      return;
    }

    const paths = picked.map((p) => ok[p.id]!).filter(Boolean);

    try {
      setPhase("save");
      const created = await createPrescription({
        filePaths: paths,
        phone: phone.trim() || undefined,
        note: note.trim() || undefined,
        guestToken: uid ? undefined : token,
      });

      if (!uid && created.id) {
        rememberGuestRx(created.id);
      }

      setPhase("read");
      toast.success(
        t(
          "প্রেসক্রিপশন জমা হয়েছে — ঔষধওয়ালা পড়া শুরু করছে",
          "Prescription submitted — Oushodhwala starts reading",
        ),
      );

      picked.forEach((p) => URL.revokeObjectURL(p.url));
      setPicked([]);
      setNote("");
      setDone(0);
      setUploaded({});
      setFailed([]);
      setErrMsg("");
      setPhase("idle");

      qc.invalidateQueries({ queryKey: ["prescriptions-list"] });
      router.push(`/prescription/${created.id}`);
    } catch (e) {
      setPhase("idle");
      const message =
        e instanceof Error
          ? e.message
          : t("প্রেসক্রিপশন সংরক্ষণ করা যায়নি", "Could not save prescription");
      setErrMsg(message);
      toast.error(message);
    }
  };

  const allowAndSubmit = () => {
    if (!consent) return;
    setPermOpen(false);
    void submitPrescription();
  };

  const rereadOne = async (id: string) => {
    setReadId(id);
    try {
      await runPrescriptionAiOcr(id, user ? undefined : guestToken);
      await qc.invalidateQueries({ queryKey: ["prescriptions-list"] });
      toast.success(t("আবার পড়া হয়েছে", "Re-read complete"));
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : t("পড়া যায়নি — স্পষ্ট ছবি দিয়ে আবার চেষ্টা করুন।", "Could not read"),
      );
    } finally {
      setReadId(null);
    }
  };

  const removeOne = async (id: string) => {
    if (
      !confirm(
        t(
          "এই প্রেসক্রিপশন ও ফলাফল স্থায়ীভাবে মুছে যাবে। নিশ্চিত?",
          "This prescription and its results will be permanently deleted. Continue?",
        ),
      )
    )
      return;

    setDelId(id);
    try {
      await deletePrescription(id, user ? undefined : guestToken);
      if (!user) forgetGuestRx(id);
      await qc.invalidateQueries({ queryKey: ["prescriptions-list"] });
      toast.success(t("মুছে ফেলা হয়েছে", "Deleted"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("মুছে ফেলা ব্যর্থ", "Delete failed"));
    } finally {
      setDelId(null);
    }
  };

  /** এক-ক্লিক রি-অর্ডার */
  const quickReorder = async (id: string) => {
    setBusyId(id);
    try {
      const res = await quickReorderRx(id, user ? undefined : guestToken);
      if (!res.lines.length) {
        toast.error(t("ক্যাটালগে কোনো ঔষধ মেলেনি", "No medicine matched in the catalogue"));
        return;
      }
      res.lines.forEach((l) =>
        add(
          {
            id: l.id,
            kind: "product",
            name: l.name,
            price: l.price,
            mrp: l.mrp ?? l.price,
          },
          l.qty,
        ),
      );
      toast.success(
        `${t.n(res.lines.length)} ${t("ঔষধ কার্টে যোগ হয়েছে", "medicines added to cart")}${
          res.missing.length ? ` · ${t.n(res.missing.length)} ${t("পাওয়া যায়নি", "unavailable")}` : ""
        }`,
      );
      router.push("/cart");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Re-order failed");
    } finally {
      setBusyId(null);
    }
  };

  const pct = picked.length ? Math.round((done / picked.length) * 100) : 0;
  const isPending = phase !== "idle";

  return (
    <div className="pt-4 pb-12">
      <h1 className="text-base font-bold">{t("প্রেসক্রিপশন আপলোড", "Upload prescription")}</h1>
      <p className="text-xs text-muted-foreground">
        {t(
          "ছবি আপলোড করুন — AI পড়ে ঔষধের তালিকা তৈরি করবে, লাইসেন্সপ্রাপ্ত ফার্মাসিস্ট যাচাই করবেন।",
          "Upload a photo — AI reads it and a licensed pharmacist verifies the list.",
        )}
      </p>

      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold">
        <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-1">
          <ShieldCheck className="h-3 w-3 text-primary" />{" "}
          {t("গোপনীয় ও এনক্রিপ্টেড", "Private & encrypted")}
        </span>
        <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-1">
          <Clock className="h-3 w-3 text-primary" /> {t("গড়ে ২ মিনিটে রিডিং", "~2 min reading")}
        </span>
      </div>

      {!user && (
        <p className="mt-3 rounded-lg bg-secondary p-3 text-xs">
          {t("প্রেসক্রিপশন জমা দিতে", "To submit a prescription")}{" "}
          <Link href="/auth" className="font-semibold text-primary underline">
            {t("লগইন করুন", "log in")}
          </Link>
          {t("।", ".")}
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-primary/40 bg-card p-6 text-center hover:bg-secondary/40 transition"
        >
          <Upload className="h-5 w-5 text-primary" />
          <span className="text-xs font-semibold">{t("ছবি বা PDF", "Image or PDF")}</span>
        </button>
        <button
          type="button"
          onClick={() => camRef.current?.click()}
          className="flex flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-primary/40 bg-card p-6 text-center hover:bg-secondary/40 transition"
        >
          <Camera className="h-5 w-5 text-primary" />
          <span className="text-xs font-semibold">{t("ক্যামেরায় তুলুন", "Take photo")}</span>
        </button>
      </div>

      <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
        {t(`সর্বোচ্চ ${MAX_FILES}টি ফাইল, প্রতিটি ${MAX_MB}MB পর্যন্ত`, `Up to ${MAX_FILES} files, ${MAX_MB}MB each`)}
        {picked.length > 0 && ` · ${t.n(picked.length)}/${t.n(MAX_FILES)} · ${totalMb.toFixed(1)}MB`}
      </p>
      <p className="mt-0.5 text-center text-[10px] text-muted-foreground">
        {checking ? (
          <span className="inline-flex items-center gap-1 font-semibold text-primary">
            <Loader2 className="h-3 w-3 animate-spin" />
            {t("ছবির মান যাচাই হচ্ছে...", "Checking image quality...")}
          </span>
        ) : (
          t(
            "ঝাপসা বা কম আলোর ছবি AI-তে পাঠানোর আগেই বাতিল হবে।",
            "Blurry or low-contrast photos are rejected before AI reading starts.",
          )
        )}
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        multiple
        className="hidden"
        onChange={(e) => {
          void addFiles(e.target.files);
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
          void addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {picked.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-2">
          {picked.map((p) => (
            <li key={p.id} className="relative overflow-hidden rounded-lg border border-border bg-card">
              {p.file.type.startsWith("image/") ? (
                <img src={p.url} alt={p.file.name} className="h-24 w-full object-cover" />
              ) : (
                <div className="flex h-24 w-full flex-col items-center justify-center gap-1 text-muted-foreground">
                  <FileText className="h-5 w-5" />
                  <span className="text-[9px]">PDF</span>
                </div>
              )}
              <p className="truncate px-1.5 py-1 text-[9px]">{p.file.name}</p>
              <p className="px-1.5 pb-1 text-[9px] font-semibold">
                {uploaded[p.id] ? (
                  <span className="text-primary">✓ {t("আপলোড হয়েছে", "Uploaded")}</span>
                ) : failed.includes(p.id) ? (
                  <span className="text-destructive">✕ {t("ব্যর্থ", "Failed")}</span>
                ) : retrying[p.id] ? (
                  <span className="text-amber-600">
                    {t(`রিট্রাই ${retrying[p.id]}/৩`, `Retry ${retrying[p.id]}/3`)}
                  </span>
                ) : isPending ? (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Loader2 className="h-2.5 w-2.5 animate-spin" /> {t("আপলোড হচ্ছে...", "Uploading...")}
                  </span>
                ) : (
                  <span className="text-muted-foreground">• {t("অপেক্ষায়", "Queued")}</span>
                )}
              </p>
              <button
                type="button"
                onClick={() => setPicked((prev) => prev.filter((x) => x.id !== p.id))}
                aria-label={t("সরান", "Remove")}
                className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-destructive shadow"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {(failed.length > 0 || errMsg) && !isPending && (
        <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
          <p className="text-[11px] font-semibold text-destructive">
            {errMsg ||
              `${t.n(failed.length)} ${t("টি ফাইল আপলোড হয়নি — বাকিগুলো সংরক্ষিত আছে।", "file(s) failed — the rest are saved.")}`}
          </p>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[10px] text-muted-foreground">
            <li>{t("ইন্টারনেট সংযোগ (Wi-Fi/মোবাইল ডেটা) ঠিক আছে কি না দেখুন।", "Check your Wi-Fi / mobile data connection.")}</li>
            <li>{t("ছবিটি ২০MB-এর কম ও JPG/PNG/PDF কি না নিশ্চিত করুন।", "Make sure the file is under 20MB and is JPG/PNG/PDF.")}</li>
            <li>{t("ফোনে জায়গা কম থাকলে ছবি ছোট করে আবার তুলুন।", "If storage is low, retake a smaller photo.")}</li>
            <li>{t("বারবার ব্যর্থ হলে লগইন করে জমা দিন বা ১৬৭০০ নম্বরে কল করুন।", "If it keeps failing, log in and submit, or call 16700.")}</li>
          </ul>
          {failed.length > 0 && (
            <button
              type="button"
              onClick={() => void submitPrescription()}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-[11px] font-bold text-primary-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5" /> {t("পুনরায় চেষ্টা করুন", "Retry")}
            </button>
          )}
        </div>
      )}

      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        inputMode="tel"
        placeholder={t("যোগাযোগের মোবাইল নম্বর", "Contact mobile number")}
        className="mt-3 w-full rounded-lg border border-border bg-card p-3 text-xs outline-none"
      />

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        placeholder={t("অতিরিক্ত নির্দেশনা (যেমন: শুধু প্রথম ৩টি ঔষধ দিন)", "Additional instructions (e.g. only give the first 3 medicines)")}
        className="mt-2 w-full rounded-lg border border-border bg-card p-3 text-xs outline-none"
      />

      {isPending && (
        <div className="mt-3 rounded-xl border border-primary/40 bg-primary/5 p-3">
          <p className="flex items-center gap-1.5 text-xs font-bold text-primary">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {phase === "upload"
              ? t("ফাইল আপলোড হচ্ছে...", "Uploading files...")
              : phase === "save"
                ? t("প্রেসক্রিপশন সংরক্ষণ হচ্ছে...", "Saving prescription...")
                : t("ঔষধওয়ালা পড়া শুরু করছে...", "Oushodhwala is starting to read...")}
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${phase === "upload" ? pct : 100}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] font-semibold text-muted-foreground">
            {t.n(done)}/{t.n(picked.length)} {t("ফাইল আপলোড হয়েছে", "files uploaded")} · {t.n(pct)}%
          </p>
          <ul className="mt-2 space-y-1">
            {picked.map((p) => (
              <li key={p.id} className="flex items-center gap-1.5 text-[10px]">
                <span className="truncate">{p.file.name}</span>
                <span className="ml-auto shrink-0 font-semibold">
                  {uploaded[p.id]
                    ? `✓ ${t("সম্পন্ন", "Done")}`
                    : failed.includes(p.id)
                      ? `✕ ${t("ব্যর্থ", "Failed")}`
                      : retrying[p.id]
                        ? t(`রিট্রাই ${retrying[p.id]}/৩`, `Retry ${retrying[p.id]}/3`)
                        : t("চলছে...", "In progress...")}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] text-muted-foreground">
            {t("পেইজটি বন্ধ করবেন না — শেষ হলে রিডিং পেইজে নিয়ে যাওয়া হবে।", "Please don't close the page — you'll be taken to the reading page when done.")}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => (user ? submitPrescription() : setPermOpen(true))}
        className="mt-3 w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        disabled={picked.length === 0 || isPending}
      >
        {isPending
          ? t("জমা হচ্ছে...", "Submitting...")
          : t("জমা দিন — ঔষধওয়ালা পড়ছে", "Submit — Oushodhwala is reading")}
      </button>

      {!user && (
        <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
          {t(
            "জমা দিলে প্রসেসিং শুরুর আগে অনুমতি চাওয়া হবে।",
            "You will be asked for permission before processing starts.",
          )}
        </p>
      )}

      {/* Consent Dialog for Guests */}
      <Dialog open={permOpen} onOpenChange={setPermOpen}>
        <DialogContent className="max-h-[85vh] max-w-sm overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">
              {t("প্রসেসিং-এর অনুমতি দিন", "Allow processing")}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {t(
                "লগইন ছাড়াই চালিয়ে যেতে পারেন। শুরুর আগে জেনে নিন কী কী ডেটা প্রসেস হবে ও কতদিন থাকবে।",
                "You can continue without logging in. Before we start, here is exactly what is processed and for how long.",
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-border bg-secondary/50 p-2.5">
            <p className="text-[11px] font-bold">{t("কী কী প্রসেস হবে", "What is processed")}</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[10px] text-muted-foreground">
              <li>
                {t(
                  `আপনার নির্বাচিত ${picked.length}টি প্রেসক্রিপশন ছবি/PDF`,
                  `Your ${picked.length} selected prescription image(s)/PDF`,
                )}
              </li>
              <li>
                {t(
                  "ছবি থেকে পড়া ঔষধের নাম, ডোজ, সময়কাল ও নির্দেশনা",
                  "Medicine names, dose, duration and instructions read from the image",
                )}
              </li>
              <li>
                {t(
                  "আপনার দেওয়া মোবাইল নম্বর ও অতিরিক্ত নোট (দিলে)",
                  "The mobile number and note you provide (if any)",
                )}
              </li>
              <li>
                {t(
                  "এই ডিভাইসে রাখা একটি গোপন গেস্ট কোড — এটি দিয়েই শুধু আপনি ফলাফল দেখতে পান",
                  "A private guest code stored on this device — only it can open your result",
                )}
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-border bg-secondary/50 p-2.5">
            <p className="text-[11px] font-bold">{t("কতদিন থাকবে", "How long it is kept")}</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[10px] text-muted-foreground">
              <li>
                {t(
                  "ফাইল ও রিডিং ফলাফল ৩০ দিন পর্যন্ত সংরক্ষিত থাকে।",
                  "Files and reading results are kept for up to 30 days.",
                )}
              </li>
              <li>
                {t(
                  'যেকোনো সময় নিজেই "মুছুন" চেপে স্থায়ীভাবে মুছে ফেলতে পারবেন।',
                  'You can permanently delete them anytime with the Delete button.',
                )}
              </li>
              <li>
                {t(
                  "ব্রাউজারের ডেটা মুছে ফেললে গেস্ট কোডও চলে যাবে — তখন ফলাফল আর খোলা যাবে না।",
                  "Clearing browser data removes the guest code — the result can no longer be opened.",
                )}
              </li>
              <li>
                {t(
                  "তথ্য শুধু ঔষধ শনাক্ত ও ফার্মাসিস্ট যাচাইয়ে ব্যবহৃত হয়; বিজ্ঞাপনে দেওয়া হয় না।",
                  "Data is used only for medicine matching and pharmacist verification — never for ads.",
                )}
              </li>
            </ul>
          </div>

          <label className="flex items-start gap-2 text-[11px]">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              {t(
                "আমি উপরের তথ্য পড়েছি এবং আমার প্রেসক্রিপশন পড়া ও যাচাইয়ের অনুমতি দিচ্ছি।",
                "I have read the above and allow my prescription to be read and verified.",
              )}
            </span>
          </label>

          <button
            type="button"
            onClick={allowAndSubmit}
            disabled={!consent || isPending}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {t("অনুমতি দিন ও প্রসেসিং শুরু করুন", "Allow & start processing")}
          </button>
          <Link
            href="/auth"
            className="text-center text-[11px] font-semibold text-primary underline"
          >
            {t("চাইলে লগইন করে সংরক্ষণ করুন", "Optional: log in to save to your account")}
          </Link>
        </DialogContent>
      </Dialog>

      {/* Guest Prescription History on This Device */}
      {!user && (
        <section className="mt-6">
          <h2 className="flex items-center gap-1.5 text-sm font-bold">
            <Smartphone className="h-4 w-4 text-primary" />
            {t("এই ডিভাইসের প্রেসক্রিপশন হিস্ট্রি", "Prescriptions on this device")}
          </h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t(
              "লগইন ছাড়া জমা দেওয়া প্রেসক্রিপশনগুলো এই ডিভাইসের গোপন কোড দিয়ে দেখা যাচ্ছে।",
              "Prescriptions submitted without login, visible via this device's private code.",
            )}
          </p>
          {loadingList ? (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("লোড হচ্ছে...", "Loading...")}
            </p>
          ) : !list || list.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {t("এই ডিভাইসে এখনো কোনো প্রেসক্রিপশন নেই।", "No prescriptions on this device yet.")}
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {list.map((r) => (
                <li key={r.id} className="rounded-xl border border-border bg-card p-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span>📄</span>
                    <span className="font-semibold">
                      {t.n(r.filePaths.length)} {t("টি ফাইল", "file(s)")}
                      {r.medicinesCount > 0 && ` · ${t.n(r.medicinesCount)} ${t("ঔষধ", "medicines")}`}
                    </span>
                    <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold">
                      {r.parsedAt ? t("পড়া হয়েছে", "Read") : t("পড়া হচ্ছে", "Reading")}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString(t.en ? "en-US" : "bn-BD")}
                  </p>
                  {r.adminNote && (
                    <p className="mt-1 text-[11px] font-semibold text-primary">
                      {t("ফার্মাসিস্ট:", "Pharmacist:")} {r.adminNote}
                    </p>
                  )}
                  <Link
                    href={`/prescription/${r.id}`}
                    className="mt-2 block rounded-lg bg-primary py-2 text-center text-[11px] font-bold text-primary-foreground hover:bg-primary/90 transition"
                  >
                    {t("ফলাফল, PDF ও শেয়ার", "Result, PDF & share")}
                  </Link>
                  <div className="mt-1.5 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => void rereadOne(r.id)}
                      disabled={readId === r.id}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-[11px] font-bold hover:bg-secondary transition disabled:opacity-60"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${readId === r.id ? "animate-spin" : ""}`} />
                      {readId === r.id ? t("পড়ছে...", "Reading...") : t("আবার পড়ুন", "Re-read")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeOne(r.id)}
                      disabled={delId === r.id}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-destructive/50 py-2 text-[11px] font-bold text-destructive hover:bg-destructive/10 transition disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {delId === r.id ? t("মুছছে...", "Deleting...") : t("মুছুন", "Delete")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Logged in User Prescriptions List */}
      {user && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-bold">
            {t("আপলোড করা প্রেসক্রিপশন", "Uploaded prescriptions")}
          </h2>
          {!list || list.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("এখনো কোনো প্রেসক্রিপশন আপলোড করা হয়নি।", "No prescriptions uploaded yet.")}
            </p>
          ) : (
            <ul className="space-y-2">
              {list.map((r) => {
                const ageDays = Math.floor(
                  (Date.now() - new Date(r.createdAt).getTime()) / 86400000,
                );
                const expired = ageDays > VALID_DAYS;
                return (
                  <li key={r.id} className="rounded-xl border border-border bg-card p-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span>📄</span>
                      <span className="font-semibold">
                        {t.n(r.filePaths.length)} {t("টি ফাইল", "file(s)")}
                      </span>
                      <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold">
                        {t(STATUS[r.status]?.bn ?? r.status, STATUS[r.status]?.en ?? r.status)}
                      </span>
                    </div>

                    {/* Status timeline */}
                    <div className="mt-2 flex items-center gap-1 text-[9px] font-semibold">
                      <Step label={t("আপলোড", "Uploaded")} done />
                      <Bar done={!!r.parsedAt} />
                      <Step label={t("AI রিডিং", "AI read")} done={!!r.parsedAt} />
                      <Bar done={r.status === "approved" || r.status === "fulfilled"} />
                      <Step
                        label={t("যাচাই", "Verified")}
                        done={r.status === "approved" || r.status === "fulfilled"}
                      />
                      <Bar done={r.status === "fulfilled"} />
                      <Step label={t("অর্ডার", "Order")} done={r.status === "fulfilled"} />
                    </div>

                    <p className="mt-1.5 text-[10px] text-muted-foreground">
                      {new Date(r.createdAt).toLocaleString(t.en ? "en-US" : "bn-BD")}
                      {expired ? (
                        <span className="ml-1.5 font-semibold text-amber-600">
                          ·{" "}
                          {t(
                            `${VALID_DAYS} দিনের বেশি পুরনো — নতুন প্রেসক্রিপশন লাগতে পারে`,
                            `Older than ${VALID_DAYS} days — a fresh prescription may be needed`,
                          )}
                        </span>
                      ) : (
                        <span className="ml-1.5 font-semibold text-primary">
                          · {t("বৈধ", "Valid")} ({t.n(VALID_DAYS - ageDays)}{" "}
                          {t("দিন বাকি", "days left")})
                        </span>
                      )}
                    </p>
                    {r.note && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {t("নোট:", "Note:")} {r.note}
                      </p>
                    )}
                    {r.adminNote && (
                      <p className="mt-1 text-[11px] font-semibold text-primary">
                        {t("ফার্মাসিস্ট:", "Pharmacist:")} {r.adminNote}
                      </p>
                    )}
                    <Link
                      href={`/prescription/${r.id}`}
                      className="mt-2 block rounded-lg bg-primary py-2 text-center text-[11px] font-bold text-primary-foreground hover:bg-primary/90 transition"
                    >
                      {t("ঔষধের দাম ও বিস্তারিত দেখুন", "See medicines, price & details")}
                    </Link>
                    <button
                      type="button"
                      onClick={() => void rereadOne(r.id)}
                      disabled={readId === r.id}
                      className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-[11px] font-bold hover:bg-secondary transition disabled:opacity-60"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${readId === r.id ? "animate-spin" : ""}`} />
                      {readId === r.id
                        ? t("ঔষধওয়ালা পড়ছে...", "Oushodhwala is reading...")
                        : t("আবার পড়ুন", "Re-read")}
                    </button>
                    {r.parsedAt && (
                      <button
                        type="button"
                        onClick={() => quickReorder(r.id)}
                        disabled={busyId === r.id}
                        className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary py-2 text-[11px] font-bold text-primary hover:bg-primary/10 transition disabled:opacity-60"
                      >
                        <Zap className="h-3.5 w-3.5" />
                        {busyId === r.id
                          ? t("কার্টে যোগ হচ্ছে...", "Adding to cart...")
                          : t("এক-ক্লিক রি-অর্ডার (যাচাই ছাড়াই)", "One-click re-order (skip verification)")}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => void removeOne(r.id)}
                      disabled={delId === r.id}
                      className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-destructive/50 py-2 text-[11px] font-bold text-destructive hover:bg-destructive/10 transition disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {delId === r.id
                        ? t("মুছে ফেলা হচ্ছে...", "Deleting...")
                        : t("প্রেসক্রিপশন ও ফলাফল মুছুন", "Delete prescription & results")}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* Data Retention Control for Logged in User */}
      {user && (
        <section className="mt-6 rounded-xl border border-border bg-card p-3">
          <h2 className="flex items-center gap-1.5 text-sm font-bold">
            <ShieldAlert className="h-4 w-4 text-primary" />
            {t("ডাটা রিটেনশন কন্ট্রোল", "Data retention control")}
          </h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t(
              "নির্ধারিত সময় পার হলে আপনার প্রেসক্রিপশনের ফাইল ও এক্সট্র্যাক্টেড ফলাফল স্বয়ংক্রিয়ভাবে মুছে যাবে।",
              "After the chosen period, your prescription files and extracted results are deleted automatically.",
            )}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[0, 30, 90, 180, 365].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setRetDays(d)}
                className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                  retDays === d
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-secondary"
                }`}
              >
                {d === 0 ? t("কখনো নয়", "Never") : `${t.n(d)} ${t("দিন", "days")}`}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            {t(
              "AI রিডিং শেষ হলে ও মেয়াদ শেষের ৫ দিন আগে আপনি ইন-অ্যাপ নোটিফিকেশন পাবেন।",
              "You get an in-app notification when AI reading finishes and 5 days before expiry.",
            )}
          </p>
        </section>
      )}
    </div>
  );
}

function Step({ label, done }: { label: string; done: boolean }) {
  return (
    <span className={done ? "text-primary" : "text-muted-foreground"}>
      {done ? "●" : "○"} {label}
    </span>
  );
}

function Bar({ done }: { done: boolean }) {
  return <span className={`h-px flex-1 ${done ? "bg-primary" : "bg-border"}`} />;
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  RefreshCw,
  ShoppingCart,
  AlertTriangle,
  ChevronDown,
  Check,
  CheckCheck,
  PackageX,
  Zap,
  Pencil,
  Minus,
  Plus,
  FileText,
  Share2,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { ProductImage } from "@/components/ProductImage";
import { BrandLogo } from "@/components/BrandLogo";
import { MedSections, type MedSection } from "@/components/MedSections";
import { cleanMedText, dedupeSections } from "@/lib/medtext";
import { MedicinePicker, type PickedProduct } from "@/components/MedicinePicker";
import { RxInteractions } from "@/components/RxInteractions";
import { RxShareManager } from "@/components/RxShareManager";
import { RxVersions, type RxVersion } from "@/components/RxVersions";
import { printRxSummary, rxSummaryText, type RxSummary } from "@/lib/rx-summary";
import { getGuestToken } from "@/lib/rx-guest";
import {
  getPrescriptionById,
  runPrescriptionAiOcr,
  savePrescriptionEdits,
  deletePrescription,
} from "@/server/actions/prescriptions";
import {
  matchPrescriptionMedicines,
  type MatchedRxItem,
  type MatchedProduct,
} from "@/server/actions/prescription-matcher";
import type { RxExtractedData, RxExtractedItem } from "@/server/ai/gateway";

/** প্রেসক্রিপশন থেকে অর্ডারে ঔষধওয়ালার নির্ধারিত ১০% ছাড় */
const RX_DISCOUNT = 0.1;

type Sel = { match: number; qty: number; skip: boolean };
const DEF_SEL: Sel = { match: 0, qty: 1, skip: false };

type RxMeta = {
  hospital: string;
  doctorName: string;
  doctorQualification: string;
  patientName: string;
  patientAge: string;
  patientAddress: string;
  date: string;
  advice: string;
};

const EMPTY_META: RxMeta = {
  hospital: "",
  doctorName: "",
  doctorQualification: "",
  patientName: "",
  patientAge: "",
  patientAddress: "",
  date: "",
  advice: "",
};

const selKey = (id: string) => `rx-sel-${id}`;
const stepKey = (id: string) => `rx-verified-${id}`;

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const emptyItem = (): RxExtractedItem => ({
  name: "",
  generic: "",
  strength: "",
  form: "Tablet",
  dose: "",
  duration: "",
  instruction: "",
  confidence: 1,
});

export type RxErrors = {
  meta: Partial<Record<keyof RxMeta, string>>;
  items: Record<string, string>;
};

function validateRx(meta: RxMeta, items: RxExtractedItem[], en: boolean): RxErrors {
  const tr = (bn: string, eng: string) => (en ? eng : bn);
  const m: RxErrors["meta"] = {};
  const it: Record<string, string> = {};

  if (!meta.doctorName.trim()) m.doctorName = tr("ডাক্তারের নাম লিখুন", "Doctor name is required");
  else if (meta.doctorName.trim().length < 3)
    m.doctorName = tr("নামটি খুব ছোট — অন্তত ৩ অক্ষর", "Name is too short — at least 3 characters");

  items.forEach((x, i) => {
    if (!x.name.trim()) it[`${i}.name`] = tr("ঔষধের নাম দিন", "Medicine name is required");
  });

  return { meta: m, items: it };
}

const errCount = (e: RxErrors) => Object.keys(e.meta).length + Object.keys(e.items).length;

export default function PrescriptionReadingPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const t = useT();
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const { add } = useStore();

  const [guestToken, setGuestToken] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<"verify" | "details">("verify");

  const [meta, setMeta] = useState<RxMeta>(EMPTY_META);
  const [draft, setDraft] = useState<RxExtractedItem[] | null>(null);
  const [base, setBase] = useState<RxExtractedItem[] | null>(null);
  const [matchedItems, setMatchedItems] = useState<MatchedRxItem[]>([]);
  const [sel, setSel] = useState<Record<number, Sel>>({});

  const [dirty, setDirty] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [savedAt, setSavedAt] = useState("");
  const [saveErr, setSaveErr] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  const initRef = useRef(false);

  useEffect(() => {
    setGuestToken(getGuestToken());
  }, []);

  const {
    data: rxRecord,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["rx-detail", id, user ? "user" : "guest", guestToken],
    enabled: !!id,
    queryFn: async () => {
      const res = await getPrescriptionById(id, guestToken || undefined);
      if (!res) throw new Error(t("প্রেসক্রিপশন পাওয়া যায়নি", "Prescription not found"));
      return res;
    },
  });

  // Extract parsed structured data
  const parsedData = useMemo(() => {
    if (!rxRecord) return null;
    const rawOcr = rxRecord.ocrJson;
    const ocrObj =
      typeof rawOcr === "string"
        ? (() => {
            try {
              return JSON.parse(rawOcr);
            } catch {
              return null;
            }
          })()
        : rawOcr;
    const parsed =
      (ocrObj && typeof ocrObj === "object"
        ? (("data" in ocrObj
            ? (ocrObj as { data?: RxExtractedData }).data
            : ocrObj) as RxExtractedData)
        : null) || null;
    return parsed;
  }, [rxRecord]);

  const auditRows: RxVersion[] = useMemo(() => {
    if (!rxRecord?.ocrJson) return [];
    const rawOcr = rxRecord.ocrJson;
    const ocrObj =
      typeof rawOcr === "string"
        ? (() => {
            try {
              return JSON.parse(rawOcr);
            } catch {
              return null;
            }
          })()
        : rawOcr;
    if (ocrObj && typeof ocrObj === "object" && "auditHistory" in ocrObj) {
      return (ocrObj as { auditHistory: RxVersion[] }).auditHistory || [];
    }
    return [];
  }, [rxRecord]);

  // Initial populate of state from parsed OCR data
  useEffect(() => {
    if (!parsedData || initRef.current) return;
    initRef.current = true;

    const initialMeta: RxMeta = {
      hospital: parsedData.hospital || "",
      doctorName: parsedData.doctorName || "",
      doctorQualification: "",
      patientName: parsedData.patientName || "",
      patientAge: parsedData.patientAge || "",
      patientAddress: "",
      date: parsedData.date || "",
      advice: parsedData.advice || "",
    };
    setMeta(initialMeta);

    const items = parsedData.items && parsedData.items.length > 0 ? parsedData.items : [];
    setDraft(items.map((x) => ({ ...x })));
    setBase(items.map((x) => ({ ...x })));

    const savedSel = loadJson<Record<number, Sel>>(selKey(id), {});
    const nextSel: Record<number, Sel> = {};
    items.forEach((_, i) => {
      nextSel[i] = savedSel[i] ?? { ...DEF_SEL };
    });
    setSel(nextSel);

    const savedStep = loadJson<boolean>(stepKey(id), false);
    if (savedStep) setStep("details");
  }, [parsedData, id]);

  // Match items against catalog when draft items change
  useEffect(() => {
    let cancelled = false;
    if (!draft || draft.length === 0) {
      setMatchedItems([]);
      return;
    }

    (async () => {
      try {
        const matches = await matchPrescriptionMedicines(draft);
        if (!cancelled) {
          setMatchedItems(matches);
        }
      } catch (e) {
        console.error("Match error:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [draft]);

  // Save selections to localStorage
  useEffect(() => {
    if (typeof window === "undefined" || !id) return;
    window.localStorage.setItem(selKey(id), JSON.stringify(sel));
  }, [sel, id]);

  const setSelAt = (i: number, s: Partial<Sel>) =>
    setSel((p) => ({ ...p, [i]: { ...(p[i] ?? DEF_SEL), ...s } }));

  const touch = () => {
    setDirty(true);
    setSaveErr("");
  };

  const patchMeta = (patch: Partial<RxMeta>) => {
    setMeta((m) => ({ ...m, ...patch }));
    touch();
  };

  const patchItem = (i: number, patch: Partial<RxExtractedItem>) => {
    setDraft((d) => d?.map((x, j) => (j === i ? { ...x, ...patch } : x)) ?? d);
    touch();
  };

  const addRow = () => {
    setDraft((d) => [...(d ?? []), emptyItem()]);
    setSel((p) => ({ ...p, [(draft?.length ?? 0)]: { ...DEF_SEL } }));
    touch();
    setShowErrors(true);
  };

  const removeRow = (i: number) => {
    const gone = draft?.[i];
    const goneSel = sel[i] ?? DEF_SEL;
    setDraft((d) => d?.filter((_, j) => j !== i) ?? d);
    setSel((p) => {
      const next: Record<number, Sel> = {};
      Object.keys(p)
        .map(Number)
        .sort((a, b) => a - b)
        .forEach((k) => {
          if (k === i) return;
          next[k > i ? k - 1 : k] = p[k]!;
        });
      return next;
    });
    touch();
    if (gone) {
      toast(t("লাইন মুছে ফেলা হয়েছে", "Line removed"), {
        action: {
          label: t("ফিরিয়ে আনুন", "Undo"),
          onClick: () => {
            setDraft((d) => {
              const arr = [...(d ?? [])];
              arr.splice(i, 0, gone);
              return arr;
            });
            setSel((p) => {
              const next: Record<number, Sel> = { [i]: goneSel };
              Object.keys(p)
                .map(Number)
                .forEach((k) => (next[k >= i ? k + 1 : k] = p[k]!));
              return next;
            });
            touch();
          },
        },
      });
    }
  };

  const pickProduct = (i: number, p: PickedProduct) => {
    patchItem(i, {
      name: p.name,
      generic: p.generic || "",
      strength: p.strength || "",
      form: p.dosageForm || "Tablet",
    });
    setSelAt(i, { match: 0, skip: false });
  };

  const includeAll = () => {
    setSel((p) => {
      const next: Record<number, Sel> = {};
      (draft ?? []).forEach((_, i) => (next[i] = { ...(p[i] ?? DEF_SEL), skip: false }));
      return next;
    });
    toast.success(t("সব ঔষধ অর্ডারে যুক্ত", "All medicines included"));
  };

  const excludeUnavailable = () => {
    let n = 0;
    setSel((p) => {
      const next: Record<number, Sel> = { ...p };
      matchedItems.forEach((row, i) => {
        const cur = next[i] ?? DEF_SEL;
        const match = cur.match === 0 ? row.matchedProduct : row.alternatives[cur.match - 1];
        if (!match || match.stock <= 0) {
          if (!cur.skip) n++;
          next[i] = { ...cur, skip: true };
        }
      });
      return next;
    });
    toast.success(
      n
        ? t(`${t.n(n)}টি অপ্রাপ্য ঔষধ বাদ দেওয়া হয়েছে`, `${n} unavailable item(s) excluded`)
        : t("সব ঔষধই পাওয়া যাচ্ছে", "Everything is available"),
    );
  };

  const errors = useMemo(() => validateRx(meta, draft ?? [], t.en), [meta, draft, t.en]);
  const errTotal = errCount(errors);

  const diffChanges = () => {
    if (!draft || !base) return [];
    const fields: Array<[keyof RxExtractedItem, string]> = [
      ["name", t("ব্র্যান্ড", "Brand")],
      ["generic", t("জেনেরিক", "Generic")],
      ["strength", t("মাত্রা", "Strength")],
      ["form", t("ফর্ম", "Form")],
      ["dose", t("সেবনবিধি", "Frequency")],
      ["duration", t("সময়কাল", "Duration")],
      ["instruction", t("নির্দেশনা", "Timing")],
    ];
    const out: Array<{ line: number; medicine: string; field: string; from: string; to: string }> =
      [];
    draft.forEach((it, i) => {
      const b = base[i];
      const label = it.name || `#${i + 1}`;
      for (const [f, fl] of fields) {
        const from = String(b?.[f] ?? "");
        const to = String(it[f] ?? "");
        if (b && from !== to) {
          out.push({ line: i + 1, medicine: label, field: fl, from: from || "—", to: to || "—" });
        }
      }
    });
    return out;
  };

  const persist = useCallback(
    async (silent: boolean) => {
      if (!draft) return false;
      const v = validateRx(meta, draft, t.en);
      if (errCount(v) > 0) {
        setShowErrors(true);
        if (!silent) {
          toast.error(
            t(
              `${errCount(v)}টি ঘর ঠিক করা দরকার — লাল লেখা দেখুন`,
              `${errCount(v)} field(s) need fixing — see the red messages`,
            ),
          );
        }
        return false;
      }

      setAutoSaving(true);
      try {
        await savePrescriptionEdits(
          id,
          {
            meta,
            items: draft,
            changes: diffChanges(),
          },
          user ? undefined : guestToken,
        );

        setBase(draft.map((x) => ({ ...x })));
        setDirty(false);
        setSaveErr("");
        setSavedAt(new Date().toISOString());
        if (typeof window !== "undefined") {
          window.localStorage.setItem(`rx-draft-${id}`, JSON.stringify({ meta, items: draft }));
        }
        await qc.invalidateQueries({ queryKey: ["rx-detail", id] });
        if (!silent) toast.success(t("সংরক্ষিত হয়েছে", "Saved"));
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Save failed";
        setSaveErr(msg);
        if (!silent) toast.error(msg);
        return false;
      } finally {
        setAutoSaving(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, draft, meta, user, guestToken, t.en],
  );

  // Auto-save debounce
  useEffect(() => {
    if (!dirty || errTotal > 0) return;
    const timer = setTimeout(() => {
      void persist(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [dirty, errTotal, persist]);

  const confirmStep1 = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await persist(true);
      setStep("details");
      if (typeof window !== "undefined") window.localStorage.setItem(stepKey(id), "true");
      toast.success(
        t(
          "যাচাই সম্পন্ন — দাম ও বিস্তারিত দেখানো হচ্ছে",
          "Verified — showing prices and details",
        ),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error confirming");
    } finally {
      setSaving(false);
    }
  };

  const order = useMemo(() => {
    const lines: Array<{ p: MatchedProduct; qty: number }> = [];
    matchedItems.forEach((row, i) => {
      const s = sel[i] ?? DEF_SEL;
      if (s.skip) return;
      const p = s.match === 0 ? row.matchedProduct : row.alternatives[s.match - 1];
      if (!p) return;
      lines.push({ p, qty: s.qty });
    });
    const total = lines.reduce((a, l) => a + l.p.price * l.qty, 0);
    const discount = Math.round(total * RX_DISCOUNT);
    return {
      lines,
      total,
      discount,
      payable: total - discount,
      mrp: lines.reduce((a, l) => a + (l.p.mrp || l.p.price) * l.qty, 0),
    };
  }, [matchedItems, sel]);

  const interactionMeds = useMemo(() => {
    const src = draft ?? [];
    return src
      .map((it, i) => {
        const s = sel[i] ?? DEF_SEL;
        if (s.skip) return null;
        const row = matchedItems[i];
        const p = s.match === 0 ? row?.matchedProduct : row?.alternatives[s.match - 1];
        return {
          name: p?.name || it.name,
          generic: p?.generic || it.generic,
          strength: p?.strength || it.strength,
        };
      })
      .filter(Boolean) as Array<{ name: string; generic: string; strength: string }>;
  }, [draft, matchedItems, sel]);

  const addAll = (checkout = false) => {
    if (order.lines.length === 0) {
      toast.error(t("কোনো ঔষধ নির্বাচন করা হয়নি", "No medicine selected"));
      return;
    }
    order.lines.forEach((l) =>
      add(
        {
          id: l.p.id,
          kind: "product",
          name: l.p.name,
          price: l.p.price,
          mrp: l.p.mrp ?? l.p.price,
        },
        l.qty,
      ),
    );
    if (checkout) {
      toast.success(t("অর্ডারে এগোচ্ছি...", "Proceeding to checkout..."));
      router.push("/checkout");
      return;
    }
    toast.success(t("সব ঔষধ কার্টে যোগ হয়েছে", "All medicines added to cart"));
  };

  const buildSummary = (): RxSummary | null => {
    if (!draft) return null;
    return {
      id,
      patientName: meta.patientName,
      patientAge: meta.patientAge,
      patientAddress: meta.patientAddress,
      hospital: meta.hospital,
      doctorQualification: meta.doctorQualification,
      doctorName: meta.doctorName,
      date: meta.date,
      advice: meta.advice,
      note: rxRecord?.note || "",
      verifiedAt: rxRecord?.parsedAt || new Date().toISOString(),
      total: order.payable,
      lines: draft.map((item, i) => {
        const s = sel[i] ?? DEF_SEL;
        const row = matchedItems[i];
        const p = s.match === 0 ? row?.matchedProduct : row?.alternatives[s.match - 1];
        return {
          no: i + 1,
          name: p ? p.name : item.name,
          generic: p?.generic || item.generic || "",
          strength: p?.strength || item.strength || "",
          form: p?.form || item.form || "Tablet",
          pack: p?.form || "",
          dose: item.dose || "",
          duration: item.duration || "",
          instruction: item.instruction || "",
          qty: s.qty,
          price: p?.price ?? 0,
          confidence: item.confidence || 1,
          excluded: s.skip,
        };
      }),
    };
  };

  const exportPdf = () => {
    const s = buildSummary();
    if (!s) return;
    if (!printRxSummary(s, { en: t.en, n: t.n })) {
      toast.error(t("পপ-আপ ব্লক করা আছে — অনুমতি দিন", "Pop-up blocked — please allow pop-ups"));
    }
  };

  const shareSummary = async () => {
    const s = buildSummary();
    if (!s) return;
    const text = rxSummaryText(s, { en: t.en, n: t.n });
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: t("প্রেসক্রিপশন সারাংশ", "Prescription summary"), text });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast.success(t("সারাংশ কপি হয়েছে", "Summary copied"));
    } catch {
      // ignore
    }
  };

  const handleReread = async () => {
    setRefreshing(true);
    try {
      await runPrescriptionAiOcr(id, user ? undefined : guestToken);
      initRef.current = false;
      await refetch();
      toast.success(t("আবার পড়া হয়েছে", "Re-read complete"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Re-read failed");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="pb-32 pt-4">
      {/* Top navigation */}
      <div className="flex items-center gap-2">
        <Link
          href="/prescription"
          className="text-[11px] font-semibold text-muted-foreground hover:text-primary transition"
        >
          ← {t("প্রেসক্রিপশন আপলোড", "Prescription upload")}
        </Link>
        <button
          type="button"
          onClick={handleReread}
          disabled={refreshing || isLoading}
          className="ml-auto flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-[11px] font-bold hover:bg-secondary transition disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {t("আবার পড়ুন", "Re-read")}
        </button>
      </div>

      <h1 className="mt-3 text-base font-bold">{t("প্রেসক্রিপশন রিডিং", "Prescription reading")}</h1>

      {/* Step Pills */}
      <ol className="mt-3 flex items-center gap-2 text-[11px] font-bold">
        <StepPill
          active={step === "verify"}
          done={step === "details"}
          n={1}
          label={t("যাচাই ও সম্পাদনা", "Verify & edit")}
        />
        <span className="h-px flex-1 bg-border" />
        <StepPill
          active={step === "details"}
          done={false}
          n={2}
          label={t("দাম ও বিস্তারিত", "Prices & details")}
        />
      </ol>

      {isLoading && (
        <p className="mt-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          {t(
            "ঔষধওয়ালা পড়ছে... কিছুক্ষণ অপেক্ষা করুন।",
            "Oushodhwala is reading... please wait.",
          )}
        </p>
      )}

      {error && (
        <div className="mt-6 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
          <p className="flex items-start gap-2 text-[12px] font-bold text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {t("প্রেসক্রিপশনটি পড়া যায়নি", "Could not read the prescription")}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {error instanceof Error ? error.message : "Error"}
          </p>
          <button
            type="button"
            onClick={handleReread}
            disabled={refreshing}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-[11px] font-bold text-primary-foreground disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {t("আবার পড়ুন", "Re-read")}
          </button>
        </div>
      )}

      {rxRecord && draft && (
        <>
          {/* Metadata Card */}
          <section className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
            <Field t={t("হাসপাতাল / চেম্বার", "Hospital")} v={meta.hospital || "—"} />
            <Field t={t("ডাক্তার", "Doctor")} v={meta.doctorName || "—"} />
            <Field t={t("রোগী", "Patient")} v={meta.patientName || "—"} />
            <Field t={t("বয়স", "Age")} v={meta.patientAge || "—"} />
            <Field t={t("ঠিকানা", "Address")} v={meta.patientAddress || "—"} />
            <Field t={t("তারিখ", "Date")} v={meta.date || "—"} />
            <Field t={t("শনাক্ত ঔষধ", "Medicines found")} v={t.n(draft.length)} />
            <Field t={t("রিডিং আইডি", "Reading ID")} v={id.slice(0, 8)} />
          </section>

          <p className="mt-3 flex items-start gap-2 rounded-lg bg-secondary p-3 text-[11px] text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
            <span>
              {rxRecord.note ||
                t(
                  "হাতের লেখা পড়ায় ভুল হতে পারে — অর্ডার করার আগে প্রতিটি ঔষধ যাচাই করে নিন।",
                  "Handwriting can be misread — please verify every medicine before ordering.",
                )}
            </span>
          </p>

          {draft.length === 0 ? (
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {t(
                  "কোনো ঔষধ শনাক্ত করা যায়নি। স্পষ্ট ছবি আপলোড করে আবার চেষ্টা করুন।",
                  "No medicine could be detected. Please upload a clearer photo.",
                )}
              </p>
              <button
                type="button"
                onClick={addRow}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:bg-secondary transition"
              >
                <Plus className="h-3.5 w-3.5" />{" "}
                {t("হাতে ঔষধ যোগ করুন", "Add medicine manually")}
              </button>
            </div>
          ) : step === "verify" ? (
            <>
              <p className="mt-4 text-xs text-muted-foreground">
                {t(
                  "প্রতিটি ঔষধের নাম, জেনেরিক, মাত্রা, প্যাক ও সেবনবিধি যাচাই করুন — প্রয়োজনে সম্পাদনা করুন। পরিবর্তন নিজে থেকেই সেভ হয়ে যায়।",
                  "Check each medicine's brand, generic, strength, pack and dosage — edit if needed. Changes save automatically.",
                )}
              </p>

              {/* Save Bar */}
              <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-muted-foreground">
                    {autoSaving
                      ? t("সেভ হচ্ছে...", "Saving...")
                      : dirty
                        ? t("পরিবর্তন সেভ হয়নি", "Unsaved changes")
                        : savedAt
                          ? t("স্বয়ংক্রিয়ভাবে সংরক্ষিত", "Auto-saved")
                          : t("সংরক্ষিত", "Saved")}
                  </span>
                  {showErrors && errTotal > 0 && (
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 font-bold text-destructive">
                      {t.n(errTotal)} {t("টি ত্রুটি", "error(s)")}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void persist(false)}
                    disabled={autoSaving}
                    className="rounded-lg bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50"
                  >
                    {t("সংরক্ষণ করুন", "Save")}
                  </button>
                  <button
                    type="button"
                    onClick={exportPdf}
                    className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold hover:bg-secondary transition"
                  >
                    {t("প্রিন্ট", "Print")}
                  </button>
                </div>
              </div>

              {/* Meta Editor */}
              <MetaEditor
                meta={meta}
                onChange={patchMeta}
                errors={showErrors ? errors.meta : {}}
              />

              {/* Quick Actions */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={includeAll}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[11px] font-bold hover:bg-secondary transition"
                >
                  <CheckCheck className="h-3.5 w-3.5" /> {t("সব যুক্ত করুন", "Include all")}
                </button>
                <button
                  type="button"
                  onClick={excludeUnavailable}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[11px] font-bold hover:bg-secondary transition"
                >
                  <PackageX className="h-3.5 w-3.5" />{" "}
                  {t("অপ্রাপ্য বাদ দিন", "Exclude unavailable")}
                </button>
                <button
                  type="button"
                  onClick={addRow}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[11px] font-bold hover:bg-secondary transition"
                >
                  <Plus className="h-3.5 w-3.5" /> {t("নতুন ঔষধ", "Add medicine")}
                </button>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {t.n(order.lines.length)} {t("অর্ডারে", "in order")}
                </span>
              </div>

              {/* Rx Table */}
              <ul className="mt-3 space-y-3">
                {draft.map((item, i) => (
                  <li
                    key={i}
                    className="rounded-xl border border-border bg-card p-3 shadow-xs space-y-2"
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        {t.n(i + 1)}
                      </span>
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] font-semibold text-muted-foreground">
                            {t("ঔষধের নাম", "Medicine Name")} *
                          </span>
                          <input
                            value={item.name}
                            onChange={(e) => patchItem(i, { name: e.target.value })}
                            placeholder={t("যেমন: Napa 500mg", "e.g. Napa 500mg")}
                            className={`w-full rounded-lg border px-2.5 py-1.5 text-xs font-semibold outline-none ${
                              showErrors && errors.items[`${i}.name`]
                                ? "border-destructive text-destructive"
                                : "border-border bg-background"
                            }`}
                          />
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold text-muted-foreground">
                            {t("জেনেরিক নাম", "Generic")}
                          </span>
                          <input
                            value={item.generic || ""}
                            onChange={(e) => patchItem(i, { generic: e.target.value })}
                            placeholder={t("যেমন: Paracetamol", "e.g. Paracetamol")}
                            className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold outline-none"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          {t("মাত্রা", "Strength")}
                        </span>
                        <input
                          value={item.strength || ""}
                          onChange={(e) => patchItem(i, { strength: e.target.value })}
                          placeholder="500 mg"
                          className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          {t("ফর্ম", "Form")}
                        </span>
                        <input
                          value={item.form || ""}
                          onChange={(e) => patchItem(i, { form: e.target.value })}
                          placeholder="Tablet"
                          className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          {t("সেবনবিধি", "Dose")}
                        </span>
                        <input
                          value={item.dose || ""}
                          onChange={(e) => patchItem(i, { dose: e.target.value })}
                          placeholder="1+0+1"
                          className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          {t("সময়কাল", "Duration")}
                        </span>
                        <input
                          value={item.duration || ""}
                          onChange={(e) => patchItem(i, { duration: e.target.value })}
                          placeholder="7 days"
                          className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs"
                        />
                      </div>
                    </div>

                    {/* Catalog Picker Integration */}
                    <div className="pt-2 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="text-[11px] text-muted-foreground">
                        {matchedItems[i]?.matchedProduct ? (
                          <span className="text-primary font-semibold flex items-center gap-1">
                            ✓ {t("ক্যাটালগ মিল:", "Catalog match:")}{" "}
                            {matchedItems[i].matchedProduct!.name} (৳
                            {t.n(matchedItems[i].matchedProduct!.price)})
                          </span>
                        ) : (
                          <span className="text-amber-600 font-medium">
                            {t("ক্যাটালগে কোনো মিল পাওয়া যায়নি", "No catalog match")}
                          </span>
                        )}
                      </div>
                      <MedicinePicker
                        value={item.name}
                        onChange={(v) => patchItem(i, { name: v })}
                        onPick={(p) => pickProduct(i, p)}
                        genericHint={item.generic}
                        placeholder={t("বিকল্প ব্র্যান্ড নির্বাচন...", "Pick brand...")}
                        className="w-full sm:w-64"
                      />
                    </div>
                  </li>
                ))}
              </ul>

              {/* Sticky bottom bar for Step 1 */}
              <section className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-4 py-3 backdrop-blur shadow-lg">
                <div className="mx-auto flex max-w-3xl items-center gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground">
                      {t("চলতি অর্ডার", "Live order")} · {t.n(order.lines.length)}{" "}
                      {t("আইটেম", "items")}
                      {autoSaving && ` · ${t("সেভ হচ্ছে…", "Saving…")}`}
                    </p>
                    <p className="text-base font-extrabold text-primary">৳{t.n(order.total)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowErrors(true);
                      if (errTotal > 0) {
                        toast.error(
                          t(
                            "আগে লাল চিহ্নিত ঘরগুলো ঠিক করুন",
                            "Please fix the highlighted fields first",
                          ),
                        );
                        return;
                      }
                      void confirmStep1();
                    }}
                    disabled={saving}
                    className="ml-auto flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition disabled:opacity-60"
                  >
                    <Check className="h-4 w-4" />
                    {saving
                      ? t("সেভ হচ্ছে...", "Saving...")
                      : t("নিশ্চিত করে দাম দেখুন", "Confirm & see prices")}
                  </button>
                </div>
              </section>
            </>
          ) : (
            <>
              {/* Step 2: Prices & Details */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep("verify");
                    if (typeof window !== "undefined") window.localStorage.removeItem(stepKey(id));
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[11px] font-bold hover:bg-secondary transition"
                >
                  <Pencil className="h-3.5 w-3.5" /> {t("আবার যাচাই করুন", "Edit verification")}
                </button>
                <button
                  type="button"
                  onClick={exportPdf}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[11px] font-bold hover:bg-secondary transition"
                >
                  <FileText className="h-3.5 w-3.5" /> {t("PDF / প্রিন্ট", "PDF / Print")}
                </button>
                <button
                  type="button"
                  onClick={shareSummary}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[11px] font-bold hover:bg-secondary transition"
                >
                  <Share2 className="h-3.5 w-3.5" /> {t("সারাংশ শেয়ার", "Share summary")}
                </button>
              </div>

              {/* Prescription Sheet Box */}
              <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
                <div className="flex items-center gap-2 border-b border-border bg-secondary/60 px-3 py-2.5">
                  <BrandLogo size={30} />
                  <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                    {t("প্রেসক্রিপশন শিট", "Prescription sheet")}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-px border-b border-border bg-border sm:grid-cols-3">
                  <Field
                    t={t("হাসপাতাল / চেম্বার", "Hospital / chamber")}
                    v={meta.hospital || "—"}
                  />
                  <Field
                    t={t("ডাক্তার", "Doctor")}
                    v={
                      [meta.doctorName, meta.doctorQualification].filter(Boolean).join(", ") || "—"
                    }
                  />
                  <Field t={t("প্রেসক্রিপশনের তারিখ", "Rx date")} v={meta.date || "—"} />
                  <Field t={t("রোগী", "Patient")} v={meta.patientName || "—"} />
                  <Field t={t("বয়স", "Age")} v={meta.patientAge || "—"} />
                  <Field t={t("ঠিকানা", "Address")} v={meta.patientAddress || "—"} />
                </div>

                <ul className="divide-y divide-border">
                  {draft.map((item, i) => {
                    const s = sel[i] ?? DEF_SEL;
                    const row = matchedItems[i];
                    const p = s.match === 0 ? row?.matchedProduct : row?.alternatives[s.match - 1];
                    const name = p ? p.name : item.name;
                    const lineTotal = (p?.price ?? 0) * s.qty;
                    return (
                      <li
                        key={i}
                        className={`px-3 py-2.5 text-[11px] ${s.skip ? "opacity-50" : ""}`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5 text-[10px] font-bold text-muted-foreground">
                            {t.n(i + 1)}.
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold">{name}</p>
                            {p?.manufacturer && (
                              <p className="truncate text-[10px] font-semibold text-primary">
                                {p.manufacturer}
                              </p>
                            )}
                            <p className="truncate text-[10px] text-muted-foreground">
                              {[p?.generic || item.generic, p?.strength || item.strength, p?.form || item.form]
                                .filter(Boolean)
                                .join(" · ") || "—"}
                            </p>
                            <p className="mt-0.5 text-[10px]">
                              <span className="font-semibold">{t("সেবনবিধি", "Dosage")}:</span>{" "}
                              {[item.dose, item.duration, item.instruction].filter(Boolean).join(" · ") ||
                                "—"}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-[10px] text-muted-foreground">
                              {t.n(s.qty)} × ৳{t.n(p?.price ?? 0)}
                            </p>
                            <p className="text-xs font-extrabold">
                              {s.skip ? t("বাদ", "Excluded") : `৳${t.n(lineTotal)}`}
                            </p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <div className="space-y-1 border-t border-border bg-secondary/40 px-3 py-2.5 text-[11px]">
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">{t("সাবটোটাল", "Subtotal")}</span>
                    <span className="font-semibold">৳{t.n(order.total)}</span>
                  </p>
                  <p className="flex justify-between text-primary">
                    <span className="font-semibold">
                      {t("ঔষধওয়ালা ছাড় (১০%)", "Oushodhwala discount (10%)")}
                    </span>
                    <span className="font-bold">− ৳{t.n(order.discount)}</span>
                  </p>
                  <p className="flex justify-between border-t border-border pt-1.5 text-sm">
                    <span className="font-bold">{t("সর্বমোট", "Payable")}</span>
                    <span className="font-extrabold text-primary">৳{t.n(order.payable)}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {t(
                      "ডেলিভারি চার্জ প্রযোজ্য হতে পারে। লাইসেন্সপ্রাপ্ত ফার্মাসিস্ট যাচাইয়ের পর অর্ডার নিশ্চিত হবে।",
                      "Delivery charge may apply. The order is confirmed after licensed pharmacist verification.",
                    )}
                  </p>
                </div>
              </section>

              {/* Medicine Details & Alternatives list */}
              <p className="mt-4 text-[11px] font-bold text-muted-foreground">
                {t("ঔষধের বিস্তারিত ও বিকল্প", "Medicine details & alternatives")}
              </p>
              <ul className="mt-2 space-y-3">
                {draft.map((item, i) => {
                  const s = sel[i] ?? DEF_SEL;
                  const row = matchedItems[i];
                  const p = s.match === 0 ? row?.matchedProduct : row?.alternatives[s.match - 1];
                  const alts = row ? [row.matchedProduct, ...row.alternatives].filter(Boolean) as MatchedProduct[] : [];

                  return (
                    <li
                      key={i}
                      className={`rounded-xl border p-3 ${
                        s.skip
                          ? "border-dashed border-border opacity-60"
                          : "border-border bg-card shadow-xs"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                          {t.n(i + 1)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold">
                            {item.name} {item.strength || ""}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {item.generic ? `${t("জেনেরিক", "Generic")}: ${item.generic} · ` : ""}
                            {item.form || "Tablet"}
                          </p>
                        </div>
                      </div>

                      {(item.dose || item.duration || item.instruction) && (
                        <div className="mt-2 flex flex-wrap gap-1.5 rounded-lg bg-secondary p-2 text-[11px]">
                          {item.dose && (
                            <span className="font-semibold">
                              {t("সেবনবিধি", "Frequency")}:{" "}
                              <span className="font-normal text-muted-foreground">{item.dose}</span>
                            </span>
                          )}
                          {item.duration && (
                            <span className="font-semibold">
                              · {t("সময়কাল", "Duration")}:{" "}
                              <span className="font-normal text-muted-foreground">{item.duration}</span>
                            </span>
                          )}
                          {item.instruction && (
                            <span className="font-semibold">
                              · {t("নির্দেশনা", "Timing")}:{" "}
                              <span className="font-normal text-muted-foreground">{item.instruction}</span>
                            </span>
                          )}
                        </div>
                      )}

                      {!p ? (
                        <p className="mt-2 rounded-lg bg-secondary p-2 text-[11px] text-muted-foreground">
                          {t(
                            "এই ঔষধটি আমাদের ক্যাটালগে পাওয়া যায়নি — ফার্মাসিস্ট বিকল্প জানাবেন।",
                            "Not found in our catalogue — our pharmacist will suggest an alternative.",
                          )}
                        </p>
                      ) : (
                        <>
                          <div className="mt-2 flex gap-3 rounded-lg border border-border p-2">
                            <div className="w-16 shrink-0">
                              <ProductImage
                                src={p.imageUrl}
                                alt={p.name}
                                ratio="square"
                                className="rounded-lg"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-2 text-xs font-bold">{p.name}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {p.generic || "—"} · {p.strength}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {p.manufacturer}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <span className="text-sm font-extrabold text-primary">
                                  ৳{t.n(p.price)}
                                </span>
                                {p.mrp > p.price && (
                                  <span className="text-[11px] text-muted-foreground line-through">
                                    ৳{t.n(p.mrp)}
                                  </span>
                                )}
                                <span
                                  className={`text-[10px] font-semibold ${
                                    p.stock > 0 ? "text-primary" : "text-destructive"
                                  }`}
                                >
                                  {p.stock > 0 ? t("স্টকে আছে", "In stock") : t("স্টক নেই", "Out of stock")}
                                </span>

                                <div className="ml-auto">
                                  <QtyBox qty={s.qty} onQty={(n) => setSelAt(i, { qty: n })} />
                                </div>
                              </div>
                              <p className="mt-1 text-[11px] font-semibold">
                                {t("সাব-টোটাল", "Subtotal")}:{" "}
                                <span className="text-primary">৳{t.n(p.price * s.qty)}</span>
                              </p>
                            </div>
                          </div>

                          {alts.length > 1 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {alts.map((m, altIdx) => (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => setSelAt(i, { match: altIdx })}
                                  className={`rounded-full border px-2 py-1 text-[10px] font-semibold transition ${
                                    altIdx === s.match
                                      ? "border-primary bg-primary/10 text-primary"
                                      : "border-border text-muted-foreground hover:bg-secondary"
                                  }`}
                                >
                                  {m.name} · ৳{t.n(m.price)}
                                </button>
                              ))}
                            </div>
                          )}

                          <label className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
                            <input
                              type="checkbox"
                              checked={s.skip}
                              onChange={(e) => setSelAt(i, { skip: e.target.checked })}
                              className="h-3.5 w-3.5"
                            />
                            {t("অর্ডার থেকে বাদ দিন", "Exclude from order")}
                          </label>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>

              {meta.advice && (
                <section className="mt-5 rounded-xl border border-border bg-card p-3">
                  <h2 className="text-xs font-bold">{t("ডাক্তারের পরামর্শ", "Doctor's advice")}</h2>
                  <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{meta.advice}</p>
                </section>
              )}

              {/* Sticky Bottom Bar for Step 2 */}
              <section className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-4 py-3 backdrop-blur shadow-lg">
                <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground">
                      {t("অর্ডার প্রিভিউ", "Order preview")} · {t.n(order.lines.length)}{" "}
                      {t("আইটেম", "items")} ·{" "}
                      <span className="font-semibold text-primary">
                        {t("১০% ছাড়সহ", "incl. 10% off")}
                      </span>
                    </p>
                    <p className="text-base font-extrabold text-primary">
                      ৳{t.n(order.payable)}
                      {order.total > order.payable && (
                        <span className="ml-2 text-[11px] font-semibold text-muted-foreground line-through">
                          ৳{t.n(order.total)}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => addAll(false)}
                      disabled={order.lines.length === 0}
                      className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-xs font-bold hover:bg-secondary transition disabled:opacity-50"
                    >
                      <ShoppingCart className="h-4 w-4" /> {t("কার্টে যোগ", "Add to cart")}
                    </button>
                    <button
                      type="button"
                      onClick={() => addAll(true)}
                      disabled={order.lines.length === 0}
                      className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50"
                    >
                      <Zap className="h-4 w-4" /> {t("এখনই অর্ডার করুন", "Order now")}
                    </button>
                  </div>
                </div>
              </section>
            </>
          )}

          {/* Interactions Checker */}
          <div className="mt-6">
            <RxInteractions meds={interactionMeds} />
          </div>

          {/* Share Manager */}
          <div className="mt-4">
            <RxShareManager id={id} guestToken={user ? undefined : guestToken} />
          </div>

          {/* Versions History */}
          <div className="mt-4">
            <RxVersions rows={auditRows} />
          </div>

          {!user && (
            <div className="mt-4 rounded-xl border border-border bg-card p-3 text-[11px] text-muted-foreground">
              {t(
                "আপনি লগইন ছাড়া দেখছেন — ফলাফলটি এই ডিভাইসে গোপন কোড দিয়ে সংরক্ষিত। অন্য ডিভাইসে দেখতে বা শেয়ার করতে লগইন করুন।",
                "You are viewing without login — this result is kept on this device with a private code. Log in to view or share it elsewhere.",
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StepPill({
  n,
  label,
  active,
  done,
}: {
  n: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <li
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
        active
          ? "bg-primary/10 text-primary font-bold"
          : done
            ? "bg-secondary text-foreground"
            : "bg-secondary text-muted-foreground"
      }`}
    >
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-background text-[10px]">
        {done ? <Check className="h-3 w-3" /> : n}
      </span>
      {label}
    </li>
  );
}

function Field({ t, v }: { t: string; v: string }) {
  return (
    <div className="min-w-0 bg-card px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t}</p>
      <p className="truncate text-xs font-bold" title={v}>
        {v}
      </p>
    </div>
  );
}

function MetaEditor({
  meta,
  onChange,
  errors = {},
}: {
  meta: RxMeta;
  onChange: (patch: Partial<RxMeta>) => void;
  errors?: Partial<Record<keyof RxMeta, string>>;
}) {
  const t = useT();
  const cells: Array<{ k: keyof RxMeta; label: string; ph: string }> = [
    {
      k: "hospital",
      label: t("হাসপাতাল / চেম্বার", "Hospital / chamber"),
      ph: t("যেমন: ঢাকা মেডিকেল", "e.g. Dhaka Medical"),
    },
    { k: "doctorName", label: t("ডাক্তারের নাম", "Doctor name"), ph: t("ডাঃ ...", "Dr. ...") },
    { k: "doctorQualification", label: t("ডিগ্রি / পদবি", "Qualification"), ph: "MBBS, FCPS" },
    { k: "patientName", label: t("রোগীর নাম", "Patient name"), ph: t("রোগীর নাম", "Patient name") },
    { k: "patientAge", label: t("বয়স", "Age"), ph: t("যেমন: ৩৫ বছর", "e.g. 35 years") },
    { k: "date", label: t("প্রেসক্রিপশনের তারিখ", "Rx date"), ph: t("দিন-মাস-বছর", "dd-mm-yyyy") },
    { k: "patientAddress", label: t("ঠিকানা", "Address"), ph: t("রোগীর ঠিকানা", "Patient address") },
  ];

  return (
    <section className="mt-3 overflow-hidden rounded-xl border border-border">
      <div className="flex items-center gap-2 border-b border-border bg-secondary/60 px-3 py-2">
        <Pencil className="h-3.5 w-3.5 text-primary" />
        <p className="text-[11px] font-bold">
          {t(
            "প্রেসক্রিপশনের তথ্য — প্রয়োজনে ঠিক করুন",
            "Prescription details — correct if needed",
          )}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3">
        {cells.map((c) => (
          <label
            key={c.k}
            className={`block bg-card px-3 py-2 ${
              c.k === "patientAddress" ? "col-span-2 sm:col-span-3" : ""
            }`}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {c.label}
            </span>
            <input
              value={meta[c.k]}
              placeholder={c.ph}
              onChange={(e) => onChange({ [c.k]: e.target.value } as Partial<RxMeta>)}
              aria-invalid={!!errors[c.k]}
              className={`mt-0.5 w-full bg-transparent text-xs font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground/60 ${
                errors[c.k] ? "text-destructive" : ""
              }`}
            />
            {errors[c.k] && (
              <span className="mt-0.5 block text-[10px] font-semibold text-destructive">
                {errors[c.k]}
              </span>
            )}
          </label>
        ))}

        <label className="col-span-2 block bg-card px-3 py-2 sm:col-span-3">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("ডাক্তারের পরামর্শ", "Doctor's advice")}
          </span>
          <textarea
            value={meta.advice}
            rows={2}
            placeholder={t("বিশ্রাম, পরীক্ষা, ফলো-আপ ইত্যাদি", "Rest, tests, follow-up etc.")}
            onChange={(e) => onChange({ advice: e.target.value })}
            className="mt-0.5 w-full resize-y bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"
          />
        </label>
      </div>
    </section>
  );
}

function QtyBox({ qty, onQty }: { qty: number; onQty: (n: number) => void }) {
  const t = useT();
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border">
      <button
        type="button"
        onClick={() => onQty(Math.max(1, qty - 1))}
        className="px-2 py-1.5 hover:bg-secondary transition"
        aria-label={t("কমান", "Decrease")}
      >
        <Minus className="h-3 w-3" />
      </button>
      <input
        inputMode="numeric"
        value={String(qty)}
        onChange={(e) => onQty(Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1))}
        className="w-8 bg-transparent text-center text-xs font-bold outline-none"
      />
      <button
        type="button"
        onClick={() => onQty(qty + 1)}
        className="px-2 py-1.5 hover:bg-secondary transition"
        aria-label={t("বাড়ান", "Increase")}
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}

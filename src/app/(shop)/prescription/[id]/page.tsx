"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  FileText,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Pill,
  Clock,
  Phone,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import {
  getPrescriptionById,
  runPrescriptionAiOcr,
} from "@/server/actions/prescriptions";
import { RxInteractions, type InteractionMed } from "@/components/RxInteractions";
import type { RxExtractedData, RxExtractedItem } from "@/server/ai/gateway";

export default function PrescriptionDetailPage() {
  const t = useT();
  const params = useParams<{ id: string }>();
  const [row, setRow] = useState<Awaited<ReturnType<typeof getPrescriptionById>>>(null);
  const [loading, setLoading] = useState(true);
  const [runningOcr, setRunningOcr] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await getPrescriptionById(params.id);
        if (!cancelled) setRow(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const handleRunAi = async () => {
    if (!row) return;
    setRunningOcr(true);
    try {
      const res = await runPrescriptionAiOcr(row.id);
      setRow((prev) =>
        prev
          ? {
              ...prev,
              ocrText: res.ocrText,
              ocrJson: res.ocrJson,
            }
          : prev,
      );
      toast.success(t("AI প্রেসক্রিপশন রিডিং সম্পন্ন!", "AI Prescription reading completed!"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI OCR failed");
    } finally {
      setRunningOcr(false);
    }
  };

  // Extract structured items if available
  const parsedData: RxExtractedData | null =
    row?.ocrJson && typeof row.ocrJson === "object" && "data" in row.ocrJson
      ? ((row.ocrJson as { data?: RxExtractedData }).data ?? null)
      : row?.ocrJson && typeof row.ocrJson === "object" && "items" in row.ocrJson
        ? (row.ocrJson as unknown as RxExtractedData)
        : null;

  const itemsList: RxExtractedItem[] = parsedData?.items ?? [];

  const rawPaths = row?.filePaths;
  const filePathsList: string[] = Array.isArray(rawPaths)
    ? rawPaths
    : typeof rawPaths === "string"
      ? (() => {
          try {
            const parsed = JSON.parse(rawPaths);
            return Array.isArray(parsed) ? parsed : [rawPaths];
          } catch {
            return rawPaths ? [rawPaths] : [];
          }
        })()
      : [];

  const medsForInteraction: InteractionMed[] = itemsList.map((it) => ({
    name: it.name,
    generic: it.generic,
    strength: it.strength,
  }));

  const statusColor: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    reviewing: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    approved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    rejected: "bg-rose-500/10 text-rose-600 border-rose-500/30",
    fulfilled: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  };

  return (
    <div className="pt-4 pb-12 max-w-4xl mx-auto px-2 sm:px-4">
      <Link
        href="/prescription"
        className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-primary mb-3"
      >
        ← {t("প্রেসক্রিপশন তালিকা", "Prescription list")}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h1 className="text-lg font-bold text-foreground">
            {t("প্রেসক্রিপশন বিস্তারিত", "Prescription Details")}
          </h1>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">#{params.id}</p>
        </div>

        {row && (
          <span
            className={`rounded-full border px-3 py-1 text-xs font-bold capitalize ${
              statusColor[row.status] || "bg-secondary text-foreground"
            }`}
          >
            {row.status}
          </span>
        )}
      </div>

      {loading && (
        <div className="mt-8 text-center text-xs text-muted-foreground">
          {t("লোড হচ্ছে...", "Loading prescription...")}
        </div>
      )}

      {!loading && !row && (
        <div className="mt-8 rounded-2xl border border-border bg-card p-8 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-amber-500 mb-2" />
          <p className="text-sm font-bold text-foreground">
            {t("প্রেসক্রিপশনটি পাওয়া যায়নি বা দেখার অনুমতি নেই।", "Prescription not found or unauthorized.")}
          </p>
        </div>
      )}

      {row && (
        <div className="mt-5 space-y-6">
          {/* Main Info Card */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-4 space-y-2 text-xs">
              <h2 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-primary" />
                {t("মৌলিক তথ্য", "Basic Information")}
              </h2>
              {row.phone && (
                <p className="flex items-center gap-2 text-foreground">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">{t("মোবাইল:", "Mobile:")}</span>
                  <span className="font-semibold">{row.phone}</span>
                </p>
              )}
              {row.note && (
                <div className="rounded-xl bg-secondary/50 p-2.5 mt-2">
                  <span className="text-muted-foreground block text-[11px] font-semibold mb-1">
                    {t("গ্রাহকের নোট:", "Customer Note:")}
                  </span>
                  <p className="text-foreground text-xs leading-relaxed">{row.note}</p>
                </div>
              )}
              {row.adminNote && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-2.5 mt-2">
                  <span className="text-primary block text-[11px] font-bold mb-1">
                    {t("ফার্মাসিস্টের মতামত:", "Pharmacist Note:")}
                  </span>
                  <p className="text-foreground text-xs leading-relaxed">{row.adminNote}</p>
                </div>
              )}
            </div>

            {/* Attached Files Card */}
            <div className="rounded-2xl border border-border bg-card p-4 text-xs">
              <h2 className="font-bold text-sm text-foreground mb-2 flex items-center justify-between">
                <span>{t("সংযুক্ত ফাইলসমূহ", "Attached Documents")}</span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  {filePathsList.length} {t("টি ফাইল", "files")}
                </span>
              </h2>
              {filePathsList.length === 0 ? (
                <p className="text-muted-foreground text-[11px]">{t("কোনো ফাইল নেই", "No files uploaded")}</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {filePathsList.map((p, idx) => {
                    const isImg = p.match(/\.(jpe?g|png|webp)$/i);
                    const clean = p.replace(/^\/+/, "");
                    const link = `/uploads/${clean}`;
                    return (
                      <div key={idx} className="relative rounded-xl border border-border bg-secondary/40 overflow-hidden group">
                        {isImg ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={link}
                            alt="Rx preview"
                            className="h-28 w-full object-cover transition duration-200 group-hover:scale-105"
                          />
                        ) : (
                          <div className="h-28 flex flex-col items-center justify-center p-2 text-center text-[10px] text-muted-foreground font-mono">
                            <FileText className="h-6 w-6 text-primary mb-1" />
                            {p.split("/").pop()}
                          </div>
                        )}
                        <a
                          href={link}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[11px] font-bold gap-1"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          {t("বড় করে দেখুন", "Open")}
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* AI Vision OCR Card */}
          <div className="rounded-2xl border border-primary/30 bg-card p-4 sm:p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <div>
                  <h2 className="text-sm font-bold text-foreground">
                    {t("AI প্রেসক্রিপশন অ্যানালাইসিস (Google Gemini Vision)", "AI Prescription Analysis (Gemini Vision)")}
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    {t("হস্তলিখিত বা মুদ্রিত প্রেসক্রিপশন থেকে স্বয়ংক্রিয় ঔষধ ও ডোজ শনাক্তকরণ", "Automated medication and dosage extraction from prescription scan")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={runningOcr}
                onClick={() => void handleRunAi()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:opacity-95 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${runningOcr ? "animate-spin" : ""}`} />
                {runningOcr ? t("অ্যানালাইজ হচ্ছে...", "Analyzing...") : row.ocrText ? t("পুনরায় স্ক্যান", "Re-analyze") : t("AI স্ক্যান চালান", "Run AI Scan")}
              </button>
            </div>

            {/* Extracted Clinical Metadata */}
            {parsedData && (parsedData.doctorName || parsedData.patientName || parsedData.hospital) && (
              <div className="mt-3 grid gap-2 sm:grid-cols-3 rounded-xl bg-secondary/60 p-3 text-[11px]">
                {parsedData.doctorName && (
                  <div>
                    <span className="text-muted-foreground block">{t("ডাক্তার:", "Doctor:")}</span>
                    <span className="font-bold text-foreground">{parsedData.doctorName}</span>
                  </div>
                )}
                {parsedData.patientName && (
                  <div>
                    <span className="text-muted-foreground block">{t("রোগী:", "Patient:")}</span>
                    <span className="font-bold text-foreground">
                      {parsedData.patientName} {parsedData.patientAge ? `(${parsedData.patientAge})` : ""}
                    </span>
                  </div>
                )}
                {parsedData.hospital && (
                  <div>
                    <span className="text-muted-foreground block">{t("হাসপাতাল / ক্লিনিক:", "Clinic:")}</span>
                    <span className="font-bold text-foreground">{parsedData.hospital}</span>
                  </div>
                )}
              </div>
            )}

            {/* Extracted Medicine Items Table */}
            {itemsList.length > 0 ? (
              <div className="mt-4 overflow-x-auto">
                <h3 className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                  <Pill className="h-4 w-4 text-primary" />
                  {t("শনাক্তকৃত ঔষধসমূহ:", "Identified Medicines:")}
                </h3>
                <table className="w-full text-left text-xs border border-border rounded-xl overflow-hidden">
                  <thead className="bg-secondary text-[11px] font-semibold text-muted-foreground">
                    <tr>
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">{t("ঔষধের নাম", "Medicine Name")}</th>
                      <th className="p-2.5">{t("পাওয়ার / স্ট্রেন্থ", "Strength")}</th>
                      <th className="p-2.5">{t("ডোজ", "Dose")}</th>
                      <th className="p-2.5">{t("সময়কাল", "Duration")}</th>
                      <th className="p-2.5">{t("নির্দেশনা", "Instruction")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {itemsList.map((m, idx) => (
                      <tr key={idx} className="hover:bg-secondary/30 transition">
                        <td className="p-2.5 font-bold text-muted-foreground">{idx + 1}</td>
                        <td className="p-2.5">
                          <p className="font-bold text-foreground">{m.name}</p>
                          {m.generic && <p className="text-[10px] text-muted-foreground">{m.generic}</p>}
                        </td>
                        <td className="p-2.5 font-semibold text-muted-foreground">{m.strength || "—"}</td>
                        <td className="p-2.5 font-mono text-primary font-bold">{m.dose || "—"}</td>
                        <td className="p-2.5 text-muted-foreground">{m.duration || "—"}</td>
                        <td className="p-2.5 text-muted-foreground">{m.instruction || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : row.ocrText ? (
              <div className="mt-3 rounded-xl bg-secondary/50 p-3 text-xs whitespace-pre-line font-mono text-foreground/90 leading-relaxed">
                {row.ocrText}
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground italic">
                {t(
                  "এখনও AI স্ক্যান চালানো হয়নি। উপরের 'AI স্ক্যান চালান' বাটনে চাপুন।",
                  "AI scan has not been performed yet. Click 'Run AI Scan' above.",
                )}
              </p>
            )}

            {parsedData?.advice && (
              <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs">
                <span className="font-bold text-primary block mb-0.5">{t("ডাক্তারের পরামর্শ:", "Doctor's Advice:")}</span>
                <p className="text-foreground">{parsedData.advice}</p>
              </div>
            )}
          </div>

          {/* Drug-Drug Interaction Checker Component */}
          {medsForInteraction.length > 0 && (
            <RxInteractions meds={medsForInteraction} />
          )}
        </div>
      )}
    </div>
  );
}

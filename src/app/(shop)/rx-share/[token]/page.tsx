"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FileText, Lock, TimerOff } from "lucide-react";
import { useT } from "@/lib/i18n";
import { openRxShare } from "@/server/actions/rx-share";

type OpenResult = Awaited<ReturnType<typeof openRxShare>>;

export default function RxSharePage() {
  const t = useT();
  const params = useParams<{ token: string }>();
  const [data, setData] = useState<OpenResult | null>(null);

  useEffect(() => {
    void openRxShare(params.token).then(setData);
  }, [params.token]);

  if (!data) {
    return <p className="pt-16 text-center text-sm text-muted-foreground">{t("লোড হচ্ছে...", "Loading...")}</p>;
  }

  if (!data.ok) {
    const Icon = data.error === "expired" ? TimerOff : Lock;
    const msg: Record<string, [string, string]> = {
      not_found: ["শেয়ার লিংক পাওয়া যায়নি", "Share link not found"],
      revoked: ["এই শেয়ার লিংক বাতিল করা হয়েছে", "This share link was revoked"],
      expired: ["শেয়ার লিংকের মেয়াদ শেষ", "This share link has expired"],
    };
    const [bn, en] = msg[data.error] ?? msg.not_found!;
    return (
      <div className="pt-16 text-center">
        <Icon className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-bold">{t(bn, en)}</p>
        <Link href="/" className="mt-4 inline-block text-xs font-semibold text-primary underline">
          {t("হোমে ফিরুন", "Back home")}
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-4 pb-10 max-w-lg">
      <h1 className="font-display text-lg font-extrabold">{t("শেয়ার্ড প্রেসক্রিপশন", "Shared prescription")}</h1>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {t("মেয়াদ", "Expires")}: {data.expiresAt}
      </p>
      <div className="mt-4 rounded-2xl border border-border bg-card p-4 space-y-2 text-xs">
        <p>
          <span className="text-muted-foreground">{t("স্ট্যাটাস", "Status")}: </span>
          <span className="font-bold">{data.status}</span>
        </p>
        {data.patientName && (
          <p>
            <span className="text-muted-foreground">{t("রোগী", "Patient")}: </span>
            {data.patientName}
          </p>
        )}
        {data.doctorName && (
          <p>
            <span className="text-muted-foreground">{t("ডাক্তার", "Doctor")}: </span>
            {data.doctorName}
          </p>
        )}
        {data.note && <p className="leading-relaxed">{data.note}</p>}
        {data.ocrText && (
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="mb-1 flex items-center gap-1 font-semibold">
              <FileText className="h-3.5 w-3.5" /> OCR
            </p>
            <pre className="whitespace-pre-wrap text-[11px]">{data.ocrText}</pre>
          </div>
        )}
        {!!data.filePaths?.length && (
          <ul className="space-y-1">
            {data.filePaths.map((p) => (
              <li key={p}>
                <a href={`/uploads/${p}`} target="_blank" rel="noreferrer" className="text-primary underline">
                  {p}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

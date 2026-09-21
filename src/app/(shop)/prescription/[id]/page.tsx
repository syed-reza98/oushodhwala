"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useT } from "@/lib/i18n";
import { getPrescriptionById } from "@/server/actions/prescriptions";

export default function PrescriptionDetailPage() {
  const t = useT();
  const params = useParams<{ id: string }>();
  const [row, setRow] = useState<Awaited<ReturnType<typeof getPrescriptionById>>>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="pt-4 pb-10">
      <Link href="/prescription" className="text-[11px] font-semibold text-muted-foreground hover:text-primary">
        ← {t("প্রেসক্রিপশন", "Prescription")}
      </Link>
      <h1 className="mt-3 text-base font-bold">{t("প্রেসক্রিপশন বিস্তারিত", "Prescription details")}</h1>

      {loading && <p className="mt-4 text-xs text-muted-foreground">{t("লোড হচ্ছে...", "Loading...")}</p>}

      {!loading && !row && (
        <p className="mt-4 text-xs text-muted-foreground">{t("পাওয়া যায়নি বা অনুমতি নেই।", "Not found or no access.")}</p>
      )}

      {row && (
        <div className="mt-4 space-y-3 rounded-2xl border border-border bg-card p-4 text-xs">
          <p>
            <span className="text-muted-foreground">{t("আইডি:", "ID:")}</span>{" "}
            <span className="font-mono font-semibold text-navy">{row.id}</span>
          </p>
          <p>
            <span className="text-muted-foreground">{t("স্ট্যাটাস:", "Status:")}</span>{" "}
            <span className="font-semibold">{row.status}</span>
          </p>
          {row.phone && (
            <p>
              <span className="text-muted-foreground">{t("ফোন:", "Phone:")}</span> {row.phone}
            </p>
          )}
          {row.note && (
            <p>
              <span className="text-muted-foreground">{t("নোট:", "Note:")}</span> {row.note}
            </p>
          )}
          <div>
            <p className="font-semibold">{t("ফাইল", "Files")}</p>
            <ul className="mt-1 list-inside list-disc text-muted-foreground">
              {(row.filePaths ?? []).map((p) => (
                <li key={p}>
                  <a href={`/uploads/${p.replace(/^\/+/, "")}`} className="text-primary underline" target="_blank" rel="noreferrer">
                    {p}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

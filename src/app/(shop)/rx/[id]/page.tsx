"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useT } from "@/lib/i18n";

export default function RxPage() {
  const t = useT();
  const params = useParams<{ id: string }>();
  return (
    <div className="pt-4">
      <h1 className="text-base font-bold">{t("প্রেসক্রিপশন লিংক", "Prescription link")}</h1>
      <p className="mt-2 text-xs text-muted-foreground font-mono">{params.id}</p>
      <Link href="/prescription" className="mt-4 inline-block text-xs font-semibold text-primary underline">
        {t("আপলোড পেজে যান", "Go to upload page")}
      </Link>
    </div>
  );
}

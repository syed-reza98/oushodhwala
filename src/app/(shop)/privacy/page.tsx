"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";

export default function PrivacyPage() {
  const t = useT();
  return (
    <div className="pt-4 max-w-3xl">
      <h1 className="text-base font-bold">{t("গোপনীয়তা নীতি", "Privacy policy")}</h1>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {t(
          "আমরা আপনার ব্যক্তিগত তথ্য সুরক্ষিত রাখি এবং শুধুমাত্র অর্ডার, ডেলিভারি ও সাপোর্টের জন্য ব্যবহার করি।",
          "We protect your personal data and use it only for orders, delivery and support.",
        )}
      </p>
      <Link href="/" className="mt-4 inline-block text-xs font-semibold text-primary">
        {t("হোমে ফিরুন", "Back home")}
      </Link>
    </div>
  );
}

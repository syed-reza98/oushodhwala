"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";

export default function TermsPage() {
  const t = useT();
  return (
    <div className="pt-4 prose-sm max-w-3xl">
      <h1 className="text-base font-bold">{t("শর্তাবলি", "Terms of service")}</h1>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {t(
          "ঔষধওয়ালা ব্যবহার করে আপনি আমাদের সেবার শর্তাবলিতে সম্মতি দিচ্ছেন। ঔষধ অর্ডার, প্রেসক্রিপশন যাচাই ও ডেলিভারি সংক্রান্ত নিয়মাবলি প্রযোজ্য।",
          "By using Oushodhwala you agree to our terms of service covering medicine orders, prescription verification and delivery.",
        )}
      </p>
      <Link href="/" className="mt-4 inline-block text-xs font-semibold text-primary">
        {t("হোমে ফিরুন", "Back home")}
      </Link>
    </div>
  );
}

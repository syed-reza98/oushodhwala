"use client";

import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { useT } from "@/lib/i18n";

/** Temporary scaffold — full AI support chat ports in a later wave. */
export function AskChat() {
  const [open, setOpen] = useState(false);
  const t = useT();
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 left-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-navy text-navy-foreground shadow-[var(--shadow-elevated)] lg:bottom-6"
        aria-label={t("সাপোর্ট চ্যাট", "Support chat")}
      >
        <MessageCircle className="h-5 w-5" />
      </button>
      {open && (
        <div className="fixed bottom-40 left-4 z-30 w-[min(92vw,340px)] rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-elevated)] lg:bottom-20">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold">{t("সাপোর্ট", "Support")}</p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t(
              "মাইগ্রেশন চলছে — AI সাপোর্ট চ্যাট শীঘ্রই ফিরে আসবে।",
              "Migration in progress — AI support chat will return soon.",
            )}
          </p>
        </div>
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link2, Copy, Ban, Clock, Share2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import {
  createRxShare,
  listRxShares,
  revokeRxShare,
} from "@/server/actions/rx-share";

const HOURS = [
  { v: 1, bn: "১ ঘণ্টা", en: "1 hour" },
  { v: 24, bn: "১ দিন", en: "1 day" },
  { v: 72, bn: "৩ দিন", en: "3 days" },
  { v: 168, bn: "৭ দিন", en: "7 days" },
  { v: 720, bn: "৩০ দিন", en: "30 days" },
];

export type RxScopes = {
  medicines: boolean;
  dosage: boolean;
  prices: boolean;
  patient: boolean;
  advice: boolean;
};

const DEFAULT_SCOPES: RxScopes = {
  medicines: true,
  dosage: true,
  prices: false,
  patient: false,
  advice: true,
};

const SCOPE_LABELS: Array<{ k: keyof RxScopes; bn: string; en: string }> = [
  { k: "medicines", bn: "ঔষধের তালিকা", en: "Medicine list" },
  { k: "dosage", bn: "সেবনবিধি ও সময়কাল", en: "Dosage & duration" },
  { k: "prices", bn: "দাম", en: "Prices" },
  { k: "patient", bn: "রোগী ও ডাক্তারের নাম", en: "Patient & doctor name" },
  { k: "advice", bn: "পরামর্শ ও নোট", en: "Advice & notes" },
];

export function RxShareManager({
  id,
  guestToken,
}: {
  id: string;
  guestToken?: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState(24);
  const [scopes, setScopes] = useState<RxScopes>({ ...DEFAULT_SCOPES });
  const [busy, setBusy] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const { data: shares, refetch } = useQuery({
    queryKey: ["rx-shares", id],
    enabled: open,
    queryFn: () => listRxShares(id, guestToken),
  });

  const urlOf = (token: string) =>
    typeof window === "undefined" ? "" : `${window.location.origin}/rx-share/${token}`;

  const make = async () => {
    setBusy(true);
    try {
      const s = await createRxShare({
        prescriptionId: id,
        expiresInHours: hours,
        scopes,
        guestToken,
      });
      const url = urlOf(s.token);
      try {
        await navigator.clipboard.writeText(url);
        toast.success(t("লিংক তৈরি ও কপি হয়েছে", "Link created and copied"));
      } catch {
        toast.success(t("লিংক তৈরি হয়েছে", "Link created"));
      }
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("লিংক তৈরি ব্যর্থ", "Share creation failed"));
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async (shareId: string) => {
    if (!confirm(t("এই শেয়ার লিংক বাতিল করতে চান?", "Revoke this share link?"))) return;
    try {
      await revokeRxShare(shareId, guestToken);
      toast.success(t("লিংক বাতিল হয়েছে", "Link revoked"));
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("বাতিল ব্যর্থ", "Revoke failed"));
    }
  };

  const copyUrl = async (token: string) => {
    const url = urlOf(token);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
      toast.success(t("লিংক কপি হয়েছে", "Link copied"));
    } catch {
      toast.error(t("কপি ব্যর্থ", "Copy failed"));
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition shadow-2xs"
      >
        <Share2 className="h-3.5 w-3.5 text-primary" />
        {t("নিরাপদ শেয়ার", "Secure Share")}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              <h2 className="text-base font-bold text-foreground">
                {t("প্রেসক্রিপশন নিরাপদ শেয়ার", "Share Prescription Securely")}
              </h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t(
                "ডাক্তার বা পরিচিতজনের সাথে নির্দিষ্ট মেয়াদের জন্য শেয়ার লিংক তৈরি করুন।",
                "Create an expiring link to share with doctors or family members.",
              )}
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-foreground">{t("লিংকের মেয়াদ", "Expiry")}</label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {HOURS.map((h) => (
                    <button
                      key={h.v}
                      type="button"
                      onClick={() => setHours(h.v)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                        hours === h.v
                          ? "bg-primary text-primary-foreground"
                          : "border border-border bg-secondary/50 text-foreground hover:bg-secondary"
                      }`}
                    >
                      {t(h.bn, h.en)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground">{t("কি কি তথ্য দেখতে পাবে?", "Allowed scopes")}</label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {SCOPE_LABELS.map((sc) => (
                    <label key={sc.k} className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 p-2 text-xs">
                      <input
                        type="checkbox"
                        checked={scopes[sc.k]}
                        onChange={(e) => setScopes((s) => ({ ...s, [sc.k]: e.target.checked }))}
                        className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                      />
                      <span>{t(sc.bn, sc.en)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="button"
                disabled={busy}
                onClick={() => void make()}
                className="w-full rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/95 transition shadow-xs disabled:opacity-50"
              >
                {busy ? t("তৈরি হচ্ছে...", "Generating...") : t("নতুন শেয়ার লিংক তৈরি করুন", "Generate Share Link")}
              </button>
            </div>

            {shares && shares.length > 0 && (
              <div className="mt-5 border-t border-border pt-4">
                <h3 className="text-xs font-bold text-foreground mb-2">
                  {t("সক্রিয় লিংকসমূহ", "Active Links")}
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {shares.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 p-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold">
                            {s.token.slice(0, 10)}...
                          </span>
                          {s.revoked ? (
                            <span className="rounded bg-destructive/10 px-1.5 py-0.2 text-[10px] text-destructive">
                              {t("বাতিলকৃত", "Revoked")}
                            </span>
                          ) : (
                            <span className="rounded bg-emerald-500/10 px-1.5 py-0.2 text-[10px] text-emerald-600">
                              {t("সক্রিয়", "Active")}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" />
                          {t("মেয়াদ শেষ:", "Expires:")} {new Date(s.expiresAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        {!s.revoked && (
                          <>
                            <button
                              type="button"
                              onClick={() => void copyUrl(s.token)}
                              className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                              title={t("কপি করুন", "Copy URL")}
                            >
                              {copiedToken === s.token ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleRevoke(s.id)}
                              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              title={t("বাতিল করুন", "Revoke")}
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

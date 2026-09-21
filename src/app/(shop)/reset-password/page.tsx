"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";
import { resetPasswordWithToken } from "@/server/actions/auth";
import { useT } from "@/lib/i18n";

function ResetPasswordForm() {
  const t = useT();
  const router = useRouter();
  const sp = useSearchParams();
  const token = sp.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!token || password.length < 6) {
      toast.error(t("টোকেন ও নতুন পাসওয়ার্ড (৬+) দিন", "Provide token and new password (6+)"));
      return;
    }
    setBusy(true);
    try {
      const res = await resetPasswordWithToken({ token, password });
      if (!res.ok) throw new Error(res.error);
      toast.success(t("পাসওয়ার্ড আপডেট হয়েছে", "Password updated"));
      router.replace("/auth");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("ব্যর্থ", "Failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md pt-10">
      <h1 className="font-display text-lg font-extrabold">{t("নতুন পাসওয়ার্ড", "New password")}</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        {t("ইমেইলে পাওয়া টোকেন দিয়ে পাসওয়ার্ড রিসেট করুন।", "Reset your password with the token from email.")}
      </p>
      {!token && (
        <p className="mt-3 rounded-lg bg-secondary p-3 text-[11px] text-primary-dark">
          {t("URL-এ ?token=… যোগ করুন বা /auth থেকে রিসেট অনুরোধ করুন।", "Add ?token=… to the URL or request a reset from /auth.")}
        </p>
      )}
      <div className="mt-4 space-y-3 rounded-2xl border border-border bg-card p-4">
        <label className="block text-xs font-semibold">
          {t("নতুন পাসওয়ার্ড", "New password")}
          <span className="mt-1 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent text-xs outline-none"
              placeholder="••••••••"
            />
          </span>
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("পাসওয়ার্ড সেভ করুন", "Save password")}
        </button>
      </div>
      <Link href="/auth" className="mt-4 inline-block text-xs font-semibold text-primary underline">
        {t("লগইনে ফিরুন", "Back to login")}
      </Link>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="pt-16 text-center text-sm text-muted-foreground">Loading…</p>}>
      <ResetPasswordForm />
    </Suspense>
  );
}

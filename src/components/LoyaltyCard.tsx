"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Award, History, ArrowRight } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";

const TIER: Record<string, { bn: string; en: string; emoji: string }> = {
  bronze: { bn: "ব্রোঞ্জ", en: "Bronze", emoji: "🥉" },
  silver: { bn: "সিলভার", en: "Silver", emoji: "🥈" },
  gold: { bn: "গোল্ড", en: "Gold", emoji: "🥇" },
  platinum: { bn: "প্লাটিনাম", en: "Platinum", emoji: "💎" },
};

const NEXT: Record<string, number> = { bronze: 500, silver: 1000, gold: 5000 };

export type LoyaltyAccount = {
  balance: number;
  tier: string;
  pointsEarned: number;
  pointsSpent: number;
  transactions: Array<{
    id: string;
    points: number;
    kind: string;
    orderNo?: string;
    reason?: string;
    createdAt: string;
  }>;
};

export function LoyaltyCard() {
  const t = useT();
  const { user } = useAuth();

  const { data: acc } = useQuery<LoyaltyAccount>({
    queryKey: ["my-loyalty"],
    enabled: !!user,
    queryFn: async () => {
      const res = await fetch("/api/account/loyalty");
      if (!res.ok) throw new Error("Failed to load loyalty");
      return res.json();
    },
  });

  const tier = TIER[acc?.tier?.toLowerCase() ?? "silver"] ?? TIER["silver"]!;
  const earned = acc?.pointsEarned ?? 0;
  const goal = NEXT[acc?.tier?.toLowerCase() ?? "silver"];
  const pct = goal ? Math.min(100, Math.round((earned / goal) * 100)) : 100;
  const tx = acc?.transactions?.slice(0, 5) ?? [];

  return (
    <section className="mt-4 rounded-xl border border-border bg-card p-4 transition hover:border-primary/40">
      <div className="flex items-center gap-2">
        <Award className="h-4 w-4 text-primary" />
        <p className="text-sm font-bold">{t("লয়ালটি পয়েন্ট", "Loyalty points")}</p>
        <span className="ml-auto rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold">
          {tier.emoji} {t(tier.bn, tier.en)}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-secondary/70 p-2">
          <p className="text-base font-bold text-primary">{t.n(acc?.balance ?? 0)}</p>
          <p className="text-[10px] text-muted-foreground">{t("ব্যালেন্স", "Balance")}</p>
        </div>
        <div className="rounded-lg bg-secondary/70 p-2">
          <p className="text-base font-bold">{t.n(earned)}</p>
          <p className="text-[10px] text-muted-foreground">{t("মোট অর্জিত", "Earned")}</p>
        </div>
        <div className="rounded-lg bg-secondary/70 p-2">
          <p className="text-base font-bold">{t.n(acc?.pointsSpent ?? 0)}</p>
          <p className="text-[10px] text-muted-foreground">{t("ব্যবহৃত", "Redeemed")}</p>
        </div>
      </div>

      {goal ? (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t(
              `পরবর্তী টিয়ারে পৌঁছাতে আরও ${t.n(Math.max(0, goal - earned))} পয়েন্ট দরকার`,
              `${Math.max(0, goal - earned)} more points to reach the next tier`,
            )}
          </p>
        </div>
      ) : null}

      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          {t(
            "প্রতি ১০০ টাকার ডেলিভারি সম্পন্ন অর্ডারে ১ পয়েন্ট। ১ পয়েন্ট = ১ টাকা ছাড়।",
            "1 pt per ৳100 on delivered orders. 1 pt = ৳1 discount.",
          )}
        </span>
        <Link
          href="/account/loyalty"
          className="ml-2 inline-flex shrink-0 items-center gap-1 font-semibold text-primary hover:underline"
        >
          {t("বিস্তারিত", "Details")} <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {tx && tx.length > 0 ? (
        <div className="mt-3 border-t border-border pt-2">
          <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
            <History className="h-3 w-3" /> {t("সাম্প্রতিক লেনদেন", "Recent activity")}
          </p>
          <ul className="divide-y divide-border text-xs">
            {tx.map((r) => (
              <li key={r.id} className="flex items-center gap-2 py-1.5">
                <span className="truncate">
                  {r.orderNo ? `#${r.orderNo}` : r.reason || t("সমন্বয়", "Adjustment")}
                  <span className="ml-1 text-[10px] text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </span>
                <span className={`ml-auto font-bold ${r.points >= 0 ? "text-primary" : "text-destructive"}`}>
                  {r.points >= 0 ? "+" : "−"}
                  {t.n(Math.abs(r.points))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

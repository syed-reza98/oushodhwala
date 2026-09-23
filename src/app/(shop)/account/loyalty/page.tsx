"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Award, ArrowUpRight, ArrowDownRight, Clock, ShieldCheck, ChevronRight, Gift } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";

type LoyaltyData = {
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

export default function LoyaltyPage() {
  const t = useT();
  const { user } = useAuth();

  const { data, isLoading, refetch } = useQuery<LoyaltyData>({
    queryKey: ["my-loyalty"],
    enabled: !!user,
    queryFn: async () => {
      const res = await fetch("/api/account/loyalty");
      if (!res.ok) throw new Error("Failed to load loyalty");
      return res.json();
    },
  });

  const tierColors: Record<string, { bg: string; text: string; border: string }> = {
    bronze: { bg: "bg-amber-700/10", text: "text-amber-700", border: "border-amber-700/30" },
    silver: { bg: "bg-slate-500/10", text: "text-slate-600", border: "border-slate-500/30" },
    gold: { bg: "bg-yellow-500/10", text: "text-yellow-600", border: "border-yellow-500/30" },
  };

  const defaultBadge = { bg: "bg-slate-500/10", text: "text-slate-600", border: "border-slate-500/30" };
  const currentTier = (data?.tier || "silver").toLowerCase();
  const currentBadge = tierColors[currentTier] ?? defaultBadge;

  return (
    <div className="pt-4 pb-12 max-w-2xl mx-auto px-2 sm:px-4">
      <Link
        href="/account"
        className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-primary mb-3"
      >
        ← {t("অ্যাকাউন্ট", "Account")}
      </Link>

      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Award className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-base font-bold text-foreground">
              {t("লয়্যালটি ও রিওয়ার্ড পয়েন্ট", "Loyalty & Reward Points")}
            </h1>
            <p className="text-[11px] text-muted-foreground">
              {t("প্রতি অর্ডারে পয়েন্ট অর্জন করুন এবং পরবর্তী অর্ডারে ডিসকাউন্ট নিন", "Earn points on orders & redeem for instant discounts")}
            </p>
          </div>
        </div>
      </div>

      {isLoading && (
        <p className="mt-8 text-center text-xs text-muted-foreground">
          {t("লোড হচ্ছে...", "Loading loyalty details...")}
        </p>
      )}

      {!isLoading && (
        <div className="mt-4 space-y-4">
          {/* Points Balance Card */}
          <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-muted-foreground">
                  {t("বর্তমান পয়েন্ট ব্যালেন্স", "Available Points Balance")}
                </span>
                <p className="text-3xl font-extrabold text-foreground mt-1">
                  {t.n(data?.balance ?? 0)} <span className="text-sm font-normal text-muted-foreground">pts</span>
                </p>
                <p className="text-xs text-primary font-semibold mt-1">
                  ≈ ৳{t.n(data?.balance ?? 0)} {t("সমমূল্য ছাড়", "value at checkout")}
                </p>
              </div>

              <div className="text-right">
                <span
                  className={`inline-block rounded-full border px-3 py-1 text-xs font-bold capitalize ${currentBadge.bg} ${currentBadge.text} ${currentBadge.border}`}
                >
                  {currentTier} Tier
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border/60 pt-3 text-xs">
              <div>
                <span className="text-muted-foreground text-[11px] block">{t("মোট অর্জিত পয়েন্ট", "Total Earned")}</span>
                <span className="font-bold text-foreground">+{t.n(data?.pointsEarned ?? 0)}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-[11px] block">{t("মোট ব্যবহৃত পয়েন্ট", "Total Redeemed")}</span>
                <span className="font-bold text-foreground">-{t.n(data?.pointsSpent ?? 0)}</span>
              </div>
            </div>
          </div>

          {/* How points work notice */}
          <div className="rounded-xl border border-border bg-card p-3.5 text-xs space-y-1.5">
            <p className="font-bold text-foreground flex items-center gap-1.5">
              <Gift className="h-4 w-4 text-primary" />
              {t("কীভাবে রিওয়ার্ড কাজ করে?", "How does it work?")}
            </p>
            <p className="text-muted-foreground leading-relaxed text-[11px]">
              • {t("প্রতি ১০০ টাকা কেনাকাটায় ১ পয়েন্ট জমা হয়।", "Earn 1 point for every ৳100 spent on completed orders.")}
            </p>
            <p className="text-muted-foreground leading-relaxed text-[11px]">
              • {t("চেকআউটের সময় ১ পয়েন্ট = ১ টাকা হারে অর্ডারের ৫০% পর্যন্ত পরিশোধ করতে পারেন।", "1 point = ৳1 discount. Redeem up to 50% of payable amount at checkout.")}
            </p>
          </div>

          {/* Transactions History */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="text-xs font-bold text-foreground mb-3 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {t("পয়েন্ট ব্যবহারের হিস্ট্রি", "Points History")}
            </h2>

            {(!data?.transactions || data.transactions.length === 0) ? (
              <p className="text-center py-6 text-xs text-muted-foreground">
                {t("এখনও কোনো পয়েন্ট লেনদেন হয়নি।", "No loyalty transactions recorded yet.")}
              </p>
            ) : (
              <div className="divide-y divide-border">
                {data.transactions.map((tx) => {
                  const isEarn = tx.points > 0;
                  return (
                    <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`grid h-7 w-7 place-items-center rounded-full ${
                            isEarn ? "bg-emerald-500/10 text-emerald-600" : "bg-sale/10 text-sale"
                          }`}
                        >
                          {isEarn ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">
                            {tx.reason || (isEarn ? t("অর্ডারে পয়েন্ট অর্জন", "Order Points Earned") : t("পয়েন্ট ব্যবহার", "Points Redeemed"))}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {tx.orderNo ? `Order #${tx.orderNo} · ` : ""}
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className={`font-bold ${isEarn ? "text-emerald-600" : "text-sale"}`}>
                        {isEarn ? `+${t.n(tx.points)}` : t.n(tx.points)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

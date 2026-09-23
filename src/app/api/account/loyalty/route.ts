import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { loyaltyAccounts, loyaltyTransactions } from "@/server/db/schema";
import { requireUser } from "@/server/services/authz";

export const dynamic = "force-dynamic";

export async function GET() {
  let user: { id: string };
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const [account] = await db
    .select()
    .from(loyaltyAccounts)
    .where(eq(loyaltyAccounts.userId, user.id))
    .limit(1);

  const txs = await db
    .select()
    .from(loyaltyTransactions)
    .where(eq(loyaltyTransactions.userId, user.id))
    .orderBy(desc(loyaltyTransactions.createdAt))
    .limit(50);

  return NextResponse.json({
    balance: account?.balance ?? 0,
    tier: account?.tier ?? "silver",
    pointsEarned: account?.pointsEarned ?? 0,
    pointsSpent: account?.pointsSpent ?? 0,
    transactions: txs.map((t) => ({
      id: t.id,
      points: t.points,
      kind: t.kind,
      orderNo: t.orderNo,
      reason: t.reason,
      createdAt: t.createdAt,
    })),
  });
}

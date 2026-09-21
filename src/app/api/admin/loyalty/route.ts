import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { loyaltyAccounts, loyaltyTransactions, users } from "@/server/db/schema";
import { requireStaff } from "@/server/services/authz";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const [accounts, txs] = await Promise.all([
    db
      .select({
        userId: loyaltyAccounts.userId,
        pointsEarned: loyaltyAccounts.pointsEarned,
        pointsSpent: loyaltyAccounts.pointsSpent,
        balance: loyaltyAccounts.balance,
        tier: loyaltyAccounts.tier,
        email: users.email,
        name: users.name,
      })
      .from(loyaltyAccounts)
      .leftJoin(users, eq(users.id, loyaltyAccounts.userId))
      .orderBy(desc(loyaltyAccounts.balance))
      .limit(200),
    db.select().from(loyaltyTransactions).orderBy(desc(loyaltyTransactions.createdAt)).limit(100),
  ]);

  return NextResponse.json({
    accounts: accounts.map((a) => ({
      userId: a.userId,
      email: a.email,
      name: a.name,
      pointsEarned: a.pointsEarned,
      pointsSpent: a.pointsSpent,
      balance: a.balance,
      tier: a.tier,
    })),
    transactions: txs.map((t) => ({
      id: t.id,
      userId: t.userId,
      points: t.points,
      kind: t.kind,
      orderNo: t.orderNo,
      reason: t.reason,
      createdAt: t.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const body = (await req.json()) as {
    userId?: string;
    email?: string;
    points?: number;
    kind?: string;
    reason?: string;
    orderNo?: string;
  };

  let userId = body.userId?.trim();
  if (!userId && body.email?.trim()) {
    const [u] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, body.email.trim().toLowerCase()))
      .limit(1);
    userId = u?.id;
  }
  if (!userId || typeof body.points !== "number" || !Number.isFinite(body.points) || body.points === 0) {
    return NextResponse.json({ error: "userId/email and non-zero points required" }, { status: 400 });
  }

  const points = Math.trunc(body.points);
  const kind = body.kind?.trim() || (points > 0 ? "earn" : "spend");

  const balance = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(loyaltyAccounts)
      .where(eq(loyaltyAccounts.userId, userId!))
      .limit(1);
    if (!existing) {
      await tx.insert(loyaltyAccounts).values({
        userId: userId!,
        pointsEarned: Math.max(points, 0),
        pointsSpent: Math.max(-points, 0),
        balance: Math.max(points, 0),
        tier: "silver",
      });
    } else {
      const next = existing.balance + points;
      if (next < 0) throw new Error("INSUFFICIENT");
      await tx
        .update(loyaltyAccounts)
        .set({
          pointsEarned: existing.pointsEarned + Math.max(points, 0),
          pointsSpent: existing.pointsSpent + Math.max(-points, 0),
          balance: next,
          tier: next >= 2000 ? "gold" : next >= 500 ? "silver" : "bronze",
        })
        .where(eq(loyaltyAccounts.userId, userId!));
    }
    await tx.insert(loyaltyTransactions).values({
      id: randomUUID(),
      userId: userId!,
      points,
      kind,
      orderNo: body.orderNo?.trim() || "",
      reason: body.reason?.trim() || "",
    });
    const [acc] = await tx
      .select({ balance: loyaltyAccounts.balance })
      .from(loyaltyAccounts)
      .where(eq(loyaltyAccounts.userId, userId!))
      .limit(1);
    return acc?.balance ?? 0;
  });

  return NextResponse.json({ ok: true, balance });
}

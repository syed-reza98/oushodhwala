import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { refillReminders } from "@/server/db/schema";
import { requireUser } from "@/server/services/authz";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  let user: { id: string };
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const productId = (req.nextUrl.searchParams.get("productId") ?? "").trim();
  if (productId) {
    const [row] = await db
      .select()
      .from(refillReminders)
      .where(and(eq(refillReminders.userId, user.id), eq(refillReminders.productId, productId)))
      .limit(1);

    return NextResponse.json({
      item: row
        ? {
            id: row.id,
            everyDays: row.everyDays,
            nextAt: row.nextAt,
            active: row.active,
          }
        : null,
    });
  }

  const rows = await db
    .select()
    .from(refillReminders)
    .where(eq(refillReminders.userId, user.id));

  return NextResponse.json({
    items: rows.map((r) => ({
      id: r.id,
      productId: r.productId,
      productName: r.productName,
      everyDays: r.everyDays,
      nextAt: r.nextAt,
      active: r.active,
    })),
  });
}

export async function POST(req: NextRequest) {
  let user: { id: string };
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await req.json()) as {
    productId?: string;
    productName?: string;
    everyDays?: number;
  };
  const productId = (body.productId ?? "").trim();
  const productName = (body.productName ?? "").trim();
  const everyDays = Math.min(Math.max(Number(body.everyDays) || 30, 1), 365);
  if (!productId || !productName) {
    return NextResponse.json({ error: "productId/productName required" }, { status: 400 });
  }

  const next = new Date();
  next.setDate(next.getDate() + everyDays);
  const nextAt = next.toISOString().slice(0, 10);

  const [existing] = await db
    .select({ id: refillReminders.id })
    .from(refillReminders)
    .where(and(eq(refillReminders.userId, user.id), eq(refillReminders.productId, productId)))
    .limit(1);

  if (existing) {
    await db
      .update(refillReminders)
      .set({ everyDays, nextAt, productName, active: true })
      .where(eq(refillReminders.id, existing.id));
    return NextResponse.json({ ok: true, id: existing.id, nextAt });
  }

  const id = randomUUID();
  await db.insert(refillReminders).values({
    id,
    userId: user.id,
    productId,
    productName,
    everyDays,
    nextAt,
    active: true,
  });
  return NextResponse.json({ ok: true, id, nextAt });
}

export async function DELETE(req: NextRequest) {
  let user: { id: string };
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { id?: string; productId?: string };
  if (body.id) {
    await db
      .delete(refillReminders)
      .where(and(eq(refillReminders.id, body.id), eq(refillReminders.userId, user.id)));
    return NextResponse.json({ ok: true });
  }
  if (body.productId) {
    await db
      .delete(refillReminders)
      .where(
        and(eq(refillReminders.productId, body.productId), eq(refillReminders.userId, user.id)),
      );
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "id or productId required" }, { status: 400 });
}

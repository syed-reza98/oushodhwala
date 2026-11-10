import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { doctorBlackouts, doctors } from "@/server/db/schema";
import { requireStaff } from "@/server/services/authz";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const doctorId = (req.nextUrl.searchParams.get("doctorId") ?? "").trim();
  if (!doctorId) return NextResponse.json({ error: "doctorId required" }, { status: 400 });

  const rows = await db
    .select()
    .from(doctorBlackouts)
    .where(eq(doctorBlackouts.doctorId, doctorId))
    .orderBy(asc(doctorBlackouts.day));

  return NextResponse.json({
    items: rows.map((b) => ({
      id: b.id,
      doctorId: b.doctorId,
      day: b.day,
      reason: b.reason,
      createdAt: b.createdAt,
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

  const body = (await req.json().catch(() => ({}))) as {
    doctorId?: string;
    day?: string;
    reason?: string;
  };
  const doctorId = (body.doctorId ?? "").trim();
  const day = (body.day ?? "").trim();
  if (!doctorId || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return NextResponse.json({ error: "invalid doctorId/day" }, { status: 400 });
  }

  const [doc] = await db.select({ id: doctors.id }).from(doctors).where(eq(doctors.id, doctorId)).limit(1);
  if (!doc) return NextResponse.json({ error: "doctor not found" }, { status: 404 });

  const [existing] = await db
    .select()
    .from(doctorBlackouts)
    .where(and(eq(doctorBlackouts.doctorId, doctorId), eq(doctorBlackouts.day, day)))
    .limit(1);
  if (existing) {
    await db
      .update(doctorBlackouts)
      .set({ reason: (body.reason ?? "").trim() })
      .where(eq(doctorBlackouts.id, existing.id));
    return NextResponse.json({ ok: true, id: existing.id });
  }

  const id = randomUUID();
  await db.insert(doctorBlackouts).values({
    id,
    doctorId,
    day,
    reason: (body.reason ?? "").trim(),
  });
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const id = (req.nextUrl.searchParams.get("id") ?? "").trim();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await db.delete(doctorBlackouts).where(eq(doctorBlackouts.id, id));
  return NextResponse.json({ ok: true });
}

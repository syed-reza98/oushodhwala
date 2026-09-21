import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { appointments } from "@/server/db/schema";
import { requireStaff } from "@/server/services/authz";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["confirmed", "completed", "cancelled"]);

export async function GET() {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const rows = await db
    .select()
    .from(appointments)
    .orderBy(desc(appointments.scheduledAt))
    .limit(200);

  return NextResponse.json({
    items: rows.map((a) => ({
      id: a.id,
      invoiceNo: a.invoiceNo,
      doctorName: a.doctorName,
      doctorSpec: a.doctorSpec,
      mode: a.mode,
      scheduledAt: a.scheduledAt,
      patientName: a.patientName,
      phone: a.phone,
      fee: Number(a.fee),
      paymentMethod: a.paymentMethod,
      paymentStatus: a.paymentStatus,
      status: a.status,
      joinUrl: a.joinUrl,
      reminderSentAt: a.reminderSentAt,
    })),
  });
}

export async function PATCH(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const body = (await req.json()) as { id?: string; status?: string };
  if (!body.id || !body.status || !ALLOWED.has(body.status)) {
    return NextResponse.json({ error: "invalid id/status" }, { status: 400 });
  }

  await db.update(appointments).set({ status: body.status }).where(eq(appointments.id, body.id));
  return NextResponse.json({ ok: true });
}

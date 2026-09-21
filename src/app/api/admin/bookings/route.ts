import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { diagnosticBookings, serviceRequests } from "@/server/db/schema";
import { requireStaff } from "@/server/services/authz";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const [diag, services] = await Promise.all([
    db.select().from(diagnosticBookings).orderBy(desc(diagnosticBookings.createdAt)).limit(100),
    db.select().from(serviceRequests).orderBy(desc(serviceRequests.createdAt)).limit(100),
  ]);

  return NextResponse.json({
    diagnostics: diag.map((b) => ({
      id: b.id,
      bookingNo: b.bookingNo,
      patientName: b.patientName,
      phone: b.phone,
      address: b.address,
      scheduledDate: b.scheduledDate,
      slot: b.slot,
      tests: b.tests,
      total: Number(b.total),
      status: b.status,
      collectorName: b.collectorName,
      reportUrl: b.reportUrl,
      createdAt: b.createdAt,
    })),
    services: services.map((s) => ({
      id: s.id,
      requestNo: s.requestNo,
      serviceName: s.serviceName,
      serviceSlug: s.serviceSlug,
      patientName: s.patientName,
      phone: s.phone,
      fee: Number(s.fee),
      status: s.status,
      scheduledDate: s.scheduledDate,
      slot: s.slot,
      createdAt: s.createdAt,
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

  const body = (await req.json()) as {
    kind?: "diagnostic" | "service";
    id?: string;
    status?: string;
    collectorName?: string;
    reportUrl?: string;
  };
  if (!body.id || !body.kind) {
    return NextResponse.json({ error: "kind and id required" }, { status: 400 });
  }

  if (body.kind === "diagnostic") {
    const patch: Partial<typeof diagnosticBookings.$inferInsert> = {};
    if (body.status) patch.status = body.status;
    if (body.collectorName != null) patch.collectorName = body.collectorName;
    if (body.reportUrl != null) patch.reportUrl = body.reportUrl;
    await db.update(diagnosticBookings).set(patch).where(eq(diagnosticBookings.id, body.id));
    return NextResponse.json({ ok: true });
  }

  if (body.kind === "service") {
    const patch: Partial<typeof serviceRequests.$inferInsert> = {};
    if (body.status) patch.status = body.status;
    await db.update(serviceRequests).set(patch).where(eq(serviceRequests.id, body.id));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown kind" }, { status: 400 });
}

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
      area: b.area,
      cityZone: b.cityZone,
      thana: b.thana,
      district: b.district,
      lat: b.lat != null ? Number(b.lat) : null,
      lng: b.lng != null ? Number(b.lng) : null,
      scheduledDate: b.scheduledDate,
      slot: b.slot,
      tests: b.tests,
      subtotal: Number(b.subtotal),
      discount: Number(b.discount),
      collectionFee: Number(b.collectionFee),
      total: Number(b.total),
      paymentMethod: b.paymentMethod,
      paymentStatus: b.paymentStatus,
      status: b.status,
      collectorName: b.collectorName,
      collectorPhone: b.collectorPhone,
      reportUrl: b.reportUrl,
      note: b.note,
      createdAt: b.createdAt,
    })),
    services: services.map((s) => ({
      id: s.id,
      requestNo: s.requestNo,
      serviceName: s.serviceName,
      serviceSlug: s.serviceSlug,
      patientName: s.patientName,
      phone: s.phone,
      address: s.address,
      area: s.area,
      cityZone: s.cityZone,
      thana: s.thana,
      district: s.district,
      lat: s.lat != null ? Number(s.lat) : null,
      lng: s.lng != null ? Number(s.lng) : null,
      scheduledDate: s.scheduledDate,
      slot: s.slot,
      duration: s.duration,
      fee: Number(s.fee),
      paymentMethod: s.paymentMethod,
      paymentStatus: s.paymentStatus,
      status: s.status,
      assigneeName: s.assigneeName,
      assigneePhone: s.assigneePhone,
      note: s.note,
      adminNote: s.adminNote,
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
    collectorPhone?: string;
    reportUrl?: string;
    assigneeName?: string;
    assigneePhone?: string;
    duration?: string;
    adminNote?: string;
    paymentStatus?: string;
  };
  if (!body.id || !body.kind) {
    return NextResponse.json({ error: "kind and id required" }, { status: 400 });
  }

  if (body.kind === "diagnostic") {
    const patch: Partial<typeof diagnosticBookings.$inferInsert> = {};
    if (body.status) patch.status = body.status;
    if (body.collectorName != null) patch.collectorName = body.collectorName;
    if (body.collectorPhone != null) patch.collectorPhone = body.collectorPhone;
    if (body.reportUrl != null) patch.reportUrl = body.reportUrl;
    if (body.paymentStatus != null) patch.paymentStatus = body.paymentStatus;
    await db.update(diagnosticBookings).set(patch).where(eq(diagnosticBookings.id, body.id));
    return NextResponse.json({ ok: true });
  }

  if (body.kind === "service") {
    const patch: Partial<typeof serviceRequests.$inferInsert> = {};
    if (body.status) patch.status = body.status;
    if (body.assigneeName != null) patch.assigneeName = body.assigneeName;
    if (body.assigneePhone != null) patch.assigneePhone = body.assigneePhone;
    if (body.duration != null) patch.duration = body.duration;
    if (body.adminNote != null) patch.adminNote = body.adminNote;
    if (body.paymentStatus != null) patch.paymentStatus = body.paymentStatus;
    await db.update(serviceRequests).set(patch).where(eq(serviceRequests.id, body.id));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown kind" }, { status: 400 });
}

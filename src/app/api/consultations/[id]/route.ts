import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  appointments,
  consultationMedia,
  consultationMessages,
  consultationPrescriptions,
  doctorReviews,
  doctors,
} from "@/server/db/schema";
import { requireUser } from "@/server/services/authz";
import { refundPreview } from "@/lib/appointments";
import { hasStaffAccess, type AppRole } from "@/server/auth/roles";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function nowSql() {
  return new Date().toISOString().slice(0, 23).replace("T", " ");
}

async function loadAppt(id: string, userId: string, staff: boolean) {
  const [appt] = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
  if (!appt) return null;
  if (!staff && appt.userId !== userId) return null;
  return appt;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  let user: { id: string; roles?: AppRole[] };
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const staff = hasStaffAccess(user.roles ?? []);
  const appt = await loadAppt(id, user.id, staff);
  if (!appt) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const [doc] = await db.select().from(doctors).where(eq(doctors.id, appt.doctorId)).limit(1);
  const messages = await db
    .select()
    .from(consultationMessages)
    .where(eq(consultationMessages.appointmentId, id))
    .orderBy(asc(consultationMessages.createdAt));
  const media = await db
    .select()
    .from(consultationMedia)
    .where(eq(consultationMedia.appointmentId, id))
    .orderBy(desc(consultationMedia.createdAt));
  const [rx] = await db
    .select()
    .from(consultationPrescriptions)
    .where(eq(consultationPrescriptions.appointmentId, id))
    .limit(1);
  const [review] = await db
    .select()
    .from(doctorReviews)
    .where(eq(doctorReviews.appointmentId, id))
    .limit(1);

  return NextResponse.json({
    appointment: {
      id: appt.id,
      invoiceNo: appt.invoiceNo,
      doctorId: appt.doctorId,
      doctorName: appt.doctorName,
      doctorSpec: appt.doctorSpec,
      mode: appt.mode,
      scheduledAt: appt.scheduledAt,
      patientName: appt.patientName,
      phone: appt.phone,
      note: appt.note,
      fee: Number(appt.fee),
      paymentMethod: appt.paymentMethod,
      paymentStatus: appt.paymentStatus,
      paymentRef: appt.paymentRef,
      status: appt.status,
      joinUrl: appt.joinUrl,
      cancelReason: appt.cancelReason,
      cancelledAt: appt.cancelledAt,
      refundStatus: appt.refundStatus,
      refundAmount: Number(appt.refundAmount),
    },
    doctor: doc
      ? {
          id: doc.id,
          name: doc.name,
          emoji: doc.emoji,
          phone: doc.phone,
          whatsapp: doc.whatsapp,
          videoUrl: doc.videoUrl,
        }
      : null,
    messages: messages.map((m) => ({
      id: m.id,
      sender: m.sender,
      body: m.body,
      fileUrl: m.fileUrl,
      fileName: m.fileName,
      createdAt: m.createdAt,
    })),
    media: media.map((m) => ({
      id: m.id,
      kind: m.kind,
      url: m.url,
      name: m.name,
      createdAt: m.createdAt,
    })),
    rx: rx
      ? {
          id: rx.id,
          diagnosis: rx.diagnosis,
          advice: rx.advice,
          items: Array.isArray(rx.items) ? rx.items : [],
          followUp: rx.followUp,
          doctorName: rx.doctorName,
          patientName: rx.patientName,
        }
      : null,
    review: review
      ? {
          id: review.id,
          rating: review.rating,
          comment: review.comment,
        }
      : null,
  });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  let user: { id: string; roles?: AppRole[] };
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const staff = hasStaffAccess(user.roles ?? []);
  const appt = await loadAppt(id, user.id, staff);
  if (!appt) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    text?: string;
    reason?: string;
    rating?: number;
    comment?: string;
    kind?: string;
    url?: string;
    name?: string;
    mediaId?: string;
    diagnosis?: string;
    advice?: string;
    items?: { name: string; dose: string; duration: string }[];
    followUp?: string;
  };

  const action = body.action ?? "";

  if (action === "message") {
    const text = (body.text ?? "").trim();
    if (!text) return NextResponse.json({ error: "empty message" }, { status: 400 });
    const mid = randomUUID();
    await db.insert(consultationMessages).values({
      id: mid,
      appointmentId: id,
      userId: user.id,
      sender: staff ? "staff" : "patient",
      body: text,
    });
    return NextResponse.json({ ok: true, id: mid });
  }

  if (action === "cancel") {
    if (appt.status === "cancelled" || appt.status === "completed") {
      return NextResponse.json({ error: "cannot cancel" }, { status: 400 });
    }
    if (!staff && appt.userId !== user.id) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    const paid = appt.paymentStatus === "paid";
    const preview = refundPreview(Number(appt.fee), appt.scheduledAt, paid, true);
    const refundStatus =
      !paid ? "not_applicable" : preview.amount <= 0 ? "not_eligible" : "pending";
    await db
      .update(appointments)
      .set({
        status: "cancelled",
        cancelReason: (body.reason ?? "").trim(),
        cancelledAt: nowSql(),
        refundStatus,
        refundAmount: String(preview.amount),
      })
      .where(eq(appointments.id, id));
    return NextResponse.json({ ok: true, refundStatus, refundAmount: preview.amount });
  }

  if (action === "review") {
    const rating = Math.min(5, Math.max(1, Number(body.rating) || 5));
    const comment = (body.comment ?? "").trim();
    const [existing] = await db
      .select()
      .from(doctorReviews)
      .where(eq(doctorReviews.appointmentId, id))
      .limit(1);
    if (existing) {
      await db
        .update(doctorReviews)
        .set({ rating, comment })
        .where(eq(doctorReviews.id, existing.id));
    } else {
      await db.insert(doctorReviews).values({
        id: randomUUID(),
        appointmentId: id,
        doctorId: appt.doctorId,
        userId: user.id,
        patientName: appt.patientName,
        rating,
        comment,
      });
    }
    if (appt.status !== "cancelled") {
      await db.update(appointments).set({ status: "completed" }).where(eq(appointments.id, id));
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "media_add") {
    const url = (body.url ?? "").trim();
    if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });
    const mid = randomUUID();
    await db.insert(consultationMedia).values({
      id: mid,
      appointmentId: id,
      userId: user.id,
      kind: (body.kind ?? "report").trim() || "report",
      url,
      name: (body.name ?? "").trim(),
      transcript: "",
    });
    return NextResponse.json({ ok: true, id: mid });
  }

  if (action === "media_delete") {
    const mediaId = (body.mediaId ?? "").trim();
    if (!mediaId) return NextResponse.json({ error: "mediaId required" }, { status: 400 });
    const filters = [
      eq(consultationMedia.id, mediaId),
      eq(consultationMedia.appointmentId, id),
    ];
    if (!staff) filters.push(eq(consultationMedia.userId, user.id));
    await db.delete(consultationMedia).where(and(...filters));
    return NextResponse.json({ ok: true });
  }

  if (action === "rx_save" && staff) {
    const items = Array.isArray(body.items) ? body.items : [];
    const [existing] = await db
      .select()
      .from(consultationPrescriptions)
      .where(eq(consultationPrescriptions.appointmentId, id))
      .limit(1);
    const payload = {
      doctorName: appt.doctorName,
      patientName: appt.patientName,
      diagnosis: (body.diagnosis ?? "").trim(),
      advice: (body.advice ?? "").trim(),
      items,
      followUp: (body.followUp ?? "").trim(),
    };
    if (existing) {
      await db
        .update(consultationPrescriptions)
        .set(payload)
        .where(eq(consultationPrescriptions.id, existing.id));
    } else {
      await db.insert(consultationPrescriptions).values({
        id: randomUUID(),
        appointmentId: id,
        userId: appt.userId,
        ...payload,
      });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}

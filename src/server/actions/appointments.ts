"use server";

import { randomUUID } from "node:crypto";
import { and, desc, eq, ne } from "drizzle-orm";
import { auth } from "@/server/auth/config";
import { db } from "@/server/db";
import { appointments, doctorBlackouts } from "@/server/db/schema";

export type BookAppointmentInput = {
  doctorId: string;
  doctorName: string;
  doctorSpec: string;
  mode: string;
  scheduledAt: string;
  patientName: string;
  phone: string;
  note?: string;
  fee: number;
  paymentMethod: string;
  paymentRef?: string;
};

function invoiceNo() {
  return `APT-${Date.now().toString(36).toUpperCase()}`;
}

function toMysqlDatetime(isoOrDate: string | Date) {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  return d.toISOString().slice(0, 23).replace("T", " ");
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function bookAppointment(input: BookAppointmentInput) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("AUTH_REQUIRED");
  if (!input.doctorId || !input.scheduledAt) throw new Error("INVALID");
  if (!input.patientName.trim() || !input.phone.trim()) throw new Error("INVALID");

  const when = new Date(input.scheduledAt);
  if (Number.isNaN(when.getTime())) throw new Error("INVALID");
  if (when.getTime() < Date.now() - 60_000) throw new Error("PAST_SLOT");

  const day = dayKey(when);
  const [blackout] = await db
    .select({ id: doctorBlackouts.id })
    .from(doctorBlackouts)
    .where(and(eq(doctorBlackouts.doctorId, input.doctorId), eq(doctorBlackouts.day, day)))
    .limit(1);
  if (blackout) throw new Error("BLACKOUT");

  const slotSql = toMysqlDatetime(when);
  const slotPrefix = slotSql.slice(0, 16); // YYYY-MM-DD HH:MM
  const existing = await db
    .select({ id: appointments.id, scheduledAt: appointments.scheduledAt })
    .from(appointments)
    .where(and(eq(appointments.doctorId, input.doctorId), ne(appointments.status, "cancelled")));
  if (existing.some((a) => a.scheduledAt.slice(0, 16) === slotPrefix)) {
    throw new Error("SLOT_TAKEN");
  }

  const id = randomUUID();
  const inv = invoiceNo();
  const paid = input.paymentMethod !== "cod";

  await db.insert(appointments).values({
    id,
    invoiceNo: inv,
    userId: session.user.id,
    doctorId: input.doctorId,
    doctorName: input.doctorName,
    doctorSpec: input.doctorSpec,
    mode: input.mode || "video",
    scheduledAt: slotSql,
    patientName: input.patientName.trim(),
    phone: input.phone.trim(),
    note: input.note?.trim() || null,
    fee: String(input.fee ?? 0),
    paymentMethod: input.paymentMethod,
    paymentStatus: paid ? "paid" : "pending",
    paymentRef: input.paymentRef?.trim() || "",
    status: "confirmed",
  });

  return { id, invoiceNo: inv, status: "confirmed" as const };
}

export async function listMyAppointments() {
  const session = await auth();
  if (!session?.user?.id) return [];
  const rows = await db
    .select()
    .from(appointments)
    .where(eq(appointments.userId, session.user.id))
    .orderBy(desc(appointments.scheduledAt))
    .limit(50);
  return rows.map((a) => ({
    id: a.id,
    invoiceNo: a.invoiceNo,
    doctorId: a.doctorId,
    doctorName: a.doctorName,
    doctorSpec: a.doctorSpec,
    mode: a.mode,
    scheduledAt: a.scheduledAt,
    fee: Number(a.fee),
    paymentMethod: a.paymentMethod,
    paymentStatus: a.paymentStatus,
    status: a.status,
  }));
}

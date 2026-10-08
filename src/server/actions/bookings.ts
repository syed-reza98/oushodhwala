"use server";

import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/server/auth/config";
import { db } from "@/server/db";
import { diagnosticBookings, serviceRequests } from "@/server/db/schema";

export type BookDiagnosticsInput = {
  patientName: string;
  phone: string;
  address: string;
  area?: string;
  cityZone?: string;
  thana?: string;
  district?: string;
  lat?: number;
  lng?: number;
  scheduledDate: string;
  slot: string;
  tests: { id: string; bn?: string; en?: string; price: number }[];
  collectionFee: number;
  discount?: number;
  paymentMethod?: string;
  note?: string;
};

export type BookServiceInput = {
  serviceSlug: string;
  serviceName: string;
  patientName: string;
  phone: string;
  address: string;
  area?: string;
  cityZone?: string;
  thana?: string;
  district?: string;
  lat?: number;
  lng?: number;
  scheduledDate?: string;
  slot?: string;
  duration?: string;
  fee: number;
  paymentMethod?: string;
  note?: string;
};

export async function bookDiagnostics(input: BookDiagnosticsInput) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("AUTH_REQUIRED");
  if (!input.tests?.length) throw new Error("NO_TESTS");
  if (!input.patientName.trim() || !input.phone.trim() || !input.address.trim()) {
    throw new Error("INVALID");
  }

  const subtotal = input.tests.reduce((a, t) => a + (Number(t.price) || 0), 0);
  const collectionFee = Math.max(0, Number(input.collectionFee) || 0);
  const discount = Math.max(0, Number(input.discount) || 0);
  const total = Math.max(0, subtotal - discount + collectionFee);
  const id = randomUUID();
  const bookingNo = `HD-${Date.now().toString(36).toUpperCase()}`;

  await db.insert(diagnosticBookings).values({
    id,
    bookingNo,
    userId: session.user.id,
    patientName: input.patientName.trim(),
    phone: input.phone.trim(),
    address: input.address.trim(),
    area: input.area?.trim() || "",
    cityZone: input.cityZone?.trim() || "",
    thana: input.thana?.trim() || "",
    district: input.district?.trim() || "",
    lat: input.lat != null ? String(input.lat) : null,
    lng: input.lng != null ? String(input.lng) : null,
    scheduledDate: input.scheduledDate || "",
    slot: input.slot || "",
    tests: input.tests,
    subtotal: String(subtotal),
    discount: String(discount),
    collectionFee: String(collectionFee),
    total: String(total),
    paymentMethod: input.paymentMethod || "cod",
    paymentStatus: "pending",
    status: "requested",
    note: input.note?.trim() || null,
  });

  return { id, bookingNo, total };
}

export async function bookHomeService(input: BookServiceInput) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("AUTH_REQUIRED");
  if (!input.serviceSlug || !input.patientName.trim() || !input.phone.trim() || !input.address.trim()) {
    throw new Error("INVALID");
  }

  const id = randomUUID();
  const requestNo = `HS-${Date.now().toString(36).toUpperCase()}`;

  await db.insert(serviceRequests).values({
    id,
    requestNo,
    userId: session.user.id,
    serviceSlug: input.serviceSlug,
    serviceName: input.serviceName,
    patientName: input.patientName.trim(),
    phone: input.phone.trim(),
    address: input.address.trim(),
    area: input.area?.trim() || "",
    cityZone: input.cityZone?.trim() || "",
    thana: input.thana?.trim() || "",
    district: input.district?.trim() || "",
    lat: input.lat != null ? String(input.lat) : null,
    lng: input.lng != null ? String(input.lng) : null,
    scheduledDate: input.scheduledDate || "",
    slot: input.slot || "",
    duration: input.duration?.trim() || "",
    fee: String(input.fee ?? 0),
    paymentMethod: input.paymentMethod || "cod",
    paymentStatus: "pending",
    status: "requested",
    note: input.note?.trim() || null,
  });

  return { id, requestNo };
}

export async function listMyDiagnosticBookings() {
  const session = await auth();
  if (!session?.user?.id) return [];
  const rows = await db
    .select()
    .from(diagnosticBookings)
    .where(eq(diagnosticBookings.userId, session.user.id))
    .orderBy(desc(diagnosticBookings.createdAt))
    .limit(30);
  return rows.map((b) => ({
    id: b.id,
    bookingNo: b.bookingNo,
    status: b.status,
    total: Number(b.total),
    scheduledDate: b.scheduledDate,
    createdAt: b.createdAt,
  }));
}

export async function listMyHomeServiceRequests() {
  const session = await auth();
  if (!session?.user?.id) return [];
  const rows = await db
    .select()
    .from(serviceRequests)
    .where(eq(serviceRequests.userId, session.user.id))
    .orderBy(desc(serviceRequests.createdAt))
    .limit(30);
  return rows.map((r) => ({
    id: r.id,
    requestNo: r.requestNo,
    serviceSlug: r.serviceSlug,
    serviceName: r.serviceName,
    patientName: r.patientName,
    phone: r.phone,
    address: r.address,
    scheduledDate: r.scheduledDate,
    slot: r.slot,
    fee: Number(r.fee),
    status: r.status,
    note: r.note,
    createdAt: r.createdAt,
  }));
}

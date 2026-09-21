"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/server/auth/config";
import { db } from "@/server/db";
import { prescriptionShares, prescriptions } from "@/server/db/schema";

export async function createRxShare(input: {
  prescriptionId: string;
  expiresInHours?: number;
  scopes?: Record<string, boolean>;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("AUTH_REQUIRED");

  const [rx] = await db
    .select()
    .from(prescriptions)
    .where(eq(prescriptions.id, input.prescriptionId))
    .limit(1);
  if (!rx || rx.userId !== session.user.id) throw new Error("NOT_FOUND");

  const token = randomBytes(12).toString("hex");
  const hours = input.expiresInHours ?? 72;
  const expires = new Date(Date.now() + hours * 3600_000)
    .toISOString()
    .slice(0, 23)
    .replace("T", " ");

  await db.insert(prescriptionShares).values({
    id: randomUUID(),
    prescriptionId: rx.id,
    userId: session.user.id,
    token,
    scopes: input.scopes ?? { medicines: true, dosage: true, patient: false, advice: true },
    expiresAt: expires,
  });

  return { token, expiresAt: expires };
}

export async function openRxShare(token: string) {
  const now = new Date().toISOString().slice(0, 23).replace("T", " ");
  const [share] = await db
    .select()
    .from(prescriptionShares)
    .where(eq(prescriptionShares.token, token))
    .limit(1);

  if (!share) return { ok: false as const, error: "not_found" as const };
  if (share.revoked) return { ok: false as const, error: "revoked" as const };
  if (share.expiresAt < now) return { ok: false as const, error: "expired" as const };

  const [rx] = await db
    .select()
    .from(prescriptions)
    .where(eq(prescriptions.id, share.prescriptionId))
    .limit(1);
  if (!rx) return { ok: false as const, error: "not_found" as const };

  await db
    .update(prescriptionShares)
    .set({ views: sql`${prescriptionShares.views} + 1` })
    .where(eq(prescriptionShares.id, share.id));

  const ocr = (rx.ocrJson ?? {}) as Record<string, unknown>;
  const scopes = share.scopes ?? {};

  return {
    ok: true as const,
    expiresAt: share.expiresAt,
    scopes,
    status: rx.status,
    note: scopes.advice ? (rx.note ?? "") : "",
    ocrText: scopes.medicines ? (rx.ocrText ?? "") : "",
    items: Array.isArray(ocr.items) ? ocr.items : [],
    patientName: scopes.patient ? String(ocr.patientName ?? "") : "",
    doctorName: scopes.patient ? String(ocr.doctorName ?? "") : "",
    createdAt: rx.createdAt,
    filePaths: scopes.medicines ? (rx.filePaths ?? []) : [],
  };
}

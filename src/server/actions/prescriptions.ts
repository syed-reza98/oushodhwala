"use server";

import { randomUUID } from "node:crypto";
import { desc, eq, sql } from "drizzle-orm";
import { auth } from "@/server/auth/config";
import { db } from "@/server/db";
import { prescriptions } from "@/server/db/schema";
import {
  extractRxFromImageAndNote,
  checkRxInteractions,
  type RxExtractedData,
  type RxExtractedItem,
  type DrugInteractionResult,
} from "@/server/ai/gateway";
import { matchPrescriptionMedicines } from "./prescription-matcher";

export async function createPrescription(input: {
  filePaths: string[];
  phone?: string;
  note?: string;
  guestToken?: string;
}) {
  const session = await auth();
  const userId = session?.user?.id || null;
  const guestToken = input.guestToken?.trim() || null;

  if (!userId && !guestToken) throw new Error("AUTH_OR_GUEST_REQUIRED");
  if (!input.filePaths.length) throw new Error("NO_FILES");

  const id = randomUUID();
  const ocr = await extractRxFromImageAndNote({
    note: input.note,
    filePaths: input.filePaths,
  });

  await db.insert(prescriptions).values({
    id,
    userId,
    guestToken,
    status: "pending",
    phone: input.phone?.trim() || null,
    note: input.note?.trim() || null,
    filePaths: input.filePaths,
    ocrText: ocr.text || null,
    ocrJson: ocr.rawJson,
    parsedAt: new Date().toISOString().slice(0, 23).replace("T", " "),
  });
  return { id, status: "pending" as const };
}

export async function claimGuestPrescriptions(guestToken: string): Promise<{ claimed: number }> {
  const session = await auth();
  if (!session?.user?.id || !guestToken.trim()) return { claimed: 0 };

  const res = await db
    .update(prescriptions)
    .set({
      userId: session.user.id,
    })
    .where(
      sql`${prescriptions.guestToken} = ${guestToken.trim()} AND ${prescriptions.userId} IS NULL`
    );

  const affected = Number((res as unknown as [{ affectedRows?: number }])?.[0]?.affectedRows || 0);
  return { claimed: affected };
}

export async function countMyPrescriptions(guestToken?: string): Promise<number> {
  const session = await auth();
  const userId = session?.user?.id;
  const token = guestToken?.trim();

  if (!userId && !token) return 0;

  const whereClause = userId
    ? eq(prescriptions.userId, userId)
    : eq(prescriptions.guestToken, token!);

  const [res] = await db
    .select({ count: sql<number>`count(*)` })
    .from(prescriptions)
    .where(whereClause);
  return Number(res?.count) || 0;
}

export async function listMyPrescriptions(guestToken?: string) {
  const session = await auth();
  const userId = session?.user?.id;
  const token = guestToken?.trim();

  if (!userId && !token) return [];

  const whereClause = userId
    ? eq(prescriptions.userId, userId)
    : eq(prescriptions.guestToken, token!);

  const rows = await db
    .select()
    .from(prescriptions)
    .where(whereClause)
    .orderBy(desc(prescriptions.createdAt))
    .limit(50);
  return rows.map((r) => {
    const raw = r.filePaths;
    const filePaths: string[] = Array.isArray(raw)
      ? raw
      : typeof raw === "string"
        ? (() => {
            try {
              const p = JSON.parse(raw);
              return Array.isArray(p) ? p : [raw];
            } catch {
              return raw ? [raw] : [];
            }
          })()
        : [];

    const ocrObj =
      typeof r.ocrJson === "string"
        ? (() => {
            try {
              return JSON.parse(r.ocrJson);
            } catch {
              return null;
            }
          })()
        : r.ocrJson;
    const parsedData = (ocrObj && typeof ocrObj === "object" && "data" in ocrObj
      ? (ocrObj as { data?: { items?: unknown[] } }).data
      : (ocrObj as { items?: unknown[] })) || null;
    const medicinesCount = Array.isArray(parsedData?.items) ? parsedData.items.length : 0;

    return {
      id: r.id,
      status: r.status,
      phone: r.phone,
      note: r.note,
      adminNote: r.adminNote,
      filePaths,
      createdAt: r.createdAt,
      parsedAt: r.parsedAt,
      medicinesCount,
    };
  });
}

export async function getPrescriptionById(id: string, guestToken?: string) {
  const session = await auth();
  const [row] = await db.select().from(prescriptions).where(eq(prescriptions.id, id)).limit(1);
  if (!row) return null;

  const isOwner = session?.user?.id && row.userId === session.user.id;
  const isGuestMatch = guestToken && row.guestToken === guestToken.trim();
  const roles = session?.user?.roles ?? [];
  const isStaff = roles.some((r) =>
    ["super_admin", "admin", "pharmacist", "support_agent"].includes(r),
  );

  if (!isOwner && !isGuestMatch && !isStaff) return null;

  const raw = row.filePaths;
  const filePaths: string[] = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? (() => {
          try {
            const p = JSON.parse(raw);
            return Array.isArray(p) ? p : [raw];
          } catch {
            return raw ? [raw] : [];
          }
        })()
      : [];

  const rawOcr = row.ocrJson;
  const ocrJson =
    typeof rawOcr === "string"
      ? (() => {
          try {
            return JSON.parse(rawOcr);
          } catch {
            return rawOcr;
          }
        })()
      : rawOcr;

  return {
    ...row,
    filePaths,
    ocrJson,
  };
}

export async function deletePrescription(id: string, guestToken?: string): Promise<{ success: boolean }> {
  const session = await auth();
  const [row] = await db.select().from(prescriptions).where(eq(prescriptions.id, id)).limit(1);
  if (!row) throw new Error("NOT_FOUND");

  const isOwner = session?.user?.id && row.userId === session.user.id;
  const isGuestMatch = guestToken && row.guestToken === guestToken.trim();
  const roles = session?.user?.roles ?? [];
  const isStaff = roles.some((r) =>
    ["super_admin", "admin", "pharmacist", "support_agent"].includes(r),
  );

  if (!isOwner && !isGuestMatch && !isStaff) throw new Error("FORBIDDEN");

  await db.delete(prescriptions).where(eq(prescriptions.id, id));
  return { success: true };
}

export async function updatePrescriptionMetadata(
  id: string,
  data: {
    note?: string;
    phone?: string;
    ocrJson?: Record<string, unknown>;
  },
  guestToken?: string,
): Promise<{ success: boolean }> {
  const session = await auth();
  const [row] = await db.select().from(prescriptions).where(eq(prescriptions.id, id)).limit(1);
  if (!row) throw new Error("NOT_FOUND");

  const isOwner = session?.user?.id && row.userId === session.user.id;
  const isGuestMatch = guestToken && row.guestToken === guestToken.trim();
  const roles = session?.user?.roles ?? [];
  const isStaff = roles.some((r) =>
    ["super_admin", "admin", "pharmacist", "support_agent"].includes(r),
  );

  if (!isOwner && !isGuestMatch && !isStaff) throw new Error("FORBIDDEN");

  const updateSet: Record<string, unknown> = {};
  if (data.note !== undefined) updateSet.note = data.note;
  if (data.phone !== undefined) updateSet.phone = data.phone;
  if (data.ocrJson !== undefined) updateSet.ocrJson = data.ocrJson;

  await db.update(prescriptions).set(updateSet).where(eq(prescriptions.id, id));
  return { success: true };
}

/**
 * Re-run or run OCR on existing prescription with Gemini Vision
 */
export async function runPrescriptionAiOcr(id: string, guestToken?: string): Promise<{
  ocrText: string;
  ocrJson: Record<string, unknown>;
}> {
  const session = await auth();
  const [row] = await db.select().from(prescriptions).where(eq(prescriptions.id, id)).limit(1);
  if (!row) throw new Error("NOT_FOUND");

  const isOwner = session?.user?.id && row.userId === session.user.id;
  const isGuestMatch = guestToken && row.guestToken === guestToken.trim();
  const roles = session?.user?.roles ?? [];
  const isStaff = roles.some((r) =>
    ["super_admin", "admin", "pharmacist", "support_agent"].includes(r),
  );

  if (!isOwner && !isGuestMatch && !isStaff) throw new Error("FORBIDDEN");

  const raw = row.filePaths;
  const filePaths: string[] = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? (() => {
          try {
            const p = JSON.parse(raw);
            return Array.isArray(p) ? p : [raw];
          } catch {
            return raw ? [raw] : [];
          }
        })()
      : [];

  const ocr = await extractRxFromImageAndNote({
    note: row.note ?? undefined,
    filePaths,
  });

  await db
    .update(prescriptions)
    .set({
      ocrText: ocr.text || null,
      ocrJson: ocr.rawJson,
      parsedAt: new Date().toISOString().slice(0, 23).replace("T", " "),
    })
    .where(eq(prescriptions.id, id));

  return {
    ocrText: ocr.text,
    ocrJson: ocr.rawJson,
  };
}

/**
 * Run Drug-Drug Interaction analysis on a list of medicines
 */
export async function analyzeDrugInteractions(
  meds: Array<{ name: string; generic?: string; strength?: string }>,
): Promise<DrugInteractionResult> {
  return checkRxInteractions(meds);
}

/**
 * Fast re-order for prescription lines without reviewing
 */
export async function quickReorderRx(id: string, guestToken?: string) {
  const row = await getPrescriptionById(id, guestToken);
  if (!row) throw new Error("PRESCRIPTION_NOT_FOUND");

  const rawOcr = row.ocrJson;
  const ocrObj =
    typeof rawOcr === "string"
      ? (() => {
          try {
            return JSON.parse(rawOcr);
          } catch {
            return null;
          }
        })()
      : rawOcr;
  const parsed =
    (ocrObj && typeof ocrObj === "object"
      ? (("data" in ocrObj
          ? (ocrObj as { data?: RxExtractedData }).data
          : ocrObj) as RxExtractedData)
      : null) || null;

  if (!parsed || !parsed.items || parsed.items.length === 0) {
    throw new Error("NO_MEDICINES_FOUND");
  }

  const matches = await matchPrescriptionMedicines(parsed.items);
  const lines: Array<{
    id: string;
    name: string;
    price: number;
    mrp?: number;
    qty: number;
  }> = [];
  const missing: Array<{ name: string }> = [];

  for (const m of matches) {
    if (m.matchedProduct) {
      lines.push({
        id: m.matchedProduct.id,
        name: m.matchedProduct.name,
        price: m.matchedProduct.price,
        mrp: m.matchedProduct.mrp,
        qty: m.calculatedQty || 1,
      });
    } else {
      missing.push({ name: m.extractedName });
    }
  }

  return { lines, missing };
}

/**
 * Save user verification edits and audit trail to prescription
 */
export async function savePrescriptionEdits(
  id: string,
  payload: {
    meta?: {
      hospital?: string;
      doctorName?: string;
      doctorQualification?: string;
      patientName?: string;
      patientAge?: string;
      patientAddress?: string;
      date?: string;
      advice?: string;
    };
    items?: RxExtractedItem[];
    changes?: Array<{
      line: number;
      medicine: string;
      field: string;
      from: string;
      to: string;
    }>;
  },
  guestToken?: string,
) {
  const session = await auth();
  const [row] = await db.select().from(prescriptions).where(eq(prescriptions.id, id)).limit(1);
  if (!row) throw new Error("NOT_FOUND");

  const isOwner = session?.user?.id && row.userId === session.user.id;
  const isGuestMatch = guestToken && row.guestToken === guestToken.trim();
  const roles = session?.user?.roles ?? [];
  const isStaff = roles.some((r) =>
    ["super_admin", "admin", "pharmacist", "support_agent"].includes(r),
  );

  if (!isOwner && !isGuestMatch && !isStaff) throw new Error("FORBIDDEN");

  const rawOcr = row.ocrJson;
  const currentJson =
    (typeof rawOcr === "string"
      ? (() => {
          try {
            return JSON.parse(rawOcr);
          } catch {
            return {};
          }
        })()
      : rawOcr) as Record<string, unknown> || {};
  const currentData = ((currentJson.data || currentJson) as Record<string, unknown>) || {};

  const updatedData: RxExtractedData = {
    hospital:
      payload.meta?.hospital !== undefined
        ? payload.meta.hospital
        : (currentData.hospital as string),
    doctorName:
      payload.meta?.doctorName !== undefined
        ? payload.meta.doctorName
        : (currentData.doctorName as string),
    doctorQualification:
      payload.meta?.doctorQualification !== undefined
        ? payload.meta.doctorQualification
        : (currentData.doctorQualification as string),
    patientName:
      payload.meta?.patientName !== undefined
        ? payload.meta.patientName
        : (currentData.patientName as string),
    patientAge:
      payload.meta?.patientAge !== undefined
        ? payload.meta.patientAge
        : (currentData.patientAge as string),
    patientAddress:
      payload.meta?.patientAddress !== undefined
        ? payload.meta.patientAddress
        : (currentData.patientAddress as string),
    date: payload.meta?.date !== undefined ? payload.meta.date : (currentData.date as string),
    advice:
      payload.meta?.advice !== undefined
        ? payload.meta.advice
        : (currentData.advice as string),
    items: payload.items || (currentData.items as RxExtractedItem[]) || [],
  };

  const auditHistory = Array.isArray(currentJson.auditHistory) ? [...currentJson.auditHistory] : [];
  if (payload.changes && payload.changes.length > 0) {
    auditHistory.unshift({
      id: randomUUID(),
      action: "verify_save",
      createdAt: new Date().toISOString(),
      version: auditHistory.length + 1,
      snapshot: { ...updatedData },
      changes: payload.changes,
    });
  }

  const newOcrJson = {
    ...currentJson,
    source: currentJson.source || "user-verified",
    data: updatedData,
    auditHistory,
  };

  await db
    .update(prescriptions)
    .set({
      ocrJson: newOcrJson,
      parsedAt: row.parsedAt || new Date().toISOString().slice(0, 23).replace("T", " "),
    })
    .where(eq(prescriptions.id, id));

  return { success: true, updatedData, auditHistory };
}

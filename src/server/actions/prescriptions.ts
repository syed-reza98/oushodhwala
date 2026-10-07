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
  type DrugInteractionResult,
} from "@/server/ai/gateway";

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
    return {
      id: r.id,
      status: r.status,
      phone: r.phone,
      note: r.note,
      filePaths,
      createdAt: r.createdAt,
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

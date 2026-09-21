"use server";

import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/server/auth/config";
import { db } from "@/server/db";
import { prescriptions } from "@/server/db/schema";
import { extractRxOcrText } from "@/server/ai/gateway";

export async function createPrescription(input: {
  filePaths: string[];
  phone?: string;
  note?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("AUTH_REQUIRED");
  if (!input.filePaths.length) throw new Error("NO_FILES");

  const id = randomUUID();
  const ocr = await extractRxOcrText({ note: input.note });

  await db.insert(prescriptions).values({
    id,
    userId: session.user.id,
    status: "pending",
    phone: input.phone?.trim() || null,
    note: input.note?.trim() || null,
    filePaths: input.filePaths,
    ocrText: ocr.text || null,
    ocrJson: ocr.json,
  });
  return { id, status: "pending" as const };
}

export async function listMyPrescriptions() {
  const session = await auth();
  if (!session?.user?.id) return [];
  const rows = await db
    .select()
    .from(prescriptions)
    .where(eq(prescriptions.userId, session.user.id))
    .orderBy(desc(prescriptions.createdAt))
    .limit(50);
  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    phone: r.phone,
    note: r.note,
    filePaths: r.filePaths ?? [],
    createdAt: r.createdAt,
  }));
}

export async function getPrescriptionById(id: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const [row] = await db.select().from(prescriptions).where(eq(prescriptions.id, id)).limit(1);
  if (!row) return null;
  if (row.userId !== session.user.id) {
    const roles = session.user.roles ?? [];
    const staff = roles.some((r) =>
      ["super_admin", "admin", "pharmacist", "support_agent"].includes(r),
    );
    if (!staff) return null;
  }
  return row;
}

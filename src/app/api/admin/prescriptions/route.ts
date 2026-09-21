import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { erpAuditLog, prescriptionAudit, prescriptions } from "@/server/db/schema";
import { requireStaff } from "@/server/services/authz";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["pending", "reviewing", "approved", "rejected", "fulfilled"]);

export async function GET() {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const rows = await db
    .select()
    .from(prescriptions)
    .orderBy(desc(prescriptions.createdAt))
    .limit(200);

  return NextResponse.json({
    items: rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      status: r.status,
      phone: r.phone,
      note: r.note,
      adminNote: r.adminNote,
      filePaths: r.filePaths ?? [],
      ocrText: r.ocrText,
      createdAt: r.createdAt,
    })),
  });
}

export async function PATCH(req: NextRequest) {
  let actorId: string | undefined;
  try {
    const user = await requireStaff();
    actorId = user.id;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const body = (await req.json()) as {
    id?: string;
    status?: string;
    adminNote?: string;
  };
  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  if (body.status && !ALLOWED.has(body.status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const [prev] = await db.select().from(prescriptions).where(eq(prescriptions.id, body.id)).limit(1);

  await db
    .update(prescriptions)
    .set({
      ...(body.status ? { status: body.status } : {}),
      ...(body.adminNote !== undefined ? { adminNote: body.adminNote } : {}),
    })
    .where(eq(prescriptions.id, body.id));

  if (prev) {
    const auditUserId = actorId ?? prev.userId;
    await db.insert(prescriptionAudit).values({
      id: randomUUID(),
      prescriptionId: prev.id,
      userId: auditUserId,
      action: body.status ? `status:${body.status}` : "update",
      changes: {
        before: { status: prev.status, adminNote: prev.adminNote ?? "" },
        after: {
          status: body.status ?? prev.status,
          adminNote: body.adminNote ?? prev.adminNote ?? "",
        },
      },
    });
    await db.insert(erpAuditLog).values({
      id: randomUUID(),
      tableName: "prescriptions",
      action: body.status ? "status" : "update",
      recordId: prev.id,
      label: body.status ? `Rx → ${body.status}` : "Rx update",
      changes: {
        status: body.status ?? null,
        adminNote: body.adminNote ?? null,
      },
      actorId: actorId ?? null,
    });
  }

  return NextResponse.json({ ok: true });
}

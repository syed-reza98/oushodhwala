import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { desc, like, or } from "drizzle-orm";
import { db } from "@/server/db";
import { erpAuditLog } from "@/server/db/schema";
import { requireStaff } from "@/server/services/authz";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const rows = await db
    .select()
    .from(erpAuditLog)
    .where(
      q
        ? or(like(erpAuditLog.tableName, `%${q}%`), like(erpAuditLog.label, `%${q}%`))
        : undefined,
    )
    .orderBy(desc(erpAuditLog.createdAt))
    .limit(100);

  return NextResponse.json({
    items: rows.map((r) => ({
      id: r.id,
      tableName: r.tableName,
      action: r.action,
      recordId: r.recordId,
      label: r.label,
      changes: r.changes,
      actorId: r.actorId,
      createdAt: r.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  let actorId: string | undefined;
  try {
    const user = await requireStaff();
    actorId = user.id;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const body = (await req.json()) as {
    tableName?: string;
    action?: string;
    recordId?: string;
    label?: string;
    changes?: unknown;
  };

  const tableName = (body.tableName ?? "").trim();
  const action = (body.action ?? "").trim();
  if (!tableName || !action) {
    return NextResponse.json({ error: "tableName and action required" }, { status: 400 });
  }

  const id = randomUUID();
  await db.insert(erpAuditLog).values({
    id,
    tableName,
    action,
    recordId: (body.recordId ?? "").trim(),
    label: (body.label ?? "").trim(),
    changes: (body.changes && typeof body.changes === "object"
      ? (body.changes as Record<string, unknown>)
      : {}) as Record<string, unknown>,
    actorId: actorId ?? null,
  });

  return NextResponse.json({ ok: true, id });
}

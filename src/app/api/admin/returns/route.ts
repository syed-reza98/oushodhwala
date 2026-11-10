import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { orderReturns } from "@/server/db/schema";
import { requireStaff } from "@/server/services/authz";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["requested", "approved", "rejected", "refunded"]);

export async function GET(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const status = req.nextUrl.searchParams.get("status") ?? "requested";
  const rows =
    status && status !== "all"
      ? await db
          .select()
          .from(orderReturns)
          .where(eq(orderReturns.status, status))
          .orderBy(desc(orderReturns.createdAt))
          .limit(200)
      : await db.select().from(orderReturns).orderBy(desc(orderReturns.createdAt)).limit(200);

  return NextResponse.json({
    items: rows.map((r) => ({
      id: r.id,
      orderId: r.orderId,
      orderNo: r.orderNo,
      userId: r.userId,
      reason: r.reason,
      details: r.details,
      photoUrls: r.photoUrls ?? [],
      refundAmount: Number(r.refundAmount ?? 0),
      status: r.status,
      adminNote: r.adminNote,
      createdAt: r.createdAt,
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

  const body = (await req.json()) as { id?: string; status?: string; adminNote?: string };
  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  if (body.status && !ALLOWED.has(body.status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const patch: Partial<typeof orderReturns.$inferInsert> = {};
  if (body.status) patch.status = body.status;
  if (body.adminNote !== undefined) patch.adminNote = body.adminNote;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  await db.update(orderReturns).set(patch).where(eq(orderReturns.id, body.id));
  return NextResponse.json({ ok: true });
}

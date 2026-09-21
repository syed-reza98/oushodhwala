import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { orderEvents, orders } from "@/server/db/schema";
import { requireStaff } from "@/server/services/authz";

export const dynamic = "force-dynamic";

const ALLOWED = new Set([
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
]);

const NOTE: Record<string, string> = {
  pending: "অর্ডার অপেক্ষমাণ",
  confirmed: "অর্ডার নিশ্চিত",
  processing: "অর্ডার প্রস্তুত হচ্ছে",
  shipped: "অর্ডার পাঠানো হয়েছে",
  delivered: "অর্ডার ডেলিভার হয়েছে",
  cancelled: "অর্ডার বাতিল",
};

export async function PATCH(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const body = (await req.json()) as { id?: string; status?: string; note?: string };
  if (!body.id || !body.status || !ALLOWED.has(body.status)) {
    return NextResponse.json({ error: "invalid id/status" }, { status: 400 });
  }

  await db.update(orders).set({ status: body.status }).where(eq(orders.id, body.id));
  await db.insert(orderEvents).values({
    id: randomUUID(),
    orderId: body.id,
    status: body.status,
    note: (body.note ?? "").trim() || NOTE[body.status] || body.status,
  });
  return NextResponse.json({ ok: true });
}

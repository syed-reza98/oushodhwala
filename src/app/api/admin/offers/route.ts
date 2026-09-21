import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/server/db";
import { offers } from "@/server/db/schema";
import { requireStaff } from "@/server/services/authz";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const rows = await db.select().from(offers).orderBy(desc(offers.createdAt)).limit(200);
  return NextResponse.json({
    items: rows.map((o) => ({
      id: o.id,
      code: o.code,
      title: o.title,
      titleEn: o.titleEn,
      description: o.description,
      discountPercent: o.discountPercent != null ? Number(o.discountPercent) : null,
      discountAmount: o.discountAmount != null ? Number(o.discountAmount) : null,
      active: o.active,
      startsAt: o.startsAt,
      endsAt: o.endsAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const body = (await req.json()) as {
    code?: string;
    title?: string;
    titleEn?: string;
    description?: string;
    discountPercent?: number;
    discountAmount?: number;
    active?: boolean;
  };
  if (!body.title?.trim()) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }

  const id = randomUUID();
  await db.insert(offers).values({
    id,
    code: body.code?.trim() || null,
    title: body.title.trim(),
    titleEn: body.titleEn?.trim() || null,
    description: body.description?.trim() || null,
    discountPercent:
      body.discountPercent != null ? String(body.discountPercent) : null,
    discountAmount: body.discountAmount != null ? String(body.discountAmount) : null,
    active: body.active ?? true,
  });
  return NextResponse.json({ ok: true, id });
}

export async function PATCH(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const body = (await req.json()) as {
    id?: string;
    title?: string;
    active?: boolean;
    code?: string | null;
    discountPercent?: number | null;
    discountAmount?: number | null;
  };
  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  await db
    .update(offers)
    .set({
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.active !== undefined ? { active: body.active } : {}),
      ...(body.code !== undefined ? { code: body.code } : {}),
      ...(body.discountPercent !== undefined
        ? { discountPercent: body.discountPercent != null ? String(body.discountPercent) : null }
        : {}),
      ...(body.discountAmount !== undefined
        ? { discountAmount: body.discountAmount != null ? String(body.discountAmount) : null }
        : {}),
    })
    .where(eq(offers.id, body.id));

  return NextResponse.json({ ok: true });
}

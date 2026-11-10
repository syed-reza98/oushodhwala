import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/server/db";
import { categories } from "@/server/db/schema";
import { requireStaff } from "@/server/services/authz";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const rows = await db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name));
  return NextResponse.json({
    items: rows.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      nameEn: c.nameEn,
      icon: c.icon,
      sortOrder: c.sortOrder,
      active: c.active,
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
    slug?: string;
    name?: string;
    nameEn?: string;
    icon?: string;
    sortOrder?: number;
    active?: boolean;
  };
  if (!body.slug?.trim() || !body.name?.trim()) {
    return NextResponse.json({ error: "slug and name required" }, { status: 400 });
  }

  const id = randomUUID();
  await db.insert(categories).values({
    id,
    slug: body.slug.trim(),
    name: body.name.trim(),
    nameEn: body.nameEn?.trim() || null,
    icon: body.icon?.trim() || null,
    sortOrder: body.sortOrder ?? 0,
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
    name?: string;
    nameEn?: string | null;
    icon?: string | null;
    sortOrder?: number;
    active?: boolean;
  };
  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  await db
    .update(categories)
    .set({
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.nameEn !== undefined ? { nameEn: body.nameEn } : {}),
      ...(body.icon !== undefined ? { icon: body.icon } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
      ...(body.active !== undefined ? { active: body.active } : {}),
    })
    .where(eq(categories.id, body.id));

  return NextResponse.json({ ok: true });
}

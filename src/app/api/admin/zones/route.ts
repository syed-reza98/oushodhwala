import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { deliveryZones } from "@/server/db/schema";
import { requireStaff } from "@/server/services/authz";

export const dynamic = "force-dynamic";

function mapZone(z: typeof deliveryZones.$inferSelect) {
  return {
    id: z.id,
    name: z.name,
    nameEn: z.nameEn,
    district: z.district,
    thana: z.thana,
    fee: Number(z.fee),
    expressFee: Number(z.expressFee),
    freeAbove: Number(z.freeAbove),
    minOrder: Number(z.minOrder),
    etaMinutes: z.etaMinutes,
    active: z.active,
    sortOrder: z.sortOrder,
  };
}

/** Public: active zones. Staff: all when ?all=1 */
export async function GET(req: NextRequest) {
  const all = req.nextUrl.searchParams.get("all") === "1";
  if (all) {
    try {
      await requireStaff();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
      return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
    }
  }

  const rows = all
    ? await db.select().from(deliveryZones).orderBy(asc(deliveryZones.sortOrder), asc(deliveryZones.name))
    : await db
        .select()
        .from(deliveryZones)
        .where(eq(deliveryZones.active, true))
        .orderBy(asc(deliveryZones.sortOrder), asc(deliveryZones.name));

  return NextResponse.json({ items: rows.map(mapZone) });
}

export async function POST(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const body = (await req.json()) as {
    name?: string;
    nameEn?: string;
    district?: string;
    thana?: string;
    fee?: number;
    expressFee?: number;
    freeAbove?: number;
    minOrder?: number;
    etaMinutes?: number;
  };
  const name = (body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const id = randomUUID();
  const countRows = await db.select({ id: deliveryZones.id }).from(deliveryZones);
  await db.insert(deliveryZones).values({
    id,
    name,
    nameEn: (body.nameEn ?? "").trim(),
    district: (body.district ?? "").trim() || "ঢাকা",
    thana: (body.thana ?? "").trim(),
    fee: String(body.fee ?? 40),
    expressFee: String(body.expressFee ?? 90),
    freeAbove: String(body.freeAbove ?? 0),
    minOrder: String(body.minOrder ?? 0),
    etaMinutes: body.etaMinutes ?? 60,
    active: true,
    sortOrder: countRows.length,
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
    fee?: number;
    expressFee?: number;
    freeAbove?: number;
    minOrder?: number;
    etaMinutes?: number;
    active?: boolean;
    name?: string;
    nameEn?: string;
    district?: string;
    thana?: string;
  };
  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const patch: Partial<typeof deliveryZones.$inferInsert> = {};
  if (body.fee != null) patch.fee = String(body.fee);
  if (body.expressFee != null) patch.expressFee = String(body.expressFee);
  if (body.freeAbove != null) patch.freeAbove = String(body.freeAbove);
  if (body.minOrder != null) patch.minOrder = String(body.minOrder);
  if (body.etaMinutes != null) patch.etaMinutes = body.etaMinutes;
  if (typeof body.active === "boolean") patch.active = body.active;
  if (body.name != null) patch.name = body.name.trim();
  if (body.nameEn != null) patch.nameEn = body.nameEn.trim();
  if (body.district != null) patch.district = body.district.trim();
  if (body.thana != null) patch.thana = body.thana.trim();

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  await db.update(deliveryZones).set(patch).where(eq(deliveryZones.id, body.id));
  return NextResponse.json({ ok: true });
}

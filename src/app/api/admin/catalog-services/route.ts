import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { categories, doctors, labTests } from "@/server/db/schema";
import { requireStaff } from "@/server/services/authz";

export const dynamic = "force-dynamic";

async function gate() {
  try {
    await requireStaff();
    return null;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }
}

export async function GET(req: NextRequest) {
  const denied = await gate();
  if (denied) return denied;

  const kind = req.nextUrl.searchParams.get("kind") || "all";

  const [labRows, doctorRows, serviceCats] = await Promise.all([
    kind === "all" || kind === "lab"
      ? db.select().from(labTests).orderBy(asc(labTests.sortOrder), labTests.bn).limit(200)
      : Promise.resolve([]),
    kind === "all" || kind === "doctors"
      ? db.select().from(doctors).orderBy(asc(doctors.sortOrder), doctors.name).limit(200)
      : Promise.resolve([]),
    kind === "all" || kind === "diagnostics"
      ? db
          .select()
          .from(categories)
          .where(eq(categories.kind, "service"))
          .orderBy(asc(categories.sortOrder))
          .limit(100)
      : Promise.resolve([]),
  ]);

  return NextResponse.json({
    labTests: labRows.map((t) => ({
      id: t.id,
      bn: t.bn,
      en: t.en,
      price: Number(t.price),
      mrp: Number(t.mrp),
      group: t.grp,
      prep: t.prep,
      active: t.active,
      sortOrder: t.sortOrder,
    })),
    doctors: doctorRows.map((d) => ({
      id: d.id,
      name: d.name,
      spec: d.spec,
      degree: d.degree,
      exp: d.exp,
      fee: Number(d.fee),
      emoji: d.emoji,
      phone: d.phone,
      online: d.online,
      active: d.active,
      workStart: d.workStart,
      workEnd: d.workEnd,
      slotMinutes: d.slotMinutes,
    })),
    diagnostics: serviceCats.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      nameEn: c.nameEn,
      baseFee: Number(c.baseFee),
      eta: c.eta,
      serviceRoute: c.serviceRoute,
      active: c.active,
      icon: c.icon,
    })),
  });
}

export async function POST(req: NextRequest) {
  const denied = await gate();
  if (denied) return denied;

  const body = (await req.json()) as {
    kind?: "lab" | "doctor" | "diagnostic";
    // lab
    id?: string;
    bn?: string;
    en?: string;
    price?: number;
    mrp?: number;
    group?: string;
    prep?: string;
    // doctor
    name?: string;
    spec?: string;
    degree?: string;
    exp?: string;
    fee?: number;
    emoji?: string;
    phone?: string;
    // diagnostic / service category
    slug?: string;
    nameEn?: string;
    baseFee?: number;
    eta?: string;
    serviceRoute?: string;
    icon?: string;
  };

  if (body.kind === "lab") {
    if (!body.bn?.trim()) {
      return NextResponse.json({ error: "bn required" }, { status: 400 });
    }
    const id = body.id?.trim() || `lab-${randomUUID().slice(0, 8)}`;
    await db.insert(labTests).values({
      id,
      bn: body.bn.trim(),
      en: body.en?.trim() || "",
      price: String(Number(body.price) || 0),
      mrp: String(Number(body.mrp) || Number(body.price) || 0),
      grp: body.group?.trim() || "vital",
      prep: body.prep?.trim() || null,
      active: true,
      sortOrder: 0,
    });
    return NextResponse.json({ ok: true, id });
  }

  if (body.kind === "doctor") {
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "name required" }, { status: 400 });
    }
    const id = body.id?.trim() || `d-${randomUUID().slice(0, 8)}`;
    await db.insert(doctors).values({
      id,
      name: body.name.trim(),
      spec: body.spec?.trim() || "",
      degree: body.degree?.trim() || "",
      exp: body.exp?.trim() || "",
      fee: String(Number(body.fee) || 0),
      emoji: body.emoji?.trim() || "🩺",
      phone: body.phone?.trim() || "",
      active: true,
      online: true,
    });
    return NextResponse.json({ ok: true, id });
  }

  if (body.kind === "diagnostic") {
    if (!body.name?.trim() || !body.slug?.trim()) {
      return NextResponse.json({ error: "name and slug required" }, { status: 400 });
    }
    const id = randomUUID();
    await db.insert(categories).values({
      id,
      slug: body.slug.trim(),
      name: body.name.trim(),
      nameEn: body.nameEn?.trim() || body.name.trim(),
      icon: body.icon?.trim() || "🧪",
      kind: "service",
      homeDelivery: false,
      homeService: true,
      serviceRoute: body.serviceRoute?.trim() || "/home-diagnostics",
      eta: body.eta?.trim() || "",
      baseFee: String(Number(body.baseFee) || 0),
      active: true,
      sortOrder: 100,
    });
    return NextResponse.json({ ok: true, id });
  }

  return NextResponse.json({ error: "kind required" }, { status: 400 });
}

export async function PATCH(req: NextRequest) {
  const denied = await gate();
  if (denied) return denied;

  const body = (await req.json()) as {
    kind?: "lab" | "doctor" | "diagnostic";
    id?: string;
    active?: boolean;
    price?: number;
    fee?: number;
    baseFee?: number;
    bn?: string;
    name?: string;
    online?: boolean;
  };

  if (!body.kind || !body.id) {
    return NextResponse.json({ error: "kind and id required" }, { status: 400 });
  }

  if (body.kind === "lab") {
    const patch: Partial<typeof labTests.$inferInsert> = {};
    if (typeof body.active === "boolean") patch.active = body.active;
    if (body.price != null) patch.price = String(body.price);
    if (body.bn != null) patch.bn = body.bn;
    await db.update(labTests).set(patch).where(eq(labTests.id, body.id));
    return NextResponse.json({ ok: true });
  }

  if (body.kind === "doctor") {
    const patch: Partial<typeof doctors.$inferInsert> = {};
    if (typeof body.active === "boolean") patch.active = body.active;
    if (typeof body.online === "boolean") patch.online = body.online;
    if (body.fee != null) patch.fee = String(body.fee);
    if (body.name != null) patch.name = body.name;
    await db.update(doctors).set(patch).where(eq(doctors.id, body.id));
    return NextResponse.json({ ok: true });
  }

  if (body.kind === "diagnostic") {
    const patch: Partial<typeof categories.$inferInsert> = {};
    if (typeof body.active === "boolean") patch.active = body.active;
    if (body.baseFee != null) patch.baseFee = String(body.baseFee);
    if (body.name != null) patch.name = body.name;
    await db.update(categories).set(patch).where(eq(categories.id, body.id));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown kind" }, { status: 400 });
}

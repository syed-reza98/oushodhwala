import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { eq, like, or } from "drizzle-orm";
import { db } from "@/server/db";
import { genericInfo } from "@/server/db/schema";
import { requireStaff } from "@/server/services/authz";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const key = (sp.get("key") ?? "").trim();
  const q = (sp.get("q") ?? "").trim();

  if (key) {
    const [row] = await db.select().from(genericInfo).where(eq(genericInfo.key, key)).limit(1);
    return NextResponse.json({ item: row ?? null });
  }

  if (!q) {
    return NextResponse.json({ error: "key or q required" }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(genericInfo)
    .where(
      or(
        like(genericInfo.key, `%${q}%`),
        like(genericInfo.name, `%${q}%`),
        like(genericInfo.slug, `%${q}%`),
      ),
    )
    .limit(40);

  return NextResponse.json({
    items: rows.map((r) => ({
      id: r.id,
      key: r.key,
      slug: r.slug,
      name: r.name,
      therapeuticClass: r.therapeuticClass,
      indications: r.indications,
      dosage: r.dosage,
      sideEffects: r.sideEffects,
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
    id?: string;
    key?: string;
    slug?: string;
    name?: string;
    indications?: string;
    indicationsEn?: string;
    pharmacology?: string;
    pharmacologyEn?: string;
    dosage?: string;
    dosageEn?: string;
    interaction?: string;
    interactionEn?: string;
    contraindications?: string;
    contraindicationsEn?: string;
    sideEffects?: string;
    sideEffectsEn?: string;
    pregnancy?: string;
    pregnancyEn?: string;
    precautions?: string;
    precautionsEn?: string;
    specialPopulations?: string;
    specialPopulationsEn?: string;
    overdose?: string;
    overdoseEn?: string;
    therapeuticClass?: string;
    therapeuticClassEn?: string;
    storage?: string;
    storageEn?: string;
  };

  const key = (body.key ?? "").trim().toLowerCase();
  if (!key) {
    return NextResponse.json({ error: "key required" }, { status: 400 });
  }

  const [existing] = await db.select().from(genericInfo).where(eq(genericInfo.key, key)).limit(1);
  const id = existing?.id ?? body.id?.trim() ?? randomUUID();
  const slug =
    (body.slug ?? existing?.slug ?? key).trim().toLowerCase().replace(/\s+/g, "-") || key;

  const payload = {
    key,
    slug,
    name: (body.name ?? existing?.name ?? key).trim(),
    indications: body.indications ?? existing?.indications ?? "",
    indicationsEn: body.indicationsEn ?? existing?.indicationsEn ?? "",
    pharmacology: body.pharmacology ?? existing?.pharmacology ?? "",
    pharmacologyEn: body.pharmacologyEn ?? existing?.pharmacologyEn ?? "",
    dosage: body.dosage ?? existing?.dosage ?? "",
    dosageEn: body.dosageEn ?? existing?.dosageEn ?? "",
    interaction: body.interaction ?? existing?.interaction ?? "",
    interactionEn: body.interactionEn ?? existing?.interactionEn ?? "",
    contraindications: body.contraindications ?? existing?.contraindications ?? "",
    contraindicationsEn: body.contraindicationsEn ?? existing?.contraindicationsEn ?? "",
    sideEffects: body.sideEffects ?? existing?.sideEffects ?? "",
    sideEffectsEn: body.sideEffectsEn ?? existing?.sideEffectsEn ?? "",
    pregnancy: body.pregnancy ?? existing?.pregnancy ?? "",
    pregnancyEn: body.pregnancyEn ?? existing?.pregnancyEn ?? "",
    precautions: body.precautions ?? existing?.precautions ?? "",
    precautionsEn: body.precautionsEn ?? existing?.precautionsEn ?? "",
    therapeuticClass: body.therapeuticClass ?? existing?.therapeuticClass ?? "",
    therapeuticClassEn: body.therapeuticClassEn ?? existing?.therapeuticClassEn ?? "",
    storage: body.storage ?? existing?.storage ?? "",
    storageEn: body.storageEn ?? existing?.storageEn ?? "",
  };

  if (existing) {
    await db.update(genericInfo).set(payload).where(eq(genericInfo.id, existing.id));
  } else {
    await db.insert(genericInfo).values({ id, ...payload });
  }

  return NextResponse.json({ ok: true, id, key });
}

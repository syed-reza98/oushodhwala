import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { appSettings } from "@/server/db/schema";
import { requireStaff } from "@/server/services/authz";
import {
  APP_SETTING_DEFS,
  normalizeSettingValue,
} from "@/server/settings/defs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const rows = await db.select().from(appSettings);
  const byKey = new Map(rows.map((r) => [r.key, normalizeSettingValue(r.value)]));

  const items = APP_SETTING_DEFS.map((d) => ({
    key: d.key,
    label: d.label,
    labelEn: d.labelEn,
    kind: d.kind,
    value: byKey.has(d.key) ? (byKey.get(d.key) as string) : d.defaultValue,
  }));

  // Include any unknown keys still in DB (forward-compat)
  for (const r of rows) {
    if (!APP_SETTING_DEFS.some((d) => d.key === r.key)) {
      items.push({
        key: r.key,
        label: r.key,
        labelEn: r.key,
        kind: "text" as const,
        value: normalizeSettingValue(r.value),
      });
    }
  }

  return NextResponse.json({ items });
}

export async function PATCH(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const body = (await req.json()) as { key?: string; value?: string };
  if (!body.key?.trim() || body.value === undefined) {
    return NextResponse.json({ error: "key and value required" }, { status: 400 });
  }

  const key = body.key.trim();
  const value = String(body.value);

  const existing = await db
    .select({ key: appSettings.key })
    .from(appSettings)
    .where(eq(appSettings.key, key))
    .limit(1);

  if (existing.length) {
    await db.update(appSettings).set({ value }).where(eq(appSettings.key, key));
  } else {
    await db.insert(appSettings).values({ key, value });
  }

  return NextResponse.json({ ok: true, key, value });
}

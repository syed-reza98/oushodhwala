import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { desc, ne } from "drizzle-orm";
import { db } from "@/server/db";
import { campaignSends, notifications, orders, profiles } from "@/server/db/schema";
import { requireStaff } from "@/server/services/authz";

export const dynamic = "force-dynamic";

export type CampaignSegment = "all" | "buyers30" | "inactive60" | "highvalue";

async function resolveAudience(segment: CampaignSegment): Promise<string[]> {
  const profilesRows = await db.select({ id: profiles.id }).from(profiles).limit(20000);
  const allIds = profilesRows.map((p) => p.id);
  if (segment === "all") return allIds;

  const orderRows = await db
    .select({
      userId: orders.userId,
      createdAt: orders.createdAt,
      total: orders.total,
      status: orders.status,
    })
    .from(orders)
    .where(ne(orders.status, "cancelled"))
    .limit(50000);

  const now = Date.now();
  const last = new Map<string, number>();
  const spend = new Map<string, number>();
  for (const o of orderRows) {
    if (!o.userId) continue;
    const t = new Date(o.createdAt).getTime();
    last.set(o.userId, Math.max(last.get(o.userId) ?? 0, t));
    spend.set(o.userId, (spend.get(o.userId) ?? 0) + Number(o.total || 0));
  }

  if (segment === "buyers30") {
    return allIds.filter((id) => (last.get(id) ?? 0) > now - 30 * 864e5);
  }
  if (segment === "inactive60") {
    return allIds.filter((id) => (last.get(id) ?? 0) < now - 60 * 864e5);
  }
  return allIds.filter((id) => (spend.get(id) ?? 0) >= 5000);
}

export async function GET(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const segment = (req.nextUrl.searchParams.get("segment") ?? "all") as CampaignSegment;
  if (!["all", "buyers30", "inactive60", "highvalue"].includes(segment)) {
    return NextResponse.json({ error: "invalid segment" }, { status: 400 });
  }

  const ids = await resolveAudience(segment);
  const history = await db
    .select()
    .from(campaignSends)
    .orderBy(desc(campaignSends.createdAt))
    .limit(20);

  return NextResponse.json({
    count: ids.length,
    history: history.map((h) => ({
      id: h.id,
      segment: h.segment,
      title: h.title,
      sentCount: h.sentCount,
      createdAt: h.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  let actor;
  try {
    actor = await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const body = (await req.json()) as {
    segment?: CampaignSegment;
    title?: string;
    body?: string;
  };
  const segment = body.segment ?? "all";
  const title = (body.title ?? "").trim();
  const text = (body.body ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "TITLE_REQUIRED" }, { status: 400 });
  }
  if (!["all", "buyers30", "inactive60", "highvalue"].includes(segment)) {
    return NextResponse.json({ error: "invalid segment" }, { status: 400 });
  }

  const ids = await resolveAudience(segment);
  let sent = 0;
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    await db.insert(notifications).values(
      chunk.map((userId) => ({
        id: randomUUID(),
        userId,
        title,
        body: text,
        kind: "campaign",
        orderNo: "",
        read: false,
      })),
    );
    sent += chunk.length;
  }

  await db.insert(campaignSends).values({
    id: randomUUID(),
    segment,
    title,
    body: text,
    sentCount: sent,
    actorId: actor.id,
  });

  return NextResponse.json({ ok: true, sent });
}

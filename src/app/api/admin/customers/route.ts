import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/server/db";
import { orders, profiles, userRoles, users } from "@/server/db/schema";
import { requireRoles, requireStaff } from "@/server/services/authz";

export const dynamic = "force-dynamic";

const STAFF_ROLE_SET = new Set([
  "super_admin",
  "admin",
  "erp_manager",
  "support_agent",
  "accountant",
  "pharmacist",
]);

export async function GET(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 200) || 200, 500);

  const base = db
    .select({
      userId: users.id,
      email: users.email,
      name: users.name,
      phone: profiles.phone,
      fullName: profiles.fullName,
      joinedAt: users.createdAt,
    })
    .from(users)
    .leftJoin(profiles, eq(profiles.id, users.id));

  const userRows = q
    ? await base
        .where(
          or(
            like(users.email, `%${q}%`),
            like(users.name, `%${q}%`),
            like(profiles.fullName, `%${q}%`),
            like(profiles.phone, `%${q}%`),
          ),
        )
        .orderBy(desc(users.createdAt))
        .limit(limit)
    : await base.orderBy(desc(users.createdAt)).limit(limit);

  const roleRows = await db.select({ userId: userRoles.userId, role: userRoles.role }).from(userRoles);
  const rolesByUser = new Map<string, string[]>();
  for (const r of roleRows) {
    const list = rolesByUser.get(r.userId) ?? [];
    list.push(r.role);
    rolesByUser.set(r.userId, list);
  }

  const orderAgg = await db
    .select({
      userId: orders.userId,
      ordersCount: sql<number>`count(*)`,
      totalSpent: sql<string>`coalesce(sum(${orders.total}), 0)`,
    })
    .from(orders)
    .groupBy(orders.userId);
  const aggByUser = new Map(
    orderAgg
      .filter((a) => a.userId)
      .map((a) => [
        a.userId as string,
        { ordersCount: Number(a.ordersCount), totalSpent: Number(a.totalSpent) },
      ]),
  );

  const items = userRows.map((u) => {
    const roles = rolesByUser.get(u.userId) ?? [];
    const isAdmin = roles.some((r) => r === "admin" || r === "super_admin");
    const isStaff = roles.some((r) => STAFF_ROLE_SET.has(r));
    const agg = aggByUser.get(u.userId) ?? { ordersCount: 0, totalSpent: 0 };
    return {
      userId: u.userId,
      name: u.fullName || u.name || "",
      email: u.email,
      phone: u.phone || "",
      isAdmin,
      isStaff,
      roles,
      ordersCount: agg.ordersCount,
      totalSpent: agg.totalSpent,
      joinedAt: u.joinedAt,
    };
  });

  return NextResponse.json({ items });
}

export async function PATCH(req: NextRequest) {
  let actor;
  try {
    actor = await requireRoles("admin", "super_admin");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const body = (await req.json()) as { userId?: string; makeAdmin?: boolean };
  if (!body.userId || typeof body.makeAdmin !== "boolean") {
    return NextResponse.json({ error: "userId and makeAdmin required" }, { status: 400 });
  }

  if (body.userId === actor.id && !body.makeAdmin) {
    return NextResponse.json({ error: "CANNOT_DEMOTE_SELF" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(userRoles)
    .where(and(eq(userRoles.userId, body.userId), eq(userRoles.role, "admin")));

  if (body.makeAdmin) {
    if (existing.length === 0) {
      await db.insert(userRoles).values({
        id: randomUUID(),
        userId: body.userId,
        role: "admin",
      });
    }
  } else {
    await db
      .delete(userRoles)
      .where(and(eq(userRoles.userId, body.userId), eq(userRoles.role, "admin")));
  }

  return NextResponse.json({ ok: true });
}

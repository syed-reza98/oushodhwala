import { NextRequest, NextResponse } from "next/server";
import { and, eq, like, or, ne } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/server/db";
import { profiles, userRoles, users } from "@/server/db/schema";
import { requireRoles, requireStaff } from "@/server/services/authz";
import type { AppRole } from "@/server/auth/roles";

export const dynamic = "force-dynamic";

const ASSIGNABLE: AppRole[] = [
  "super_admin",
  "admin",
  "erp_manager",
  "accountant",
  "support_agent",
  "pharmacist",
  "rider",
];

const STAFF_ROLE_SET = new Set<string>(ASSIGNABLE);

function isAssignable(role: string): role is AppRole {
  return ASSIGNABLE.includes(role as AppRole);
}

export async function GET(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const kind = req.nextUrl.searchParams.get("kind") ?? "staff";
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();

  if (kind === "search") {
    if (q.length < 2) {
      return NextResponse.json({ items: [] });
    }
    const rows = await db
      .select({
        userId: users.id,
        email: users.email,
        name: users.name,
        phone: profiles.phone,
        fullName: profiles.fullName,
      })
      .from(users)
      .leftJoin(profiles, eq(profiles.id, users.id))
      .where(
        or(
          like(users.email, `%${q}%`),
          like(users.name, `%${q}%`),
          like(profiles.fullName, `%${q}%`),
          like(profiles.phone, `%${q}%`),
        ),
      )
      .limit(8);

    const roleRows = await db.select({ userId: userRoles.userId, role: userRoles.role }).from(userRoles);
    const rolesByUser = new Map<string, string[]>();
    for (const r of roleRows) {
      const list = rolesByUser.get(r.userId) ?? [];
      list.push(r.role);
      rolesByUser.set(r.userId, list);
    }

    return NextResponse.json({
      items: rows.map((u) => ({
        userId: u.userId,
        name: u.fullName || u.name || "",
        email: u.email,
        phone: u.phone || "",
        roles: (rolesByUser.get(u.userId) ?? []).filter((r) => r !== "user"),
      })),
    });
  }

  // kind=staff — users with any assignable staff role
  const roleRows = await db
    .select({ userId: userRoles.userId, role: userRoles.role })
    .from(userRoles)
    .where(ne(userRoles.role, "user"));

  const rolesByUser = new Map<string, string[]>();
  for (const r of roleRows) {
    if (!STAFF_ROLE_SET.has(r.role)) continue;
    const list = rolesByUser.get(r.userId) ?? [];
    list.push(r.role);
    rolesByUser.set(r.userId, list);
  }

  const staffIds = [...rolesByUser.keys()];
  if (staffIds.length === 0) {
    return NextResponse.json({ items: [] });
  }

  const userRows = await db
    .select({
      userId: users.id,
      email: users.email,
      name: users.name,
      phone: profiles.phone,
      fullName: profiles.fullName,
    })
    .from(users)
    .leftJoin(profiles, eq(profiles.id, users.id));

  const items = userRows
    .filter((u) => rolesByUser.has(u.userId))
    .map((u) => ({
      userId: u.userId,
      name: u.fullName || u.name || "",
      email: u.email,
      phone: u.phone || "",
      roles: rolesByUser.get(u.userId) ?? [],
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "bn"));

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

  const body = (await req.json()) as { userId?: string; role?: string; grant?: boolean };
  if (!body.userId || !body.role || typeof body.grant !== "boolean") {
    return NextResponse.json({ error: "userId, role, grant required" }, { status: 400 });
  }
  if (!isAssignable(body.role)) {
    return NextResponse.json({ error: "INVALID_ROLE" }, { status: 400 });
  }

  const role = body.role;
  const isElevated = role === "admin" || role === "super_admin";
  if (isElevated && !actor.roles.includes("super_admin")) {
    return NextResponse.json({ error: "SUPER_ADMIN_REQUIRED" }, { status: 403 });
  }

  if (
    body.userId === actor.id &&
    !body.grant &&
    (role === "admin" || role === "super_admin")
  ) {
    return NextResponse.json({ error: "CANNOT_DEMOTE_SELF" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(userRoles)
    .where(and(eq(userRoles.userId, body.userId), eq(userRoles.role, role)));

  if (body.grant) {
    if (existing.length === 0) {
      await db.insert(userRoles).values({
        id: randomUUID(),
        userId: body.userId,
        role,
      });
    }
  } else {
    await db
      .delete(userRoles)
      .where(and(eq(userRoles.userId, body.userId), eq(userRoles.role, role)));
  }

  return NextResponse.json({ ok: true });
}

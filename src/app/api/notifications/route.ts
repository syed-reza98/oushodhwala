import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/server/auth/config";
import { db } from "@/server/db";
import { notifications } from "@/server/db/schema";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const kind = req.nextUrl.searchParams.get("kind");
  const rows =
    kind && kind !== "all"
      ? await db
          .select()
          .from(notifications)
          .where(and(eq(notifications.userId, session.user.id), eq(notifications.kind, kind)))
          .orderBy(desc(notifications.createdAt))
          .limit(100)
      : await db
          .select()
          .from(notifications)
          .where(eq(notifications.userId, session.user.id))
          .orderBy(desc(notifications.createdAt))
          .limit(100);

  return NextResponse.json({
    items: rows.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      kind: n.kind,
      orderNo: n.orderNo,
      read: n.read,
      createdAt: n.createdAt,
    })),
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await req.json()) as { id?: string; read?: boolean; all?: boolean };
  if (body.all) {
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, session.user.id));
    return NextResponse.json({ ok: true });
  }
  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  await db
    .update(notifications)
    .set({ read: body.read ?? true })
    .where(and(eq(notifications.id, body.id), eq(notifications.userId, session.user.id)));
  return NextResponse.json({ ok: true });
}

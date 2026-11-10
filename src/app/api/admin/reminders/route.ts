import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  appointmentReminders,
  appointments,
  notifications,
} from "@/server/db/schema";
import { requireStaff } from "@/server/services/authz";

export const dynamic = "force-dynamic";

function nowSql() {
  return new Date().toISOString().slice(0, 23).replace("T", " ");
}

function fmtBn(dt: string) {
  try {
    const d = new Date(dt.includes("T") ? dt : dt.replace(" ", "T"));
    return d.toLocaleString("bn-BD", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return dt;
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const status = (req.nextUrl.searchParams.get("status") ?? "all").trim();
  const filters = [];
  if (status !== "all") filters.push(eq(appointmentReminders.status, status));

  const rows = await db
    .select()
    .from(appointmentReminders)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(appointmentReminders.createdAt))
    .limit(100);

  const [queued] = await db
    .select({ n: sql<number>`count(*)` })
    .from(appointmentReminders)
    .where(eq(appointmentReminders.status, "queued"));
  const [sent] = await db
    .select({ n: sql<number>`count(*)` })
    .from(appointmentReminders)
    .where(eq(appointmentReminders.status, "sent"));

  return NextResponse.json({
    counts: { queued: Number(queued?.n ?? 0), sent: Number(sent?.n ?? 0) },
    items: rows.map((r) => ({
      id: r.id,
      appointmentId: r.appointmentId,
      userId: r.userId,
      channel: r.channel,
      target: r.target,
      body: r.body,
      status: r.status,
      sentAt: r.sentAt,
      createdAt: r.createdAt,
    })),
  });
}

/** Queue reminders for upcoming confirmed appointments (local stand-in for WhatsApp/SMS). */
export async function POST(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    withinHours?: number;
    id?: string;
  };

  if (body.action === "mark_sent" && body.id) {
    await db
      .update(appointmentReminders)
      .set({ status: "sent", sentAt: nowSql() })
      .where(eq(appointmentReminders.id, body.id));
    return NextResponse.json({ ok: true });
  }

  if (body.action !== "queue") {
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }

  const withinHours = Math.min(Math.max(Number(body.withinHours) || 24, 1), 72);
  const now = new Date();
  const until = new Date(now.getTime() + withinHours * 3600e3);
  const nowStr = nowSql();
  const untilStr = until.toISOString().slice(0, 23).replace("T", " ");

  const upcoming = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.status, "confirmed"),
        isNull(appointments.reminderSentAt),
        gte(appointments.scheduledAt, nowStr),
        lte(appointments.scheduledAt, untilStr),
      ),
    )
    .orderBy(asc(appointments.scheduledAt))
    .limit(80);

  let queued = 0;
  for (const a of upcoming) {
    const text =
      `রিমাইন্ডার: ${a.doctorName} এর সাথে আপনার কনসালটেশন ${fmtBn(a.scheduledAt)} এ। ইনভয়েস #${a.invoiceNo}` +
      (a.joinUrl ? ` | ভিডিও জয়েন লিংক: ${a.joinUrl}` : "");

    const channels: { channel: string; target: string; status: string; sentAt: string | null }[] = [
      { channel: "whatsapp", target: a.phone, status: "queued", sentAt: null },
      { channel: "sms", target: a.phone, status: "queued", sentAt: null },
      { channel: "email", target: "", status: "queued", sentAt: null },
      { channel: "app", target: "", status: "sent", sentAt: nowStr },
    ];

    for (const ch of channels) {
      await db.insert(appointmentReminders).values({
        id: randomUUID(),
        appointmentId: a.id,
        userId: a.userId,
        channel: ch.channel,
        target: ch.target,
        body: text,
        status: ch.status,
        sentAt: ch.sentAt,
      });
    }

    await db.insert(notifications).values({
      id: randomUUID(),
      userId: a.userId,
      title: "কনসালটেশন রিমাইন্ডার",
      body: text,
      kind: "appointment",
      orderNo: a.invoiceNo,
      read: false,
    });

    await db
      .update(appointments)
      .set({ reminderSentAt: nowStr })
      .where(eq(appointments.id, a.id));
    queued++;
  }

  return NextResponse.json({ ok: true, queued, withinHours });
}

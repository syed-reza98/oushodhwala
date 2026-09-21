import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { supportConversations, supportMessages, users } from "@/server/db/schema";
import { requireStaff } from "@/server/services/authz";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const conversationId = req.nextUrl.searchParams.get("conversationId");

  if (conversationId) {
    const messages = await db
      .select()
      .from(supportMessages)
      .where(eq(supportMessages.conversationId, conversationId))
      .orderBy(asc(supportMessages.createdAt))
      .limit(200);
    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        sender: m.sender,
        body: m.body,
        agentName: m.agentName,
        createdAt: m.createdAt,
      })),
    });
  }

  const rows = await db
    .select({
      id: supportConversations.id,
      userId: supportConversations.userId,
      title: supportConversations.title,
      status: supportConversations.status,
      agentName: supportConversations.agentName,
      lastMessageAt: supportConversations.lastMessageAt,
      unreadForAgent: supportConversations.unreadForAgent,
      email: users.email,
      name: users.name,
    })
    .from(supportConversations)
    .leftJoin(users, eq(users.id, supportConversations.userId))
    .orderBy(desc(supportConversations.lastMessageAt))
    .limit(100);

  return NextResponse.json({
    conversations: rows.map((c) => ({
      id: c.id,
      userId: c.userId,
      title: c.title,
      status: c.status,
      agentName: c.agentName,
      lastMessageAt: c.lastMessageAt,
      unreadForAgent: c.unreadForAgent,
      userEmail: c.email,
      userName: c.name,
    })),
  });
}

export async function PATCH(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const body = (await req.json()) as { id?: string; status?: string };
  if (!body.id || !body.status) {
    return NextResponse.json({ error: "id and status required" }, { status: 400 });
  }
  await db
    .update(supportConversations)
    .set({ status: body.status, unreadForAgent: 0 })
    .where(eq(supportConversations.id, body.id));
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  let agent;
  try {
    agent = await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const body = (await req.json()) as {
    conversationId?: string;
    body?: string;
  };
  if (!body.conversationId || !body.body?.trim()) {
    return NextResponse.json({ error: "conversationId and body required" }, { status: 400 });
  }

  const now = new Date().toISOString().slice(0, 23).replace("T", " ");
  const id = randomUUID();
  await db.insert(supportMessages).values({
    id,
    conversationId: body.conversationId,
    userId: agent.id,
    sender: "agent",
    body: body.body.trim(),
    agentName: agent.name || agent.email || "Agent",
  });
  await db
    .update(supportConversations)
    .set({
      lastMessageAt: now,
      agentId: agent.id,
      agentName: agent.name || agent.email || "Agent",
      agentActive: true,
      agentLastSeen: now,
      unreadForAgent: 0,
      unreadForUser: 1,
      status: "open",
    })
    .where(eq(supportConversations.id, body.conversationId));

  return NextResponse.json({ ok: true, id });
}

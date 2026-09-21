import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, ne } from "drizzle-orm";
import { auth } from "@/server/auth/config";
import { db } from "@/server/db";
import { supportConversations, supportMessages } from "@/server/db/schema";
import { replySupportAI } from "@/server/actions/support";

export const dynamic = "force-dynamic";

function nowSql() {
  return new Date().toISOString().slice(0, 23).replace("T", " ");
}

async function requireSessionUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
  return session.user;
}

/** Logged-in user: get-or-create open conversation + messages */
export async function GET() {
  let user;
  try {
    user = await requireSessionUser();
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let [conv] = await db
    .select()
    .from(supportConversations)
    .where(
      and(eq(supportConversations.userId, user.id), ne(supportConversations.status, "closed")),
    )
    .orderBy(desc(supportConversations.lastMessageAt))
    .limit(1);

  if (!conv) {
    const id = randomUUID();
    await db.insert(supportConversations).values({
      id,
      userId: user.id,
      title: "Support",
      status: "open",
    });
    [conv] = await db
      .select()
      .from(supportConversations)
      .where(eq(supportConversations.id, id))
      .limit(1);
  }

  if (!conv) {
    return NextResponse.json({ error: "create failed" }, { status: 500 });
  }

  await db
    .update(supportConversations)
    .set({ unreadForUser: 0 })
    .where(eq(supportConversations.id, conv.id));

  const messages = await db
    .select()
    .from(supportMessages)
    .where(eq(supportMessages.conversationId, conv.id))
    .orderBy(asc(supportMessages.createdAt))
    .limit(200);

  return NextResponse.json({
    conversation: {
      id: conv.id,
      status: conv.status,
      agentActive: conv.agentActive,
      agentName: conv.agentName,
      agentLastSeen: conv.agentLastSeen,
    },
    messages: messages.map((m) => ({
      id: m.id,
      sender: m.sender,
      body: m.body,
      agent_name: m.agentName,
      created_at: m.createdAt,
    })),
  });
}

/** Send user message; optionally trigger AI reply */
export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireSessionUser();
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await req.json()) as {
    conversationId?: string;
    body?: string;
    lang?: "bn" | "en";
    askAi?: boolean;
  };
  if (!body.conversationId || !body.body?.trim()) {
    return NextResponse.json({ error: "conversationId and body required" }, { status: 400 });
  }

  const [conv] = await db
    .select()
    .from(supportConversations)
    .where(
      and(
        eq(supportConversations.id, body.conversationId),
        eq(supportConversations.userId, user.id),
      ),
    )
    .limit(1);
  if (!conv) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const now = nowSql();
  const id = randomUUID();
  await db.insert(supportMessages).values({
    id,
    conversationId: conv.id,
    userId: user.id,
    sender: "user",
    body: body.body.trim(),
    agentName: "",
  });
  await db
    .update(supportConversations)
    .set({
      lastMessageAt: now,
      unreadForAgent: (conv.unreadForAgent ?? 0) + 1,
      status: "open",
    })
    .where(eq(supportConversations.id, conv.id));

  let ai: { skipped: boolean; text?: string; reason?: string } | null = null;
  if (body.askAi !== false) {
    ai = await replySupportAI({
      conversationId: conv.id,
      lang: body.lang === "en" ? "en" : "bn",
    });
  }

  const messages = await db
    .select()
    .from(supportMessages)
    .where(eq(supportMessages.conversationId, conv.id))
    .orderBy(asc(supportMessages.createdAt))
    .limit(200);

  return NextResponse.json({
    ok: true,
    id,
    ai,
    messages: messages.map((m) => ({
      id: m.id,
      sender: m.sender,
      body: m.body,
      agent_name: m.agentName,
      created_at: m.createdAt,
    })),
  });
}

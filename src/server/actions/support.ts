"use server";

import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/server/db";
import { products, supportConversations, supportMessages } from "@/server/db/schema";
import { aiConfigured } from "@/server/ai/gateway";

const AGENT_WINDOW_MS = 5 * 60 * 1000;

function nowSql() {
  return new Date().toISOString().slice(0, 23).replace("T", " ");
}

function agentIsLive(c: {
  agentActive: boolean;
  agentLastSeen: string | null;
}): boolean {
  if (!c.agentActive) return false;
  if (!c.agentLastSeen) return true;
  return Date.now() - new Date(c.agentLastSeen).getTime() < AGENT_WINDOW_MS;
}

const SYSTEM_BN = `তুমি "ঔষধওয়ালা" অনলাইন ফার্মেসির AI সহকারী। সংক্ষিপ্ত ভদ্র বাংলায় উত্তর দাও।
হটলাইন ১৬৭০০ (২৪/৭)। ডোজ/চিকিৎসা পরামর্শে ডাক্তার দেখতে বলো। প্রেসক্রিপশন ঔষধ প্রেসক্রিপশন ছাড়া দেবে না।
উত্তর ১৫০ শব্দের মধ্যে। নিচে ক্যাটালগ স্নিপেট থাকলে সেটা ব্যবহার করো — দাম অনুমান করো না।`;

const SYSTEM_EN = `You are the Oushodhwala online pharmacy AI assistant. Answer briefly in English.
Hotline 16700 (24/7). For dosing/treatment, advise seeing a doctor. Do not dispense Rx without prescription.
Keep under 150 words. Use catalog snippets below when present — never invent prices.`;

async function catalogSnippet(query: string): Promise<string> {
  const q = query.trim().replace(/[%_]/g, " ").slice(0, 80);
  if (q.length < 2) return "";
  const rows = await db
    .select({
      name: products.name,
      en: products.en,
      price: products.price,
      stock: products.stock,
      strength: products.strength,
      form: products.form,
    })
    .from(products)
    .where(
      and(
        eq(products.active, true),
        or(
          like(products.name, `%${q}%`),
          like(products.en, `%${q}%`),
          like(products.generic, `%${q}%`),
          like(products.brand, `%${q}%`),
        ),
      ),
    )
    .orderBy(desc(products.stock))
    .limit(6);
  if (!rows.length) return "";
  return rows
    .map(
      (r) =>
        `- ${r.name}${r.en ? ` (${r.en})` : ""}${r.strength ? ` ${r.strength}` : ""}${r.form ? ` ${r.form}` : ""} — ৳${r.price} · stock ${r.stock}`,
    )
    .join("\n");
}

export async function replySupportAI(input: {
  conversationId: string;
  lang: "bn" | "en";
}): Promise<{ skipped: boolean; reason?: string; text?: string }> {
  const [conv] = await db
    .select()
    .from(supportConversations)
    .where(eq(supportConversations.id, input.conversationId))
    .limit(1);
  if (!conv) return { skipped: true, reason: "missing" };
  if (agentIsLive(conv)) return { skipped: true, reason: "agent_active" };
  if (!aiConfigured()) {
    const fallback =
      input.lang === "en"
        ? "Thanks — our team will reply soon. For urgent help call 16700 (24/7)."
        : "ধন্যবাদ — আমাদের টিম শীঘ্রই জবাব দেবে। জরুরি হলে ১৬৭০০ (২৪/৭) এ কল করুন।";
    const id = randomUUID();
    await db.insert(supportMessages).values({
      id,
      conversationId: conv.id,
      userId: conv.userId,
      sender: "ai",
      body: fallback,
      agentName: "",
    });
    await db
      .update(supportConversations)
      .set({ lastMessageAt: nowSql(), unreadForUser: sql`${supportConversations.unreadForUser} + 1` })
      .where(eq(supportConversations.id, conv.id));
    return { skipped: false, text: fallback };
  }

  const rows = await db
    .select({ sender: supportMessages.sender, body: supportMessages.body })
    .from(supportMessages)
    .where(eq(supportMessages.conversationId, conv.id))
    .orderBy(asc(supportMessages.createdAt))
    .limit(16);
  if (!rows.length) return { skipped: true, reason: "empty" };

  const lastUser = [...rows].reverse().find((m) => m.sender === "user");
  const snippet = lastUser ? await catalogSnippet(lastUser.body) : "";

  try {
    const { createOpenAICompatible } = await import("@ai-sdk/openai-compatible");
    const { generateText } = await import("ai");
    const key = process.env.LOVABLE_API_KEY || process.env.AI_GATEWAY_API_KEY || "";
    const provider = createOpenAICompatible({
      name: "lovable",
      apiKey: key,
      baseURL: process.env.AI_GATEWAY_BASE_URL || "https://api.openai.com/v1",
    });

    const history = rows.map((m) => ({
      role: (m.sender === "user" ? "user" : "assistant") as "user" | "assistant",
      content:
        m.sender === "agent" ? `[Customer care] ${m.body}` : m.body,
    }));

    const { text: raw } = await generateText({
      model: provider(process.env.AI_MODEL || "gpt-4o-mini"),
      system:
        (input.lang === "en" ? SYSTEM_EN : SYSTEM_BN) +
        (snippet ? `\n\nCatalog matches:\n${snippet}` : ""),
      messages: history,
      maxOutputTokens: 600,
    });

    // re-check agent takeover
    const [again] = await db
      .select()
      .from(supportConversations)
      .where(eq(supportConversations.id, conv.id))
      .limit(1);
    if (again && agentIsLive(again)) return { skipped: true, reason: "agent_active" };

    const text =
      raw.trim() ||
      (input.lang === "en"
        ? "Sorry, I couldn't find that."
        : "দুঃখিত, এই মুহূর্তে উত্তর দিতে পারছি না।");

    const id = randomUUID();
    await db.insert(supportMessages).values({
      id,
      conversationId: conv.id,
      userId: conv.userId,
      sender: "ai",
      body: text,
      agentName: "",
    });
    await db
      .update(supportConversations)
      .set({
        lastMessageAt: nowSql(),
        unreadForUser: sql`${supportConversations.unreadForUser} + 1`,
      })
      .where(eq(supportConversations.id, conv.id));

    return { skipped: false, text };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { skipped: true, reason: msg.slice(0, 120) };
  }
}

export async function askSupportGuest(input: {
  lang: "bn" | "en";
  messages: { role: "user" | "assistant"; content: string }[];
}): Promise<{ text: string }> {
  const last = [...input.messages].reverse().find((m) => m.role === "user");
  const snippet = last ? await catalogSnippet(last.content) : "";

  if (!aiConfigured()) {
    return {
      text:
        input.lang === "en"
          ? "Guest mode: sign in for order help, or call 16700. Browse /products for prices."
          : "গেস্ট মোড: অর্ডার সাহায্যের জন্য লগইন করুন, অথবা ১৬৭০০ এ কল করুন। দামের জন্য /products দেখুন।",
    };
  }

  try {
    const { createOpenAICompatible } = await import("@ai-sdk/openai-compatible");
    const { generateText } = await import("ai");
    const key = process.env.LOVABLE_API_KEY || process.env.AI_GATEWAY_API_KEY || "";
    const provider = createOpenAICompatible({
      name: "lovable",
      apiKey: key,
      baseURL: process.env.AI_GATEWAY_BASE_URL || "https://api.openai.com/v1",
    });
    const { text } = await generateText({
      model: provider(process.env.AI_MODEL || "gpt-4o-mini"),
      system:
        (input.lang === "en" ? SYSTEM_EN : SYSTEM_BN) +
        "\nGuest is not signed in — do not invent personal order data; ask them to sign in for that." +
        (snippet ? `\n\nCatalog matches:\n${snippet}` : ""),
      messages: input.messages.slice(-12),
      maxOutputTokens: 500,
    });
    return {
      text:
        text.trim() ||
        (input.lang === "en" ? "Sorry, I couldn't find that." : "দুঃখিত, উত্তর পাওয়া যায়নি।"),
    };
  } catch {
    return {
      text:
        input.lang === "en"
          ? "AI is briefly unavailable. Please try again or call 16700."
          : "AI সাময়িকভাবে অনুপলব্ধ। আবার চেষ্টা করুন বা ১৬৭০০ এ কল করুন।",
    };
  }
}

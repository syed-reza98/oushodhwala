import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { apiEndpoints, apiIntegrations, apiTestLogs } from "@/server/db/schema";
import { requireStaff } from "@/server/services/authz";

export const dynamic = "force-dynamic";

function isSafeHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

async function gate() {
  try {
    const user = await requireStaff();
    return { user } as const;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return {
      error: NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 }),
    } as const;
  }
}

export async function GET() {
  const g = await gate();
  if ("error" in g) return g.error;

  const [endpoints, logs, integrations] = await Promise.all([
    db.select().from(apiEndpoints).orderBy(asc(apiEndpoints.grp), asc(apiEndpoints.name)).limit(200),
    db.select().from(apiTestLogs).orderBy(desc(apiTestLogs.createdAt)).limit(50),
    db
      .select()
      .from(apiIntegrations)
      .orderBy(asc(apiIntegrations.category), asc(apiIntegrations.name))
      .limit(100),
  ]);

  return NextResponse.json({
    endpoints: endpoints.map((e) => ({
      id: e.id,
      name: e.name,
      grp: e.grp,
      method: e.method,
      url: e.url,
      headers: e.headers,
      sampleBody: e.sampleBody,
      authKind: e.authKind,
      active: e.active,
      note: e.note,
      lastStatus: e.lastStatus,
      lastOk: e.lastOk,
      lastMs: e.lastMs,
      lastTestedAt: e.lastTestedAt,
      createdAt: e.createdAt,
    })),
    logs: logs.map((l) => ({
      id: l.id,
      endpointId: l.endpointId,
      name: l.name,
      method: l.method,
      url: l.url,
      statusCode: l.statusCode,
      ok: l.ok,
      durationMs: l.durationMs,
      responseExcerpt: l.responseExcerpt,
      error: l.error,
      actorId: l.actorId,
      createdAt: l.createdAt,
    })),
    integrations: integrations.map((i) => ({
      id: i.id,
      provider: i.provider,
      name: i.name,
      category: i.category,
      baseUrl: i.baseUrl,
      senderId: i.senderId,
      active: i.active,
      note: i.note,
      lastOk: i.lastOk,
      lastStatus: i.lastStatus,
      lastTestedAt: i.lastTestedAt,
      // secrets omitted from list
    })),
  });
}

export async function POST(req: NextRequest) {
  const g = await gate();
  if ("error" in g) return g.error;
  const actorId = g.user.id;

  const body = (await req.json()) as {
    action?: string;
    id?: string;
    name?: string;
    grp?: string;
    method?: string;
    url?: string;
    headers?: Record<string, string> | null;
    sampleBody?: string;
    authKind?: string;
    active?: boolean;
    note?: string;
    provider?: string;
    category?: string;
    baseUrl?: string;
    senderId?: string;
    apiKey?: string;
    apiSecret?: string;
    config?: Record<string, unknown> | null;
    endpointId?: string;
  };

  const action = (body.action ?? "").trim();

  if (action === "upsert_endpoint") {
    const name = (body.name ?? "").trim();
    const url = (body.url ?? "").trim();
    if (!name || !url) {
      return NextResponse.json({ error: "name and url required" }, { status: 400 });
    }
    const id = (body.id ?? "").trim() || randomUUID();
    const payload = {
      name,
      grp: (body.grp ?? "general").trim() || "general",
      method: (body.method ?? "GET").trim().toUpperCase() || "GET",
      url,
      headers: body.headers ?? {},
      sampleBody: body.sampleBody ?? "",
      authKind: (body.authKind ?? "none").trim() || "none",
      active: body.active !== false,
      note: (body.note ?? "").trim(),
    };

    if (body.id) {
      await db.update(apiEndpoints).set(payload).where(eq(apiEndpoints.id, id));
    } else {
      await db.insert(apiEndpoints).values({ id, ...payload });
    }
    return NextResponse.json({ ok: true, id });
  }

  if (action === "upsert_integration") {
    const provider = (body.provider ?? "").trim();
    const name = (body.name ?? "").trim();
    if (!provider || !name) {
      return NextResponse.json({ error: "provider and name required" }, { status: 400 });
    }
    const id = (body.id ?? "").trim() || randomUUID();
    const payload = {
      provider,
      name,
      category: (body.category ?? "general").trim() || "general",
      baseUrl: (body.baseUrl ?? "").trim(),
      senderId: (body.senderId ?? "").trim(),
      apiKey: body.apiKey ?? "",
      apiSecret: body.apiSecret ?? "",
      config: body.config ?? {},
      note: (body.note ?? "").trim(),
      active: body.active !== false,
    };

    if (body.id) {
      await db.update(apiIntegrations).set(payload).where(eq(apiIntegrations.id, id));
    } else {
      await db.insert(apiIntegrations).values({ id, ...payload });
    }
    return NextResponse.json({ ok: true, id });
  }

  if (action === "run_test") {
    let endpoint: typeof apiEndpoints.$inferSelect | undefined;
    const endpointId = (body.endpointId ?? body.id ?? "").trim();
    if (endpointId) {
      const [row] = await db.select().from(apiEndpoints).where(eq(apiEndpoints.id, endpointId)).limit(1);
      endpoint = row;
    }

    const method = (body.method ?? endpoint?.method ?? "GET").trim().toUpperCase() || "GET";
    const url = (body.url ?? endpoint?.url ?? "").trim();
    const name = (body.name ?? endpoint?.name ?? url).trim() || "test";

    if (!url || !isSafeHttpUrl(url)) {
      return NextResponse.json({ error: "only http/https URLs allowed" }, { status: 400 });
    }

    const headers: Record<string, string> = {
      ...((endpoint?.headers as Record<string, string> | null) ?? {}),
      ...(body.headers ?? {}),
    };
    const sampleBody = body.sampleBody ?? endpoint?.sampleBody ?? "";
    const started = Date.now();
    let statusCode: number | null = null;
    let ok = false;
    let responseExcerpt = "";
    let error = "";

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const init: RequestInit = {
        method,
        headers,
        signal: ctrl.signal,
        redirect: "follow",
      };
      if (method !== "GET" && method !== "HEAD" && sampleBody) {
        init.body = sampleBody;
        if (!headers["Content-Type"] && !headers["content-type"]) {
          headers["Content-Type"] = "application/json";
        }
      }
      const res = await fetch(url, init);
      statusCode = res.status;
      ok = res.ok;
      const text = await res.text();
      responseExcerpt = text.slice(0, 2000);
    } catch (e) {
      error = e instanceof Error ? e.message : "FETCH_FAILED";
      ok = false;
    } finally {
      clearTimeout(timer);
    }

    const durationMs = Date.now() - started;
    const logId = randomUUID();
    const testedAt = new Date().toISOString().slice(0, 23).replace("T", " ");

    await db.insert(apiTestLogs).values({
      id: logId,
      endpointId: endpoint?.id ?? null,
      name,
      method,
      url,
      statusCode,
      ok,
      durationMs,
      responseExcerpt,
      error,
      actorId,
    });

    if (endpoint) {
      await db
        .update(apiEndpoints)
        .set({
          lastStatus: statusCode,
          lastOk: ok,
          lastMs: durationMs,
          lastTestedAt: testedAt,
        })
        .where(eq(apiEndpoints.id, endpoint.id));
    }

    return NextResponse.json({
      ok: true,
      result: { id: logId, statusCode, ok, durationMs, responseExcerpt, error },
    });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}

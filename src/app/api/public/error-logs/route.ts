import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { errorLogs } from "@/server/db/schema";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      message?: string;
      source?: string;
      path?: string;
      stack?: string;
      severity?: string;
    };

    const message = String(body.message ?? "").slice(0, 4000).trim();
    if (!message) {
      return NextResponse.json({ ok: false, error: "message required" }, { status: 400 });
    }

    await db.insert(errorLogs).values({
      id: crypto.randomUUID(),
      message,
      source: String(body.source ?? "client").slice(0, 128),
      path: String(body.path ?? "").slice(0, 512),
      stack: body.stack ? String(body.stack).slice(0, 8000) : null,
      severity: String(body.severity ?? "error").slice(0, 32),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[error-logs]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

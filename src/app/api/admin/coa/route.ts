import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { chartAccounts, journalEntries, journalLines } from "@/server/db/schema";
import { requireStaff } from "@/server/services/authz";

export const dynamic = "force-dynamic";

const KINDS = new Set(["asset", "liability", "equity", "income", "expense"]);

export async function GET() {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const [accounts, entries] = await Promise.all([
    db.select().from(chartAccounts).orderBy(asc(chartAccounts.code)),
    db.select().from(journalEntries).orderBy(desc(journalEntries.entryDate)).limit(40),
  ]);

  const entryIds = entries.map((e) => e.id);
  const lines =
    entryIds.length > 0
      ? await db.select().from(journalLines).where(inArray(journalLines.entryId, entryIds))
      : [];

  const linesByEntry = new Map<string, typeof lines>();
  for (const l of lines) {
    const list = linesByEntry.get(l.entryId) ?? [];
    list.push(l);
    linesByEntry.set(l.entryId, list);
  }

  return NextResponse.json({
    accounts: accounts.map((a) => ({
      code: a.code,
      name: a.name,
      nameEn: a.nameEn,
      kind: a.kind,
      active: a.active,
    })),
    entries: entries.map((e) => ({
      id: e.id,
      entryNo: e.entryNo,
      entryDate: e.entryDate,
      memo: e.memo,
      source: e.source,
      ref: e.ref,
      total: Number(e.total),
      lines: (linesByEntry.get(e.id) ?? []).map((l) => ({
        id: l.id,
        accountCode: l.accountCode,
        accountName: l.accountName,
        debit: Number(l.debit),
        credit: Number(l.credit),
        note: l.note,
      })),
    })),
  });
}

export async function POST(req: NextRequest) {
  let actorId: string | undefined;
  try {
    const user = await requireStaff();
    actorId = user.id;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const body = (await req.json()) as {
    action?: string;
    code?: string;
    name?: string;
    nameEn?: string;
    kind?: string;
    entryDate?: string;
    memo?: string;
    ref?: string;
    lines?: { accountCode?: string; debit?: number; credit?: number; note?: string }[];
  };

  if (body.action === "add_account") {
    const code = (body.code ?? "").trim();
    const name = (body.name ?? "").trim();
    const kind = (body.kind ?? "asset").trim();
    if (!code || !name || !KINDS.has(kind)) {
      return NextResponse.json({ error: "code/name/kind required" }, { status: 400 });
    }
    await db.insert(chartAccounts).values({
      code,
      name,
      nameEn: (body.nameEn ?? "").trim(),
      kind,
      active: true,
    });
    return NextResponse.json({ ok: true, code });
  }

  if (body.action === "post_journal") {
    const rawLines = (body.lines ?? [])
      .map((l) => ({
        accountCode: (l.accountCode ?? "").trim(),
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        note: (l.note ?? "").trim(),
      }))
      .filter((l) => l.accountCode && (l.debit > 0 || l.credit > 0));

    if (rawLines.length < 2) {
      return NextResponse.json({ error: "NEED_TWO_LINES" }, { status: 400 });
    }
    const dr = rawLines.reduce((a, l) => a + l.debit, 0);
    const cr = rawLines.reduce((a, l) => a + l.credit, 0);
    if (Math.round(dr * 100) !== Math.round(cr * 100)) {
      return NextResponse.json({ error: "UNBALANCED" }, { status: 400 });
    }

    const codes = [...new Set(rawLines.map((l) => l.accountCode))];
    const accts = await db.select().from(chartAccounts).where(inArray(chartAccounts.code, codes));
    const nameByCode = new Map(accts.map((a) => [a.code, a.name]));

    const id = randomUUID();
    const stamp = new Date();
    const entryNo = `JV-${stamp.toISOString().slice(2, 10).replace(/-/g, "")}-${id.slice(0, 5).toUpperCase()}`;
    const entryDate = (body.entryDate || stamp.toISOString().slice(0, 10)).slice(0, 10);

    await db.transaction(async (tx) => {
      await tx.insert(journalEntries).values({
        id,
        entryNo,
        entryDate,
        memo: (body.memo ?? "").trim(),
        source: "manual",
        ref: (body.ref ?? "").trim(),
        total: String(dr),
        createdBy: actorId ?? null,
      });
      for (const l of rawLines) {
        await tx.insert(journalLines).values({
          id: randomUUID(),
          entryId: id,
          accountCode: l.accountCode,
          accountName: nameByCode.get(l.accountCode) ?? "",
          debit: String(l.debit),
          credit: String(l.credit),
          note: l.note,
          party: "",
        });
      }
    });

    return NextResponse.json({ ok: true, id, entryNo, total: dr });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}

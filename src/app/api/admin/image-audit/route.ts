import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { products } from "@/server/db/schema";
import { requireStaff } from "@/server/services/authz";

export const dynamic = "force-dynamic";

const PAGE = 25;
const PLACEHOLDER_RE =
  /placeholder|placehold\.co|via\.placeholder|no[-_]?image|default[-_]?product|missing[-_]?image|1x1\.|blank\./i;

type AuditStatus = "ok" | "placeholder" | "duplicate" | "missing" | "broken" | "unknown";

type Audited = {
  id: string;
  name: string;
  en: string;
  imageUrl: string;
  medicineImageUrl: string;
  status: AuditStatus;
};

function classify(
  url: string,
  urlCounts: Map<string, number>,
): Exclude<AuditStatus, "broken" | "unknown"> {
  if (!url.trim()) return "missing";
  if (PLACEHOLDER_RE.test(url)) return "placeholder";
  if ((urlCounts.get(url) ?? 0) > 1) return "duplicate";
  return "ok";
}

async function loadAudited(): Promise<Audited[]> {
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      en: products.en,
      imageUrl: products.imageUrl,
      medicineImageUrl: products.medicineImageUrl,
      active: products.active,
    })
    .from(products)
    .where(eq(products.active, true))
    .orderBy(asc(products.name));

  const urlCounts = new Map<string, number>();
  for (const r of rows) {
    const u = (r.imageUrl ?? "").trim();
    if (!u) continue;
    urlCounts.set(u, (urlCounts.get(u) ?? 0) + 1);
  }

  return rows.map((r) => {
    const imageUrl = r.imageUrl ?? "";
    return {
      id: r.id,
      name: r.name,
      en: r.en ?? "",
      imageUrl,
      medicineImageUrl: r.medicineImageUrl ?? "",
      status: classify(imageUrl, urlCounts),
    };
  });
}

export async function GET(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const kind = req.nextUrl.searchParams.get("kind") ?? "list";
  const audited = await loadAudited();

  if (kind === "summary") {
    const counts: Record<string, number> = {
      ok: 0,
      placeholder: 0,
      duplicate: 0,
      missing: 0,
      broken: 0,
      unknown: 0,
    };
    let withMedicine = 0;
    for (const a of audited) {
      counts[a.status] = (counts[a.status] ?? 0) + 1;
      if (a.medicineImageUrl.trim()) withMedicine++;
    }
    return NextResponse.json({
      total: audited.length,
      counts,
      withMedicine,
    });
  }

  const status = (req.nextUrl.searchParams.get("status") ?? "all").trim();
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  const page = Math.max(0, Number(req.nextUrl.searchParams.get("page") ?? 0) || 0);

  let filtered = audited.filter((a) => {
    if (status === "all") return a.status !== "ok";
    return a.status === status;
  });
  if (q) {
    filtered = filtered.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.en.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q),
    );
  }

  const total = filtered.length;
  const items = filtered.slice(page * PAGE, page * PAGE + PAGE);

  return NextResponse.json({ items, count: total, page, pageSize: PAGE });
}

/** HEAD-check external URLs; mark broken when unreachable. Returns updated counts. */
export async function POST(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { action?: string; limit?: number };
  if (body.action !== "rescan") {
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }

  const limit = Math.min(Math.max(Number(body.limit) || 40, 1), 80);
  const audited = await loadAudited();
  const candidates = audited.filter(
    (a) =>
      a.status === "ok" &&
      /^https?:\/\//i.test(a.imageUrl) &&
      !a.imageUrl.includes("/uploads/"),
  );

  let checked = 0;
  let broken = 0;
  const brokenIds: string[] = [];

  for (const a of candidates.slice(0, limit)) {
    checked++;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch(a.imageUrl, {
        method: "HEAD",
        redirect: "follow",
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (!res.ok) {
        broken++;
        brokenIds.push(a.id);
      }
    } catch {
      broken++;
      brokenIds.push(a.id);
    }
  }

  return NextResponse.json({ ok: true, checked, broken, brokenIds });
}

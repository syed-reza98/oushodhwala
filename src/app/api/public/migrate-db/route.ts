import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== "oushodhwala_migrate_2026_xyz") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const results: Record<string, unknown> = {};

  // 1. Add city_zone to orders if missing
  try {
    await db.execute(sql`ALTER TABLE orders ADD COLUMN city_zone VARCHAR(128) NULL`);
    results.orders_city_zone = "added";
  } catch (e: unknown) {
    const err = e as { message?: string };
    results.orders_city_zone = err?.message?.includes("Duplicate column")
      ? "already exists"
      : err?.message;
  }

  // 2. Add token_expires_at, token_revoked, token_scope to deliveries if missing
  try {
    await db.execute(sql`ALTER TABLE deliveries ADD COLUMN token_expires_at DATETIME NULL`);
    results.deliveries_token_expires_at = "added";
  } catch (e: unknown) {
    const err = e as { message?: string };
    results.deliveries_token_expires_at = err?.message?.includes("Duplicate column")
      ? "already exists"
      : err?.message;
  }

  try {
    await db.execute(sql`ALTER TABLE deliveries ADD COLUMN token_revoked TINYINT(1) NOT NULL DEFAULT 0`);
    results.deliveries_token_revoked = "added";
  } catch (e: unknown) {
    const err = e as { message?: string };
    results.deliveries_token_revoked = err?.message?.includes("Duplicate column")
      ? "already exists"
      : err?.message;
  }

  try {
    await db.execute(sql`ALTER TABLE deliveries ADD COLUMN token_scope VARCHAR(64) NULL`);
    results.deliveries_token_scope = "added";
  } catch (e: unknown) {
    const err = e as { message?: string };
    results.deliveries_token_scope = err?.message?.includes("Duplicate column")
      ? "already exists"
      : err?.message;
  }

  // 3. Inspect columns
  try {
    const [ordersCols] = await db.execute(sql`DESCRIBE orders`);
    const [deliveriesCols] = await db.execute(sql`DESCRIBE deliveries`);
    results.ordersCols = (ordersCols as unknown as Array<{ Field: string }>).map((c) => c.Field);
    results.deliveriesCols = (deliveriesCols as unknown as Array<{ Field: string }>).map((c) => c.Field);
  } catch (e: unknown) {
    const err = e as { message?: string };
    results.describeError = err?.message;
  }

  return NextResponse.json({
    ok: true,
    results,
  });
}

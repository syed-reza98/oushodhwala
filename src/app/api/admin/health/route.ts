import { NextResponse } from "next/server";
import { and, count, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/server/db";
import {
  categories,
  deliveries,
  doctors,
  labTests,
  offers,
  orders,
  products,
  riders,
} from "@/server/db/schema";
import { requireStaff } from "@/server/services/authz";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const [
    [activeRiders],
    [totalRiders],
    [missingImg],
    [activeProducts],
    [activeDoctors],
    [activeCats],
    [activeLabs],
    [pendingOrders],
    [unassigned],
    [activeOffers],
  ] = await Promise.all([
    db.select({ c: count() }).from(riders).where(eq(riders.active, true)),
    db.select({ c: count() }).from(riders),
    db
      .select({ c: count() })
      .from(products)
      .where(
        and(
          eq(products.active, true),
          or(isNull(products.imageUrl), eq(products.imageUrl, "")),
        ),
      ),
    db.select({ c: count() }).from(products).where(eq(products.active, true)),
    db.select({ c: count() }).from(doctors).where(eq(doctors.active, true)),
    db.select({ c: count() }).from(categories).where(eq(categories.active, true)),
    db.select({ c: count() }).from(labTests).where(eq(labTests.active, true)),
    db
      .select({ c: count() })
      .from(orders)
      .where(inArray(orders.status, ["confirmed", "processing"])),
    db.select({ c: count() }).from(deliveries).where(isNull(deliveries.riderId)),
    db.select({ c: count() }).from(offers).where(eq(offers.active, true)),
  ]);

  return NextResponse.json({
    activeRiders: Number(activeRiders?.c ?? 0),
    totalRiders: Number(totalRiders?.c ?? 0),
    missingImg: Number(missingImg?.c ?? 0),
    activeProducts: Number(activeProducts?.c ?? 0),
    doctors: Number(activeDoctors?.c ?? 0),
    cats: Number(activeCats?.c ?? 0),
    labs: Number(activeLabs?.c ?? 0),
    pendingOrders: Number(pendingOrders?.c ?? 0),
    unassigned: Number(unassigned?.c ?? 0),
    offers: Number(activeOffers?.c ?? 0),
  });
}

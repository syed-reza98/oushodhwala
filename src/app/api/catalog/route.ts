import { NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  appSettings,
  categories,
  doctors,
  labTests,
  offers,
  products,
} from "@/server/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import { doctors as staticDoctors, labTests as staticLabTests } from "@/data/catalog";
import { normalizeSettingValue } from "@/server/settings/defs";

export const dynamic = "force-dynamic";

/** Full shop catalog payload for client hooks (replaces TanStack getCatalog). */
export async function GET() {
  const [productRows, categoryRows, offerRows, settingRows, labRows, doctorRows] =
    await Promise.all([
      db
        .select()
        .from(products)
        .where(eq(products.active, true))
        .orderBy(desc(products.reviews), products.name)
        .limit(120),
      db
        .select()
        .from(categories)
        .where(eq(categories.active, true))
        .orderBy(asc(categories.sortOrder)),
      db.select().from(offers).where(eq(offers.active, true)),
      db.select().from(appSettings),
      db
        .select()
        .from(labTests)
        .where(eq(labTests.active, true))
        .orderBy(asc(labTests.sortOrder), labTests.bn)
        .limit(200),
      db
        .select()
        .from(doctors)
        .where(eq(doctors.active, true))
        .orderBy(asc(doctors.sortOrder), doctors.name)
        .limit(200),
    ]);

  const labPayload =
    labRows.length > 0
      ? labRows.map((t) => ({
          id: t.id,
          bn: t.bn,
          en: t.en,
          price: Number(t.price),
          mrp: Number(t.mrp),
          grp: t.grp,
          prep: t.prep ?? "",
        }))
      : staticLabTests.map((t) => ({
          id: t.id,
          bn: t.bn,
          en: t.en,
          price: t.price,
          mrp: t.mrp,
          grp: t.group,
          prep: t.prep,
        }));

  const doctorPayload =
    doctorRows.length > 0
      ? doctorRows.map((d) => ({
          id: d.id,
          name: d.name,
          spec: d.spec,
          degree: d.degree,
          exp: d.exp,
          fee: Number(d.fee),
          emoji: d.emoji,
          photo_url: d.photoUrl,
          phone: d.phone,
          whatsapp: d.whatsapp,
          video_url: d.videoUrl,
          online: d.online,
          work_start: d.workStart,
          work_end: d.workEnd,
          slot_minutes: d.slotMinutes,
          work_days: Array.isArray(d.workDays)
            ? d.workDays
            : typeof d.workDays === "string"
              ? (() => {
                  try {
                    const parsed = JSON.parse(d.workDays) as unknown;
                    return Array.isArray(parsed) ? parsed : [0, 1, 2, 3, 4, 5, 6];
                  } catch {
                    return [0, 1, 2, 3, 4, 5, 6];
                  }
                })()
              : [0, 1, 2, 3, 4, 5, 6],
        }))
      : staticDoctors.map((d) => ({
          id: d.id,
          name: d.name,
          spec: d.spec,
          degree: d.degree,
          exp: d.exp,
          fee: d.fee,
          emoji: d.emoji,
          photo_url: "",
          phone: "",
          whatsapp: "",
          video_url: "",
          online: true,
          work_start: "10:00",
          work_end: "22:00",
          slot_minutes: 30,
          work_days: [0, 1, 2, 3, 4, 5, 6],
        }));

  return NextResponse.json({
    products: productRows,
    categories: categoryRows.map((c) => ({
      slug: c.slug,
      bn: c.name,
      en: c.nameEn ?? c.name,
      emoji: c.icon ?? "💊",
      kind: c.kind === "service" ? "service" : "product",
      home_delivery: c.homeDelivery,
      home_service: c.homeService,
      service_route: c.serviceRoute,
      description: c.description ?? "",
      description_en: c.descriptionEn ?? "",
      eta: c.eta,
      eta_en: c.etaEn,
      base_fee: Number(c.baseFee),
      active: c.active,
      sort_order: c.sortOrder,
    })),
    offers: offerRows.map((o) => ({
      id: o.id,
      code: o.code ?? "",
      title: o.title,
      subtitle: o.titleEn ?? "",
      emoji: "🎁",
      discount_pct: Number(o.discountPercent ?? 0),
      min_order: 0,
      max_discount: Number(o.discountAmount ?? 0),
    })),
    labTests: labPayload,
    doctors: doctorPayload,
    settings: settingRows.map((s) => ({
      key: s.key,
      value: normalizeSettingValue(s.value),
    })),
  });
}

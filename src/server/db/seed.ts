import "dotenv/config";
import { hash } from "bcryptjs";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  appSettings,
  categories,
  deliveryZones,
  doctors,
  labTests,
  products,
  profiles,
  userRoles,
  users,
} from "./schema";
import { ensureBuckets } from "@/server/storage/local";
import {
  categories as staticCategories,
  doctors as staticDoctors,
  labTests as staticLabTests,
} from "@/data/catalog";
import { APP_SETTING_DEFS } from "@/server/settings/defs";

async function main() {
  await ensureBuckets();

  const adminEmail = "admin@oushodhwala.local";
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, adminEmail))
    .limit(1);

  let adminId = existing[0]?.id;
  if (!adminId) {
    adminId = randomUUID();
    const passwordHash = await hash("Admin@12345", 10);
    await db.insert(users).values({
      id: adminId,
      email: adminEmail,
      passwordHash,
      name: "Super Admin",
    });
    await db.insert(profiles).values({
      id: adminId,
      fullName: "Super Admin",
      phone: "01700000000",
    });
    await db.insert(userRoles).values({
      id: randomUUID(),
      userId: adminId,
      role: "super_admin",
    });
    console.log("Created admin:", adminEmail, "/ Admin@12345");
  } else {
    console.log("Admin already exists:", adminEmail);
  }

  const catCount = await db.select().from(categories).limit(1);
  if (catCount.length === 0) {
    const catId = randomUUID();
    await db.insert(categories).values({
      id: catId,
      slug: "medicine",
      name: "ঔষধ",
      nameEn: "Medicine",
      sortOrder: 1,
      kind: "product",
    });

    await db.insert(products).values({
      id: randomUUID(),
      name: "Napa 500mg",
      en: "Napa 500mg",
      brand: "Beximco",
      category: "medicine",
      generic: "Paracetamol",
      form: "Tablet",
      strength: "500mg",
      price: "1.50",
      mrp: "2.00",
      stock: 100,
      active: true,
      description: "Pain and fever relief",
    });
    console.log("Seeded sample category + product");
  }

  const [svc] = await db
    .select()
    .from(categories)
    .where(eq(categories.kind, "service"))
    .limit(1);
  if (!svc) {
    let i = 0;
    for (const c of staticCategories.filter((x) => x.kind === "service")) {
      await db.insert(categories).values({
        id: randomUUID(),
        slug: c.slug,
        name: c.bn,
        nameEn: c.en,
        icon: c.emoji,
        kind: "service",
        homeDelivery: false,
        homeService: true,
        serviceRoute: c.serviceRoute || "/home-services",
        description: c.desc || null,
        descriptionEn: c.descEn || null,
        eta: c.eta || "",
        etaEn: c.etaEn || "",
        baseFee: String(c.baseFee || 0),
        sortOrder: 100 + i++,
        active: true,
      });
    }
    console.log("Seeded service categories");
  }

  const [lab] = await db.select().from(labTests).limit(1);
  if (!lab) {
    let i = 0;
    for (const t of staticLabTests) {
      await db.insert(labTests).values({
        id: t.id,
        bn: t.bn,
        en: t.en,
        price: String(t.price),
        mrp: String(t.mrp),
        grp: t.group,
        prep: t.prep,
        sortOrder: i++,
        active: true,
      });
    }
    console.log("Seeded lab tests:", staticLabTests.length);
  }

  const [doc] = await db.select().from(doctors).limit(1);
  if (!doc) {
    let i = 0;
    for (const d of staticDoctors) {
      await db.insert(doctors).values({
        id: d.id,
        name: d.name,
        spec: d.spec,
        degree: d.degree,
        exp: d.exp,
        fee: String(d.fee),
        emoji: d.emoji,
        sortOrder: i++,
        active: true,
        online: true,
        workDays: [0, 1, 2, 3, 4, 5, 6],
      });
    }
    console.log("Seeded doctors:", staticDoctors.length);
  }

  const existingSettings = await db.select({ key: appSettings.key }).from(appSettings);
  const have = new Set(existingSettings.map((s) => s.key));
  let settingsAdded = 0;
  for (const d of APP_SETTING_DEFS) {
    if (have.has(d.key)) continue;
    await db.insert(appSettings).values({ key: d.key, value: d.defaultValue });
    settingsAdded++;
  }
  if (settingsAdded) console.log("Seeded app_settings:", settingsAdded);

  const existingZones = await db.select({ id: deliveryZones.id }).from(deliveryZones).limit(1);
  if (existingZones.length === 0) {
    const defaults: {
      name: string;
      nameEn: string;
      district: string;
      thana: string;
      fee: string;
      expressFee: string;
      freeAbove: string;
      etaMinutes: number;
      sortOrder: number;
    }[] = [
      {
        name: "ধানমন্ডি",
        nameEn: "Dhanmondi",
        district: "ঢাকা",
        thana: "ধানমন্ডি",
        fee: "40",
        expressFee: "90",
        freeAbove: "1000",
        etaMinutes: 45,
        sortOrder: 1,
      },
      {
        name: "মিরপুর",
        nameEn: "Mirpur",
        district: "ঢাকা",
        thana: "মিরপুর",
        fee: "50",
        expressFee: "100",
        freeAbove: "1200",
        etaMinutes: 60,
        sortOrder: 2,
      },
      {
        name: "উত্তরা",
        nameEn: "Uttara",
        district: "ঢাকা",
        thana: "উত্তরা",
        fee: "60",
        expressFee: "120",
        freeAbove: "1500",
        etaMinutes: 75,
        sortOrder: 3,
      },
      {
        name: "গুলশান",
        nameEn: "Gulshan",
        district: "ঢাকা",
        thana: "গুলশান",
        fee: "50",
        expressFee: "100",
        freeAbove: "1200",
        etaMinutes: 50,
        sortOrder: 4,
      },
      {
        name: "মোহাম্মদপুর",
        nameEn: "Mohammadpur",
        district: "ঢাকা",
        thana: "মোহাম্মদপুর",
        fee: "45",
        expressFee: "95",
        freeAbove: "1000",
        etaMinutes: 55,
        sortOrder: 5,
      },
      {
        name: "ঢাকার বাইরে",
        nameEn: "Outside Dhaka",
        district: "",
        thana: "",
        fee: "120",
        expressFee: "0",
        freeAbove: "3000",
        etaMinutes: 1440,
        sortOrder: 9,
      },
    ];
    for (const z of defaults) {
      await db.insert(deliveryZones).values({
        id: randomUUID(),
        name: z.name,
        nameEn: z.nameEn,
        district: z.district,
        thana: z.thana,
        fee: z.fee,
        expressFee: z.expressFee,
        freeAbove: z.freeAbove,
        minOrder: "0",
        etaMinutes: z.etaMinutes,
        active: true,
        sortOrder: z.sortOrder,
      });
    }
    console.log("Seeded delivery_zones:", defaults.length);
  }

  console.log("Seed complete");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

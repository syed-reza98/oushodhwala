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
  offers,
  products,
  profiles,
  userRoles,
  users,
} from "./schema";
import { ensureBuckets } from "@/server/storage";
import {
  categories as staticCategories,
  doctors as staticDoctors,
  labTests as staticLabTests,
  products as staticProducts,
} from "@/data/catalog";
import { APP_SETTING_DEFS } from "@/server/settings/defs";
import { generateAllMedicineImages } from "../../../scripts/generate-medicine-images";

async function main() {
  await ensureBuckets();

  // 1. Super Admin
  const adminEmail = "admin@oushodhwala.local";
  const existingAdmin = await db
    .select()
    .from(users)
    .where(eq(users.email, adminEmail))
    .limit(1);

  let adminId = existingAdmin[0]?.id;
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

  // 2. Categories (Product & Service)
  let catIndex = 1;
  for (const c of staticCategories) {
    const [existing] = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, c.slug))
      .limit(1);

    const data = {
      slug: c.slug,
      name: c.bn,
      nameEn: c.en,
      icon: c.emoji,
      kind: c.kind === "service" ? ("service" as const) : ("product" as const),
      homeDelivery: c.homeDelivery,
      homeService: c.homeService,
      serviceRoute: c.serviceRoute || "",
      description: c.desc || "",
      descriptionEn: c.descEn || "",
      eta: c.eta || "",
      etaEn: c.etaEn || "",
      baseFee: String(c.baseFee || 0),
      sortOrder: catIndex++,
      active: true,
    };

    if (existing) {
      await db.update(categories).set(data).where(eq(categories.id, existing.id));
    } else {
      await db.insert(categories).values({ id: randomUUID(), ...data });
    }
  }
  console.log("Synced categories:", staticCategories.length);

  // 3. Generate Visual Medicine Images
  const imageMap = await generateAllMedicineImages();

  // 4. Products (Medicines, Healthcare, Devices, etc.)
  let prodCount = 0;
  for (const p of staticProducts) {
    const imageUrl = imageMap[p.id] ?? `/uploads/product-images/${p.id}/box/${p.id}.svg`;
    const [existing] = await db
      .select()
      .from(products)
      .where(eq(products.id, p.id))
      .limit(1);

    const prodData = {
      name: p.name,
      en: p.en,
      baseName: p.en.split(" ")[0],
      brand: p.brand,
      category: p.category,
      generic: p.generic,
      form: p.form,
      pack: p.pack,
      price: String(p.price),
      mrp: String(p.mrp),
      stock: 120,
      lowStockThreshold: 15,
      rx: p.rx,
      active: true,
      imageUrl,
      medicineImageUrl: imageUrl,
      emoji: p.emoji,
      rating: String(p.rating),
      reviews: p.reviews,
      description: p.desc,
      descriptionEn: p.desc,
    };

    if (existing) {
      await db.update(products).set(prodData).where(eq(products.id, p.id));
    } else {
      await db.insert(products).values({ id: p.id, ...prodData });
    }
    prodCount++;
  }
  console.log("Synced catalog products with images:", prodCount);

  // 5. Promotional Offers
  const defaultOffers = [
    {
      code: "WELCOME50",
      title: "ওয়েলকাম অফার",
      titleEn: "Welcome Discount 50 Tk",
      description: "প্রথম অর্ডারে ৫০ টাকা ছাড়",
      discountPercent: "0",
      discountAmount: "50",
    },
    {
      code: "HEALTH10",
      title: "১০% হেলথকেয়ার ডিসকাউন্ট",
      titleEn: "10% Health Discount",
      description: "সব ঔষধ ও স্বাস্থ্য সামগ্রীতে ১০% ছাড়",
      discountPercent: "10",
      discountAmount: "100",
    },
    {
      code: "EID25",
      title: "ঈদ স্পেশাল অফার",
      titleEn: "Eid Special Discount",
      description: "বিশেষ অর্ডারে ২৫ টাকা অতিরিক্ত ছাড়",
      discountPercent: "5",
      discountAmount: "50",
    },
  ];

  for (const o of defaultOffers) {
    const [existing] = await db.select().from(offers).where(eq(offers.code, o.code)).limit(1);
    if (!existing) {
      await db.insert(offers).values({
        id: randomUUID(),
        code: o.code,
        title: o.title,
        titleEn: o.titleEn,
        description: o.description,
        discountPercent: o.discountPercent,
        discountAmount: o.discountAmount,
        active: true,
      });
    }
  }
  console.log("Synced offers:", defaultOffers.length);

  // 6. Lab Tests
  let labIndex = 1;
  for (const t of staticLabTests) {
    const [existing] = await db.select().from(labTests).where(eq(labTests.id, t.id)).limit(1);
    const data = {
      bn: t.bn,
      en: t.en,
      price: String(t.price),
      mrp: String(t.mrp),
      grp: t.group,
      prep: t.prep,
      sortOrder: labIndex++,
      active: true,
    };
    if (existing) {
      await db.update(labTests).set(data).where(eq(labTests.id, t.id));
    } else {
      await db.insert(labTests).values({ id: t.id, ...data });
    }
  }
  console.log("Synced lab tests:", staticLabTests.length);

  // 7. Doctors
  let docIndex = 1;
  for (const d of staticDoctors) {
    const [existing] = await db.select().from(doctors).where(eq(doctors.id, d.id)).limit(1);
    const data = {
      name: d.name,
      spec: d.spec,
      degree: d.degree,
      exp: d.exp,
      fee: String(d.fee),
      emoji: d.emoji,
      sortOrder: docIndex++,
      active: true,
      online: true,
      workDays: [0, 1, 2, 3, 4, 5, 6],
    };
    if (existing) {
      await db.update(doctors).set(data).where(eq(doctors.id, d.id));
    } else {
      await db.insert(doctors).values({ id: d.id, ...data });
    }
  }
  console.log("Synced doctors:", staticDoctors.length);

  // 8. App Settings
  const existingSettings = await db.select({ key: appSettings.key }).from(appSettings);
  const have = new Set(existingSettings.map((s) => s.key));
  let settingsAdded = 0;
  for (const d of APP_SETTING_DEFS) {
    if (have.has(d.key)) continue;
    await db.insert(appSettings).values({ key: d.key, value: d.defaultValue });
    settingsAdded++;
  }
  if (settingsAdded) console.log("Seeded app_settings:", settingsAdded);

  // 9. Delivery Zones
  const existingZones = await db.select({ id: deliveryZones.id }).from(deliveryZones).limit(1);
  if (existingZones.length === 0) {
    const defaults = [
      { name: "ধানমন্ডি", nameEn: "Dhanmondi", district: "ঢাকা", thana: "ধানমন্ডি", fee: "40", expressFee: "90", freeAbove: "1000", etaMinutes: 45, sortOrder: 1 },
      { name: "মিরপুর", nameEn: "Mirpur", district: "ঢাকা", thana: "মিরপুর", fee: "50", expressFee: "100", freeAbove: "1200", etaMinutes: 60, sortOrder: 2 },
      { name: "উত্তরা", nameEn: "Uttara", district: "ঢাকা", thana: "উত্তরা", fee: "60", expressFee: "120", freeAbove: "1500", etaMinutes: 75, sortOrder: 3 },
      { name: "গুলশান", nameEn: "Gulshan", district: "ঢাকা", thana: "গুলশান", fee: "50", expressFee: "100", freeAbove: "1200", etaMinutes: 50, sortOrder: 4 },
      { name: "মোহাম্মদপুর", nameEn: "Mohammadpur", district: "ঢাকা", thana: "মোহাম্মদপুর", fee: "45", expressFee: "95", freeAbove: "1000", etaMinutes: 55, sortOrder: 5 },
      { name: "ঢাকার বাইরে", nameEn: "Outside Dhaka", district: "", thana: "", fee: "120", expressFee: "0", freeAbove: "3000", etaMinutes: 1440, sortOrder: 9 },
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

  console.log("Database seed & sync completed successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

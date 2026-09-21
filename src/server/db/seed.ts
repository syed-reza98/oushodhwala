import "dotenv/config";
import { hash } from "bcryptjs";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { categories, products, profiles, userRoles, users } from "./schema";
import { ensureBuckets } from "@/server/storage/local";

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

  console.log("Seed complete");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

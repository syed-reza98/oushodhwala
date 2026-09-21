import {
  boolean,
  datetime,
  decimal,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  varchar,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

const timestamps = {
  createdAt: datetime("created_at", { mode: "string", fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: datetime("updated_at", { mode: "string", fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)`),
};

export const appRoleEnum = mysqlEnum("role", [
  "super_admin",
  "admin",
  "erp_manager",
  "support_agent",
  "accountant",
  "pharmacist",
  "rider",
  "user",
]);

/** Auth.js / app users (replaces auth.users) */
export const users = mysqlTable(
  "users",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    emailVerified: datetime("email_verified", { mode: "string", fsp: 3 }),
    name: varchar("name", { length: 255 }),
    image: varchar("image", { length: 512 }),
    ...timestamps,
  },
  (t) => [index("users_email_idx").on(t.email)],
);

export const profiles = mysqlTable("profiles", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  fullName: varchar("full_name", { length: 255 }),
  phone: varchar("phone", { length: 32 }),
  address: text("address"),
  ...timestamps,
});

export const userRoles = mysqlTable(
  "user_roles",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: appRoleEnum.notNull().default("user"),
    createdAt: datetime("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (t) => [index("user_roles_user_idx").on(t.userId)],
);

export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 255 }).notNull(),
  expiresAt: datetime("expires_at", { mode: "string", fsp: 3 }).notNull(),
  usedAt: datetime("used_at", { mode: "string", fsp: 3 }),
  createdAt: datetime("created_at", { mode: "string", fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
});

export const categories = mysqlTable("categories", {
  id: varchar("id", { length: 36 }).primaryKey(),
  slug: varchar("slug", { length: 120 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  nameEn: varchar("name_en", { length: 255 }),
  icon: varchar("icon", { length: 64 }),
  sortOrder: int("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

export const products = mysqlTable(
  "products",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 512 }).notNull(),
    en: varchar("en", { length: 512 }),
    baseName: varchar("base_name", { length: 512 }),
    brand: varchar("brand", { length: 255 }),
    category: varchar("category", { length: 255 }),
    generic: varchar("generic", { length: 512 }),
    form: varchar("form", { length: 128 }),
    strength: varchar("strength", { length: 128 }),
    pack: varchar("pack", { length: 128 }),
    manufacturer: varchar("manufacturer", { length: 255 }),
    price: decimal("price", { precision: 12, scale: 2 }).notNull().default("0"),
    mrp: decimal("mrp", { precision: 12, scale: 2 }).notNull().default("0"),
    stock: int("stock").notNull().default(0),
    lowStockThreshold: int("low_stock_threshold").notNull().default(10),
    rx: boolean("rx").notNull().default(false),
    active: boolean("active").notNull().default(true),
    imageUrl: varchar("image_url", { length: 1024 }),
    medicineImageUrl: varchar("medicine_image_url", { length: 1024 }),
    emoji: varchar("emoji", { length: 16 }),
    description: text("description"),
    descriptionEn: text("description_en"),
    indications: text("indications"),
    indicationsEn: text("indications_en"),
    dosage: text("dosage"),
    dosageEn: text("dosage_en"),
    sideEffects: text("side_effects"),
    sideEffectsEn: text("side_effects_en"),
    contraindications: text("contraindications"),
    contraindicationsEn: text("contraindications_en"),
    precautions: text("precautions"),
    precautionsEn: text("precautions_en"),
    pregnancy: text("pregnancy"),
    pregnancyEn: text("pregnancy_en"),
    storage: text("storage"),
    storageEn: text("storage_en"),
    therapeuticClass: varchar("therapeutic_class", { length: 255 }),
    therapeuticClassEn: varchar("therapeutic_class_en", { length: 255 }),
    rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
    reviews: int("reviews").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index("products_category_idx").on(t.category),
    index("products_generic_idx").on(t.generic),
    index("products_active_idx").on(t.active),
  ],
);

export const offers = mysqlTable("offers", {
  id: varchar("id", { length: 36 }).primaryKey(),
  code: varchar("code", { length: 64 }),
  title: varchar("title", { length: 255 }).notNull(),
  titleEn: varchar("title_en", { length: 255 }),
  description: text("description"),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }),
  discountAmount: decimal("discount_amount", { precision: 12, scale: 2 }),
  active: boolean("active").notNull().default(true),
  startsAt: datetime("starts_at", { mode: "string", fsp: 3 }),
  endsAt: datetime("ends_at", { mode: "string", fsp: 3 }),
  ...timestamps,
});

export const orders = mysqlTable(
  "orders",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    orderNo: varchar("order_no", { length: 64 }).notNull(),
    userId: varchar("user_id", { length: 36 }).references(() => users.id),
    status: varchar("status", { length: 64 }).notNull().default("pending"),
    paymentMethod: varchar("payment_method", { length: 64 }),
    paymentStatus: varchar("payment_status", { length: 64 }).default("pending"),
    subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
    discount: decimal("discount", { precision: 12, scale: 2 }).notNull().default("0"),
    deliveryFee: decimal("delivery_fee", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    total: decimal("total", { precision: 12, scale: 2 }).notNull().default("0"),
    customerName: varchar("customer_name", { length: 255 }),
    customerPhone: varchar("customer_phone", { length: 32 }),
    deliveryAddress: text("delivery_address"),
    notes: text("notes"),
    meta: json("meta"),
    ...timestamps,
  },
  (t) => [
    index("orders_user_idx").on(t.userId),
    index("orders_status_idx").on(t.status),
    index("orders_order_no_idx").on(t.orderNo),
  ],
);

export const orderItems = mysqlTable(
  "order_items",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    orderId: varchar("order_id", { length: 36 })
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: varchar("product_id", { length: 36 }).references(() => products.id),
    name: varchar("name", { length: 512 }).notNull(),
    qty: int("qty").notNull().default(1),
    unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
    lineTotal: decimal("line_total", { precision: 12, scale: 2 }).notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

export const appSettings = mysqlTable("app_settings", {
  key: varchar("key", { length: 128 }).primaryKey(),
  value: json("value"),
  updatedAt: datetime("updated_at", { mode: "string", fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)`),
});

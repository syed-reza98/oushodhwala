import {
  boolean,
  date,
  datetime,
  decimal,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  uniqueIndex,
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
  kind: varchar("kind", { length: 32 }).notNull().default("product"),
  homeDelivery: boolean("home_delivery").notNull().default(true),
  homeService: boolean("home_service").notNull().default(false),
  serviceRoute: varchar("service_route", { length: 255 }).notNull().default(""),
  description: text("description"),
  descriptionEn: text("description_en"),
  eta: varchar("eta", { length: 255 }).notNull().default(""),
  etaEn: varchar("eta_en", { length: 255 }).notNull().default(""),
  baseFee: decimal("base_fee", { precision: 12, scale: 2 }).notNull().default("0"),
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
    publicToken: varchar("public_token", { length: 64 }),
    ...timestamps,
  },
  (t) => [
    index("orders_user_idx").on(t.userId),
    index("orders_status_idx").on(t.status),
    index("orders_order_no_idx").on(t.orderNo),
    index("orders_public_token_idx").on(t.publicToken),
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

export const orderEvents = mysqlTable(
  "order_events",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    orderId: varchar("order_id", { length: 36 }).notNull(),
    status: varchar("status", { length: 64 }).notNull(),
    note: text("note").notNull().default(""),
    createdAt: datetime("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (t) => [
    index("order_events_order_idx").on(t.orderId),
    index("order_events_created_idx").on(t.createdAt),
  ],
);

export const orderReturns = mysqlTable(
  "order_returns",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    orderId: varchar("order_id", { length: 36 }).references(() => orders.id, {
      onDelete: "set null",
    }),
    orderNo: varchar("order_no", { length: 64 }).notNull(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: varchar("reason", { length: 128 }).notNull(),
    details: text("details"),
    photoUrls: json("photo_urls").$type<string[]>().default([]),
    refundAmount: decimal("refund_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    status: varchar("status", { length: 64 }).notNull().default("requested"),
    adminNote: text("admin_note"),
    ...timestamps,
  },
  (t) => [
    index("order_returns_user_idx").on(t.userId),
    index("order_returns_order_idx").on(t.orderId),
    index("order_returns_status_idx").on(t.status),
  ],
);

export const appSettings = mysqlTable("app_settings", {
  key: varchar("key", { length: 128 }).primaryKey(),
  value: json("value"),
  updatedAt: datetime("updated_at", { mode: "string", fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)`),
});

export const prescriptions = mysqlTable(
  "prescriptions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 }).references(() => users.id, {
      onDelete: "set null",
    }),
    status: varchar("status", { length: 64 }).notNull().default("pending"),
    phone: varchar("phone", { length: 32 }),
    note: text("note"),
    adminNote: text("admin_note"),
    filePaths: json("file_paths").$type<string[]>(),
    ocrText: text("ocr_text"),
    ocrJson: json("ocr_json"),
    ...timestamps,
  },
  (t) => [
    index("prescriptions_user_idx").on(t.userId),
    index("prescriptions_status_idx").on(t.status),
  ],
);

export const appointments = mysqlTable(
  "appointments",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    invoiceNo: varchar("invoice_no", { length: 64 }).notNull(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    doctorId: varchar("doctor_id", { length: 64 }).notNull(),
    doctorName: varchar("doctor_name", { length: 255 }).notNull().default(""),
    doctorSpec: varchar("doctor_spec", { length: 255 }).notNull().default(""),
    mode: varchar("mode", { length: 32 }).notNull().default("video"),
    scheduledAt: datetime("scheduled_at", { mode: "string", fsp: 3 }).notNull(),
    patientName: varchar("patient_name", { length: 255 }).notNull().default(""),
    phone: varchar("phone", { length: 32 }).notNull().default(""),
    note: text("note"),
    fee: decimal("fee", { precision: 12, scale: 2 }).notNull().default("0"),
    paymentMethod: varchar("payment_method", { length: 64 }).notNull().default("cod"),
    paymentStatus: varchar("payment_status", { length: 64 }).notNull().default("pending"),
    paymentRef: varchar("payment_ref", { length: 128 }).notNull().default(""),
    status: varchar("status", { length: 64 }).notNull().default("confirmed"),
    joinUrl: varchar("join_url", { length: 1024 }).notNull().default(""),
    cancelReason: text("cancel_reason").notNull().default(""),
    cancelledAt: datetime("cancelled_at", { mode: "string", fsp: 3 }),
    refundStatus: varchar("refund_status", { length: 64 }).notNull().default("none"),
    refundAmount: decimal("refund_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    reminderSentAt: datetime("reminder_sent_at", { mode: "string", fsp: 3 }),
    ...timestamps,
  },
  (t) => [
    index("appointments_user_idx").on(t.userId),
    index("appointments_doctor_idx").on(t.doctorId),
    index("appointments_scheduled_idx").on(t.scheduledAt),
  ],
);

export const appointmentReminders = mysqlTable(
  "appointment_reminders",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    appointmentId: varchar("appointment_id", { length: 36 }).notNull(),
    userId: varchar("user_id", { length: 36 }).notNull(),
    channel: varchar("channel", { length: 32 }).notNull().default("whatsapp"),
    target: varchar("target", { length: 255 }).notNull().default(""),
    body: text("body").notNull().default(""),
    status: varchar("status", { length: 32 }).notNull().default("queued"),
    sentAt: datetime("sent_at", { mode: "string", fsp: 3 }),
    createdAt: datetime("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (t) => [
    index("appointment_reminders_appt_idx").on(t.appointmentId),
    index("appointment_reminders_status_idx").on(t.status),
  ],
);

export const refillReminders = mysqlTable(
  "refill_reminders",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: varchar("product_id", { length: 64 }).notNull(),
    productName: varchar("product_name", { length: 512 }).notNull(),
    everyDays: int("every_days").notNull().default(30),
    nextAt: date("next_at", { mode: "string" }).notNull(),
    active: boolean("active").notNull().default(true),
    lastNotifiedAt: datetime("last_notified_at", { mode: "string", fsp: 3 }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("refill_reminders_user_product_uidx").on(t.userId, t.productId),
    index("refill_reminders_next_idx").on(t.nextAt),
  ],
);

/** User-favorited medicines (account / medicine picker). */
export const userFavorites = mysqlTable(
  "user_favorites",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: varchar("product_id", { length: 36 })
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sortOrder: int("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("user_favorites_user_product_uidx").on(t.userId, t.productId),
    index("user_favorites_user_idx").on(t.userId),
  ],
);

/** Recently viewed medicines for account history. */
export const userRecentMedicines = mysqlTable(
  "user_recent_medicines",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: varchar("product_id", { length: 36 })
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    lastViewedAt: datetime("last_viewed_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    createdAt: datetime("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (t) => [
    uniqueIndex("user_recent_medicines_user_product_uidx").on(t.userId, t.productId),
    index("user_recent_medicines_user_idx").on(t.userId),
    index("user_recent_medicines_viewed_idx").on(t.lastViewedAt),
  ],
);

export const consultationMessages = mysqlTable(
  "consultation_messages",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    appointmentId: varchar("appointment_id", { length: 36 })
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 36 }).notNull(),
    sender: varchar("sender", { length: 32 }).notNull().default("patient"),
    body: text("body").notNull().default(""),
    fileUrl: varchar("file_url", { length: 2048 }).notNull().default(""),
    fileName: varchar("file_name", { length: 512 }).notNull().default(""),
    createdAt: datetime("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (t) => [index("consultation_messages_appt_idx").on(t.appointmentId, t.createdAt)],
);

export const consultationMedia = mysqlTable(
  "consultation_media",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    appointmentId: varchar("appointment_id", { length: 36 })
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 36 }).notNull(),
    kind: varchar("kind", { length: 64 }).notNull().default("recording"),
    url: varchar("url", { length: 2048 }).notNull().default(""),
    name: varchar("name", { length: 512 }).notNull().default(""),
    transcript: text("transcript").notNull().default(""),
    createdAt: datetime("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (t) => [index("consultation_media_appt_idx").on(t.appointmentId)],
);

export const consultationPrescriptions = mysqlTable(
  "consultation_prescriptions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    appointmentId: varchar("appointment_id", { length: 36 })
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 36 }).notNull(),
    doctorName: varchar("doctor_name", { length: 255 }).notNull().default(""),
    patientName: varchar("patient_name", { length: 255 }).notNull().default(""),
    diagnosis: text("diagnosis").notNull().default(""),
    advice: text("advice").notNull().default(""),
    items: json("items").$type<{ name: string; dose: string; duration: string }[]>().notNull(),
    followUp: varchar("follow_up", { length: 32 }).notNull().default(""),
    ...timestamps,
  },
  (t) => [index("consultation_rx_appt_idx").on(t.appointmentId)],
);

export const doctorReviews = mysqlTable(
  "doctor_reviews",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    appointmentId: varchar("appointment_id", { length: 36 })
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    doctorId: varchar("doctor_id", { length: 64 }).notNull(),
    userId: varchar("user_id", { length: 36 }).notNull(),
    patientName: varchar("patient_name", { length: 255 }).notNull().default(""),
    rating: int("rating").notNull().default(5),
    comment: text("comment").notNull().default(""),
    createdAt: datetime("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (t) => [
    index("doctor_reviews_doctor_idx").on(t.doctorId),
    index("doctor_reviews_appt_idx").on(t.appointmentId),
  ],
);

export const prescriptionShares = mysqlTable(
  "prescription_shares",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    prescriptionId: varchar("prescription_id", { length: 36 })
      .notNull()
      .references(() => prescriptions.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 36 }).notNull(),
    token: varchar("token", { length: 64 }).notNull(),
    scopes: json("scopes").$type<Record<string, boolean>>(),
    expiresAt: datetime("expires_at", { mode: "string", fsp: 3 }).notNull(),
    revoked: boolean("revoked").notNull().default(false),
    views: int("views").notNull().default(0),
    createdAt: datetime("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (t) => [
    index("prescription_shares_token_idx").on(t.token),
    index("prescription_shares_rx_idx").on(t.prescriptionId),
  ],
);

export const stockMovements = mysqlTable(
  "stock_movements",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    productId: varchar("product_id", { length: 36 })
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    productName: varchar("product_name", { length: 512 }).notNull().default(""),
    change: int("change").notNull(),
    balance: int("balance").notNull().default(0),
    kind: varchar("kind", { length: 64 }).notNull().default("adjust"),
    ref: varchar("ref", { length: 128 }).notNull().default(""),
    note: text("note"),
    actorId: varchar("actor_id", { length: 36 }),
    createdAt: datetime("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (t) => [index("stock_movements_product_idx").on(t.productId)],
);

export const supportConversations = mysqlTable(
  "support_conversations",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull().default(""),
    status: varchar("status", { length: 64 }).notNull().default("open"),
    agentName: varchar("agent_name", { length: 255 }).notNull().default(""),
    agentId: varchar("agent_id", { length: 36 }),
    agentActive: boolean("agent_active").notNull().default(false),
    agentLastSeen: datetime("agent_last_seen", { mode: "string", fsp: 3 }),
    lastMessageAt: datetime("last_message_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    unreadForAgent: int("unread_for_agent").notNull().default(0),
    unreadForUser: int("unread_for_user").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index("support_conversations_user_idx").on(t.userId),
    index("support_conversations_last_idx").on(t.lastMessageAt),
  ],
);

export const supportMessages = mysqlTable(
  "support_messages",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    conversationId: varchar("conversation_id", { length: 36 })
      .notNull()
      .references(() => supportConversations.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 36 }).notNull(),
    sender: varchar("sender", { length: 32 }).notNull().default("user"),
    body: text("body").notNull(),
    agentName: varchar("agent_name", { length: 255 }).notNull().default(""),
    createdAt: datetime("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (t) => [index("support_messages_conv_idx").on(t.conversationId)],
);

export const loyaltyAccounts = mysqlTable("loyalty_accounts", {
  userId: varchar("user_id", { length: 36 })
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  pointsEarned: int("points_earned").notNull().default(0),
  pointsSpent: int("points_spent").notNull().default(0),
  balance: int("balance").notNull().default(0),
  tier: varchar("tier", { length: 64 }).notNull().default("silver"),
  ...timestamps,
});

export const loyaltyTransactions = mysqlTable(
  "loyalty_transactions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    points: int("points").notNull(),
    kind: varchar("kind", { length: 64 }).notNull().default("earn"),
    orderNo: varchar("order_no", { length: 64 }).notNull().default(""),
    reason: varchar("reason", { length: 255 }).notNull().default(""),
    createdAt: datetime("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (t) => [index("loyalty_tx_user_idx").on(t.userId)],
);

export const posSales = mysqlTable(
  "pos_sales",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    invoiceNo: varchar("invoice_no", { length: 64 }).notNull(),
    customerName: varchar("customer_name", { length: 255 }).notNull().default(""),
    phone: varchar("phone", { length: 32 }).notNull().default(""),
    subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
    discount: decimal("discount", { precision: 12, scale: 2 }).notNull().default("0"),
    total: decimal("total", { precision: 12, scale: 2 }).notNull().default("0"),
    paid: decimal("paid", { precision: 12, scale: 2 }).notNull().default("0"),
    due: decimal("due", { precision: 12, scale: 2 }).notNull().default("0"),
    method: varchar("method", { length: 64 }).notNull().default("cash"),
    note: text("note"),
    createdBy: varchar("created_by", { length: 36 }),
    ...timestamps,
  },
  (t) => [
    index("pos_sales_invoice_idx").on(t.invoiceNo),
    index("pos_sales_created_idx").on(t.createdAt),
  ],
);

export const posSaleItems = mysqlTable(
  "pos_sale_items",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    saleId: varchar("sale_id", { length: 36 })
      .notNull()
      .references(() => posSales.id, { onDelete: "cascade" }),
    productId: varchar("product_id", { length: 36 }).notNull(),
    productName: varchar("product_name", { length: 512 }).notNull().default(""),
    price: decimal("price", { precision: 12, scale: 2 }).notNull().default("0"),
    qty: int("qty").notNull().default(1),
  },
  (t) => [index("pos_sale_items_sale_idx").on(t.saleId)],
);

export const suppliers = mysqlTable(
  "suppliers",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    contactPerson: varchar("contact_person", { length: 255 }).notNull().default(""),
    phone: varchar("phone", { length: 32 }).notNull().default(""),
    email: varchar("email", { length: 255 }).notNull().default(""),
    address: text("address"),
    paymentTerms: varchar("payment_terms", { length: 255 }).notNull().default(""),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("suppliers_name_idx").on(t.name)],
);

export const purchaseOrders = mysqlTable(
  "purchase_orders",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    poNo: varchar("po_no", { length: 64 }).notNull(),
    supplierId: varchar("supplier_id", { length: 36 })
      .notNull()
      .references(() => suppliers.id),
    supplierName: varchar("supplier_name", { length: 255 }).notNull().default(""),
    status: varchar("status", { length: 64 }).notNull().default("ordered"),
    expectedAt: datetime("expected_at", { mode: "string", fsp: 3 }),
    subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
    discount: decimal("discount", { precision: 12, scale: 2 }).notNull().default("0"),
    total: decimal("total", { precision: 12, scale: 2 }).notNull().default("0"),
    note: text("note"),
    receivedAt: datetime("received_at", { mode: "string", fsp: 3 }),
    createdBy: varchar("created_by", { length: 36 }),
    ...timestamps,
  },
  (t) => [
    index("purchase_orders_po_no_idx").on(t.poNo),
    index("purchase_orders_status_idx").on(t.status),
  ],
);

export const purchaseOrderItems = mysqlTable(
  "purchase_order_items",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    poId: varchar("po_id", { length: 36 })
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "cascade" }),
    productId: varchar("product_id", { length: 36 }).notNull(),
    productName: varchar("product_name", { length: 512 }).notNull().default(""),
    qty: int("qty").notNull().default(0),
    receivedQty: int("received_qty").notNull().default(0),
    cost: decimal("cost", { precision: 12, scale: 2 }).notNull().default("0"),
    batchNo: varchar("batch_no", { length: 128 }).notNull().default(""),
    expiry: varchar("expiry", { length: 32 }),
  },
  (t) => [index("purchase_order_items_po_idx").on(t.poId)],
);

export const stockBatches = mysqlTable(
  "stock_batches",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    productId: varchar("product_id", { length: 64 }).notNull(),
    productName: varchar("product_name", { length: 512 }).notNull().default(""),
    batchNo: varchar("batch_no", { length: 128 }).notNull().default(""),
    expiry: date("expiry", { mode: "string" }),
    qty: int("qty").notNull().default(0),
    cost: decimal("cost", { precision: 12, scale: 2 }).notNull().default("0"),
    supplierId: varchar("supplier_id", { length: 36 }),
    poId: varchar("po_id", { length: 36 }),
    ...timestamps,
  },
  (t) => [
    index("stock_batches_product_idx").on(t.productId),
    index("stock_batches_expiry_idx").on(t.expiry),
  ],
);

export const expenses = mysqlTable(
  "expenses",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    category: varchar("category", { length: 128 }).notNull().default("misc"),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull().default("0"),
    note: text("note"),
    paidAt: datetime("paid_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    createdBy: varchar("created_by", { length: 36 }),
    ...timestamps,
  },
  (t) => [index("expenses_paid_idx").on(t.paidAt)],
);

export const riders = mysqlTable(
  "riders",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 }),
    name: varchar("name", { length: 255 }).notNull().default(""),
    phone: varchar("phone", { length: 32 }).notNull().default(""),
    vehicle: varchar("vehicle", { length: 64 }).notNull().default("bike"),
    zone: varchar("zone", { length: 128 }).notNull().default(""),
    active: boolean("active").notNull().default(true),
    lastLat: decimal("last_lat", { precision: 10, scale: 7 }),
    lastLng: decimal("last_lng", { precision: 10, scale: 7 }),
    lastSeenAt: datetime("last_seen_at", { mode: "string", fsp: 3 }),
    ...timestamps,
  },
  (t) => [index("riders_active_idx").on(t.active)],
);

export const deliveries = mysqlTable(
  "deliveries",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    orderId: varchar("order_id", { length: 36 })
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    orderNo: varchar("order_no", { length: 64 }).notNull().default(""),
    userId: varchar("user_id", { length: 36 }),
    riderId: varchar("rider_id", { length: 36 }).references(() => riders.id, {
      onDelete: "set null",
    }),
    status: varchar("status", { length: 64 }).notNull().default("unassigned"),
    etaMinutes: int("eta_minutes").notNull().default(45),
    lastLat: decimal("last_lat", { precision: 10, scale: 7 }),
    lastLng: decimal("last_lng", { precision: 10, scale: 7 }),
    lastSeenAt: datetime("last_seen_at", { mode: "string", fsp: 3 }),
    assignedAt: datetime("assigned_at", { mode: "string", fsp: 3 }),
    note: text("note"),
    ...timestamps,
  },
  (t) => [
    index("deliveries_order_idx").on(t.orderId),
    index("deliveries_rider_idx").on(t.riderId),
    index("deliveries_status_idx").on(t.status),
  ],
);

export const deliveryEvents = mysqlTable(
  "delivery_events",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    deliveryId: varchar("delivery_id", { length: 36 }).notNull(),
    status: varchar("status", { length: 64 }).notNull(),
    note: text("note").notNull().default(""),
    lat: decimal("lat", { precision: 10, scale: 7 }),
    lng: decimal("lng", { precision: 10, scale: 7 }),
    actor: varchar("actor", { length: 64 }).notNull().default("system"),
    createdAt: datetime("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (t) => [
    index("delivery_events_delivery_idx").on(t.deliveryId, t.createdAt),
  ],
);

export const labTests = mysqlTable(
  "lab_tests",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    bn: varchar("bn", { length: 512 }).notNull(),
    en: varchar("en", { length: 512 }).notNull().default(""),
    price: decimal("price", { precision: 12, scale: 2 }).notNull().default("0"),
    mrp: decimal("mrp", { precision: 12, scale: 2 }).notNull().default("0"),
    grp: varchar("grp", { length: 64 }).notNull().default("vital"),
    prep: text("prep"),
    active: boolean("active").notNull().default(true),
    sortOrder: int("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("lab_tests_active_idx").on(t.active)],
);

export const doctors = mysqlTable(
  "doctors",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    spec: varchar("spec", { length: 255 }).notNull().default(""),
    degree: varchar("degree", { length: 255 }).notNull().default(""),
    exp: varchar("exp", { length: 128 }).notNull().default(""),
    fee: decimal("fee", { precision: 12, scale: 2 }).notNull().default("0"),
    emoji: varchar("emoji", { length: 16 }).notNull().default("🩺"),
    photoUrl: varchar("photo_url", { length: 1024 }).notNull().default(""),
    phone: varchar("phone", { length: 32 }).notNull().default(""),
    whatsapp: varchar("whatsapp", { length: 32 }).notNull().default(""),
    videoUrl: varchar("video_url", { length: 1024 }).notNull().default(""),
    online: boolean("online").notNull().default(true),
    workStart: varchar("work_start", { length: 16 }).notNull().default("10:00"),
    workEnd: varchar("work_end", { length: 16 }).notNull().default("22:00"),
    slotMinutes: int("slot_minutes").notNull().default(30),
    workDays: json("work_days").$type<number[]>(),
    active: boolean("active").notNull().default(true),
    sortOrder: int("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("doctors_active_idx").on(t.active)],
);

export const doctorBlackouts = mysqlTable(
  "doctor_blackouts",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    doctorId: varchar("doctor_id", { length: 64 }).notNull(),
    day: varchar("day", { length: 10 }).notNull(),
    reason: text("reason").notNull().default(""),
    createdAt: datetime("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (t) => [
    index("doctor_blackouts_doctor_idx").on(t.doctorId),
    index("doctor_blackouts_day_idx").on(t.day),
  ],
);

export const diagnosticBookings = mysqlTable(
  "diagnostic_bookings",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    bookingNo: varchar("booking_no", { length: 64 }).notNull(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    patientName: varchar("patient_name", { length: 255 }).notNull().default(""),
    phone: varchar("phone", { length: 32 }).notNull().default(""),
    address: text("address"),
    area: varchar("area", { length: 255 }).notNull().default(""),
    scheduledDate: varchar("scheduled_date", { length: 32 }).notNull().default(""),
    slot: varchar("slot", { length: 64 }).notNull().default(""),
    tests: json("tests").$type<{ id: string; bn?: string; en?: string; price?: number }[]>().notNull(),
    subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
    collectionFee: decimal("collection_fee", { precision: 12, scale: 2 }).notNull().default("0"),
    total: decimal("total", { precision: 12, scale: 2 }).notNull().default("0"),
    paymentMethod: varchar("payment_method", { length: 64 }).notNull().default("cod"),
    paymentStatus: varchar("payment_status", { length: 64 }).notNull().default("pending"),
    status: varchar("status", { length: 64 }).notNull().default("requested"),
    note: text("note"),
    collectorName: varchar("collector_name", { length: 255 }).notNull().default(""),
    collectorPhone: varchar("collector_phone", { length: 32 }).notNull().default(""),
    reportUrl: varchar("report_url", { length: 1024 }).notNull().default(""),
    ...timestamps,
  },
  (t) => [
    index("diag_bookings_user_idx").on(t.userId),
    index("diag_bookings_status_idx").on(t.status),
    index("diag_bookings_no_idx").on(t.bookingNo),
  ],
);

export const serviceRequests = mysqlTable(
  "service_requests",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    requestNo: varchar("request_no", { length: 64 }).notNull(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    serviceSlug: varchar("service_slug", { length: 120 }).notNull().default(""),
    serviceName: varchar("service_name", { length: 255 }).notNull().default(""),
    patientName: varchar("patient_name", { length: 255 }).notNull().default(""),
    phone: varchar("phone", { length: 32 }).notNull().default(""),
    address: text("address"),
    scheduledDate: varchar("scheduled_date", { length: 32 }).notNull().default(""),
    slot: varchar("slot", { length: 128 }).notNull().default(""),
    fee: decimal("fee", { precision: 12, scale: 2 }).notNull().default("0"),
    status: varchar("status", { length: 64 }).notNull().default("requested"),
    note: text("note"),
    ...timestamps,
  },
  (t) => [
    index("service_requests_user_idx").on(t.userId),
    index("service_requests_status_idx").on(t.status),
  ],
);

export const productReviews = mysqlTable(
  "product_reviews",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    productId: varchar("product_id", { length: 36 })
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    authorName: varchar("author_name", { length: 255 }),
    rating: int("rating").notNull().default(5),
    comment: text("comment"),
    verified: boolean("verified").notNull().default(false),
    status: varchar("status", { length: 64 }).notNull().default("pending"),
    ...timestamps,
  },
  (t) => [
    index("product_reviews_product_idx").on(t.productId),
    index("product_reviews_user_idx").on(t.userId),
    index("product_reviews_status_idx").on(t.status),
  ],
);

export const notifications = mysqlTable(
  "notifications",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 512 }).notNull(),
    body: text("body").notNull().default(""),
    kind: varchar("kind", { length: 64 }).notNull().default("general"),
    orderNo: varchar("order_no", { length: 64 }).notNull().default(""),
    read: boolean("read").notNull().default(false),
    createdAt: datetime("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (t) => [
    index("notifications_user_idx").on(t.userId),
    index("notifications_kind_idx").on(t.kind),
    index("notifications_created_idx").on(t.createdAt),
  ],
);

export const campaignSends = mysqlTable(
  "campaign_sends",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    segment: varchar("segment", { length: 64 }).notNull(),
    title: varchar("title", { length: 512 }).notNull(),
    body: text("body").notNull().default(""),
    sentCount: int("sent_count").notNull().default(0),
    actorId: varchar("actor_id", { length: 36 }),
    createdAt: datetime("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (t) => [index("campaign_sends_created_idx").on(t.createdAt)],
);

export const branches = mysqlTable(
  "branches",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    code: varchar("code", { length: 32 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    nameEn: varchar("name_en", { length: 255 }).notNull().default(""),
    address: text("address").notNull().default(""),
    phone: varchar("phone", { length: 32 }).notNull().default(""),
    isMain: boolean("is_main").notNull().default(false),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index("branches_code_idx").on(t.code),
    index("branches_active_idx").on(t.active),
  ],
);

export const stockTransfers = mysqlTable(
  "stock_transfers",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    transferNo: varchar("transfer_no", { length: 64 }).notNull(),
    fromBranchId: varchar("from_branch_id", { length: 36 }).references(() => branches.id, {
      onDelete: "set null",
    }),
    toBranchId: varchar("to_branch_id", { length: 36 }).references(() => branches.id, {
      onDelete: "set null",
    }),
    fromBranchName: varchar("from_branch_name", { length: 255 }).notNull().default(""),
    toBranchName: varchar("to_branch_name", { length: 255 }).notNull().default(""),
    status: varchar("status", { length: 64 }).notNull().default("draft"),
    note: text("note"),
    createdBy: varchar("created_by", { length: 36 }),
    sentAt: datetime("sent_at", { mode: "string", fsp: 3 }),
    receivedAt: datetime("received_at", { mode: "string", fsp: 3 }),
    ...timestamps,
  },
  (t) => [
    index("stock_transfers_status_idx").on(t.status),
    index("stock_transfers_no_idx").on(t.transferNo),
  ],
);

export const stockTransferItems = mysqlTable(
  "stock_transfer_items",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    transferId: varchar("transfer_id", { length: 36 })
      .notNull()
      .references(() => stockTransfers.id, { onDelete: "cascade" }),
    productId: varchar("product_id", { length: 36 }).notNull(),
    productName: varchar("product_name", { length: 512 }).notNull().default(""),
    qty: int("qty").notNull().default(1),
  },
  (t) => [index("stock_transfer_items_transfer_idx").on(t.transferId)],
);

export const deliveryZones = mysqlTable(
  "delivery_zones",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    nameEn: varchar("name_en", { length: 255 }).notNull().default(""),
    district: varchar("district", { length: 128 }).notNull().default(""),
    thana: varchar("thana", { length: 128 }).notNull().default(""),
    fee: decimal("fee", { precision: 12, scale: 2 }).notNull().default("40"),
    expressFee: decimal("express_fee", { precision: 12, scale: 2 }).notNull().default("90"),
    freeAbove: decimal("free_above", { precision: 12, scale: 2 }).notNull().default("0"),
    minOrder: decimal("min_order", { precision: 12, scale: 2 }).notNull().default("0"),
    etaMinutes: int("eta_minutes").notNull().default(60),
    active: boolean("active").notNull().default(true),
    sortOrder: int("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index("delivery_zones_active_idx").on(t.active),
    index("delivery_zones_sort_idx").on(t.sortOrder),
  ],
);

export const mediaAssets = mysqlTable(
  "media_assets",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    url: varchar("url", { length: 2048 }).notNull(),
    path: varchar("path", { length: 1024 }).notNull().default(""),
    name: varchar("name", { length: 512 }).notNull().default(""),
    kind: varchar("kind", { length: 64 }).notNull().default("other"),
    tags: json("tags").$type<string[]>().notNull(),
    size: int("size").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index("media_assets_kind_idx").on(t.kind),
    index("media_assets_created_idx").on(t.createdAt),
  ],
);

export const errorLogs = mysqlTable(
  "error_logs",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    message: text("message").notNull(),
    source: varchar("source", { length: 128 }).notNull().default("client"),
    path: varchar("path", { length: 512 }).notNull().default(""),
    stack: text("stack"),
    severity: varchar("severity", { length: 32 }).notNull().default("error"),
    userId: varchar("user_id", { length: 36 }),
    createdAt: datetime("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (t) => [index("error_logs_created_idx").on(t.createdAt)],
);

export const stockAlerts = mysqlTable(
  "stock_alerts",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    kind: varchar("kind", { length: 64 }).notNull(),
    ref: varchar("ref", { length: 255 }).notNull().default(""),
    productId: varchar("product_id", { length: 36 }).notNull().default(""),
    productName: varchar("product_name", { length: 512 }).notNull().default(""),
    detail: text("detail").notNull(),
    createdAt: datetime("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (t) => [index("stock_alerts_created_idx").on(t.createdAt)],
);

/** Proposed product image swaps (box / medicine) pending staff review. */
export const imageRevisions = mysqlTable(
  "image_revisions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    productId: varchar("product_id", { length: 36 }).notNull(),
    productName: varchar("product_name", { length: 512 }).notNull().default(""),
    field: varchar("field", { length: 32 }).notNull().default("box"),
    beforeUrl: varchar("before_url", { length: 2048 }).notNull().default(""),
    afterUrl: varchar("after_url", { length: 2048 }).notNull().default(""),
    method: varchar("method", { length: 64 }).notNull().default("manual"),
    source: varchar("source", { length: 255 }).notNull().default(""),
    score: decimal("score", { precision: 8, scale: 2 }).notNull().default("0"),
    status: varchar("status", { length: 32 }).notNull().default("pending"),
    note: text("note").notNull().default(""),
    reviewedBy: varchar("reviewed_by", { length: 36 }),
    reviewedAt: datetime("reviewed_at", { mode: "string", fsp: 3 }),
    ...timestamps,
  },
  (t) => [
    index("image_revisions_status_idx").on(t.status, t.createdAt),
    index("image_revisions_product_idx").on(t.productId),
  ],
);

export const imageAuditLog = mysqlTable(
  "image_audit_log",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    productId: varchar("product_id", { length: 36 }).notNull(),
    productName: varchar("product_name", { length: 512 }).notNull().default(""),
    action: varchar("action", { length: 64 }).notNull(),
    field: varchar("field", { length: 32 }).notNull().default("box"),
    fromUrl: varchar("from_url", { length: 2048 }).notNull().default(""),
    toUrl: varchar("to_url", { length: 2048 }).notNull().default(""),
    revisionId: varchar("revision_id", { length: 36 }),
    actorId: varchar("actor_id", { length: 36 }),
    note: text("note").notNull().default(""),
    createdAt: datetime("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (t) => [
    index("image_audit_log_created_idx").on(t.createdAt),
    index("image_audit_log_product_idx").on(t.productId),
  ],
);

export const chartAccounts = mysqlTable(
  "chart_accounts",
  {
    code: varchar("code", { length: 32 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    nameEn: varchar("name_en", { length: 255 }).notNull().default(""),
    kind: varchar("kind", { length: 32 }).notNull().default("asset"),
    parentCode: varchar("parent_code", { length: 32 }),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("chart_accounts_kind_idx").on(t.kind)],
);

export const journalEntries = mysqlTable(
  "journal_entries",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    entryNo: varchar("entry_no", { length: 64 }).notNull(),
    entryDate: date("entry_date", { mode: "string" }).notNull(),
    memo: text("memo").notNull().default(""),
    source: varchar("source", { length: 64 }).notNull().default("manual"),
    ref: varchar("ref", { length: 128 }).notNull().default(""),
    total: decimal("total", { precision: 14, scale: 2 }).notNull().default("0"),
    createdBy: varchar("created_by", { length: 36 }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("journal_entries_no_uidx").on(t.entryNo),
    index("journal_entries_date_idx").on(t.entryDate),
  ],
);

export const journalLines = mysqlTable(
  "journal_lines",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    entryId: varchar("entry_id", { length: 36 })
      .notNull()
      .references(() => journalEntries.id, { onDelete: "cascade" }),
    accountCode: varchar("account_code", { length: 32 }).notNull(),
    accountName: varchar("account_name", { length: 255 }).notNull().default(""),
    debit: decimal("debit", { precision: 14, scale: 2 }).notNull().default("0"),
    credit: decimal("credit", { precision: 14, scale: 2 }).notNull().default("0"),
    note: text("note").notNull().default(""),
    party: varchar("party", { length: 255 }).notNull().default(""),
    createdAt: datetime("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (t) => [
    index("journal_lines_entry_idx").on(t.entryId),
    index("journal_lines_account_idx").on(t.accountCode),
  ],
);

export const stockAdjustments = mysqlTable(
  "stock_adjustments",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    adjNo: varchar("adj_no", { length: 64 }).notNull(),
    reason: varchar("reason", { length: 64 }).notNull().default("correction"),
    note: text("note").notNull().default(""),
    status: varchar("status", { length: 32 }).notNull().default("applied"),
    branchId: varchar("branch_id", { length: 36 }),
    createdBy: varchar("created_by", { length: 36 }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("stock_adjustments_no_uidx").on(t.adjNo),
    index("stock_adjustments_created_idx").on(t.createdAt),
  ],
);

export const stockAdjustmentItems = mysqlTable(
  "stock_adjustment_items",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    adjId: varchar("adj_id", { length: 36 })
      .notNull()
      .references(() => stockAdjustments.id, { onDelete: "cascade" }),
    productId: varchar("product_id", { length: 64 }).notNull(),
    productName: varchar("product_name", { length: 512 }).notNull().default(""),
    change: int("change").notNull().default(0),
    beforeQty: int("before_qty").notNull().default(0),
    afterQty: int("after_qty").notNull().default(0),
    note: text("note").notNull().default(""),
  },
  (t) => [index("stock_adjustment_items_adj_idx").on(t.adjId)],
);

export const stockCounts = mysqlTable(
  "stock_counts",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    countNo: varchar("count_no", { length: 64 }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("draft"),
    note: text("note").notNull().default(""),
    branchId: varchar("branch_id", { length: 36 }),
    createdBy: varchar("created_by", { length: 36 }),
    appliedAt: datetime("applied_at", { mode: "string", fsp: 3 }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("stock_counts_no_uidx").on(t.countNo),
    index("stock_counts_status_idx").on(t.status),
  ],
);

export const stockCountItems = mysqlTable(
  "stock_count_items",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    countId: varchar("count_id", { length: 36 })
      .notNull()
      .references(() => stockCounts.id, { onDelete: "cascade" }),
    productId: varchar("product_id", { length: 64 }).notNull(),
    productName: varchar("product_name", { length: 512 }).notNull().default(""),
    systemQty: int("system_qty").notNull().default(0),
    countedQty: int("counted_qty").notNull().default(0),
    note: text("note").notNull().default(""),
  },
  (t) => [index("stock_count_items_count_idx").on(t.countId)],
);

export const apiEndpoints = mysqlTable(
  "api_endpoints",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    grp: varchar("grp", { length: 64 }).notNull().default("general"),
    method: varchar("method", { length: 16 }).notNull().default("GET"),
    url: varchar("url", { length: 2048 }).notNull().default(""),
    headers: json("headers").$type<Record<string, string>>().default({}),
    sampleBody: text("sample_body").notNull().default(""),
    authKind: varchar("auth_kind", { length: 64 }).notNull().default("none"),
    active: boolean("active").notNull().default(true),
    note: text("note").notNull().default(""),
    lastStatus: int("last_status"),
    lastOk: boolean("last_ok"),
    lastMs: int("last_ms"),
    lastTestedAt: datetime("last_tested_at", { mode: "string", fsp: 3 }),
    ...timestamps,
  },
  (t) => [index("api_endpoints_grp_idx").on(t.grp)],
);

export const apiIntegrations = mysqlTable(
  "api_integrations",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    provider: varchar("provider", { length: 128 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    category: varchar("category", { length: 64 }).notNull().default("general"),
    baseUrl: varchar("base_url", { length: 2048 }).notNull().default(""),
    senderId: varchar("sender_id", { length: 255 }).notNull().default(""),
    apiKey: varchar("api_key", { length: 512 }).notNull().default(""),
    apiSecret: varchar("api_secret", { length: 512 }).notNull().default(""),
    config: json("config").$type<Record<string, unknown>>().default({}),
    note: text("note").notNull().default(""),
    active: boolean("active").notNull().default(true),
    lastOk: boolean("last_ok"),
    lastStatus: int("last_status"),
    lastTestedAt: datetime("last_tested_at", { mode: "string", fsp: 3 }),
    ...timestamps,
  },
  (t) => [uniqueIndex("api_integrations_provider_uidx").on(t.provider)],
);

export const apiTestLogs = mysqlTable(
  "api_test_logs",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    endpointId: varchar("endpoint_id", { length: 36 }),
    name: varchar("name", { length: 255 }).notNull().default(""),
    method: varchar("method", { length: 16 }).notNull().default("GET"),
    url: varchar("url", { length: 2048 }).notNull().default(""),
    statusCode: int("status_code"),
    ok: boolean("ok").notNull().default(false),
    durationMs: int("duration_ms").notNull().default(0),
    responseExcerpt: text("response_excerpt").notNull().default(""),
    error: text("error").notNull().default(""),
    actorId: varchar("actor_id", { length: 36 }),
    createdAt: datetime("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (t) => [index("api_test_logs_created_idx").on(t.createdAt)],
);

export const erpAuditLog = mysqlTable(
  "erp_audit_log",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    tableName: varchar("table_name", { length: 128 }).notNull(),
    action: varchar("action", { length: 64 }).notNull(),
    recordId: varchar("record_id", { length: 64 }).notNull().default(""),
    label: varchar("label", { length: 512 }).notNull().default(""),
    changes: json("changes").$type<Record<string, unknown>>().default({}),
    actorId: varchar("actor_id", { length: 36 }),
    createdAt: datetime("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (t) => [index("erp_audit_created_idx").on(t.createdAt)],
);

export const deliveryNotifications = mysqlTable(
  "delivery_notifications",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    deliveryId: varchar("delivery_id", { length: 36 }).notNull(),
    orderNo: varchar("order_no", { length: 64 }).notNull().default(""),
    userId: varchar("user_id", { length: 36 }).notNull(),
    channel: varchar("channel", { length: 32 }).notNull().default("sms"),
    target: varchar("target", { length: 255 }).notNull().default(""),
    statusKey: varchar("status_key", { length: 64 }).notNull().default(""),
    body: text("body").notNull().default(""),
    status: varchar("status", { length: 32 }).notNull().default("queued"),
    sentAt: datetime("sent_at", { mode: "string", fsp: 3 }),
    createdAt: datetime("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (t) => [
    index("delivery_notifications_delivery_idx").on(t.deliveryId),
    index("delivery_notifications_user_idx").on(t.userId),
  ],
);

export const genericInfo = mysqlTable(
  "generic_info",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    key: varchar("key", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().default(""),
    name: varchar("name", { length: 512 }).notNull().default(""),
    indications: text("indications").notNull().default(""),
    indicationsEn: text("indications_en").notNull().default(""),
    pharmacology: text("pharmacology").notNull().default(""),
    pharmacologyEn: text("pharmacology_en").notNull().default(""),
    dosage: text("dosage").notNull().default(""),
    dosageEn: text("dosage_en").notNull().default(""),
    interaction: text("interaction").notNull().default(""),
    interactionEn: text("interaction_en").notNull().default(""),
    contraindications: text("contraindications").notNull().default(""),
    contraindicationsEn: text("contraindications_en").notNull().default(""),
    sideEffects: text("side_effects").notNull().default(""),
    sideEffectsEn: text("side_effects_en").notNull().default(""),
    pregnancy: text("pregnancy").notNull().default(""),
    pregnancyEn: text("pregnancy_en").notNull().default(""),
    precautions: text("precautions").notNull().default(""),
    precautionsEn: text("precautions_en").notNull().default(""),
    therapeuticClass: varchar("therapeutic_class", { length: 255 }).notNull().default(""),
    therapeuticClassEn: varchar("therapeutic_class_en", { length: 255 }).notNull().default(""),
    storage: text("storage").notNull().default(""),
    storageEn: text("storage_en").notNull().default(""),
    ...timestamps,
  },
  (t) => [uniqueIndex("generic_info_key_uidx").on(t.key)],
);

export const imageImportRuns = mysqlTable(
  "image_import_runs",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    source: varchar("source", { length: 128 }).notNull().default(""),
    mode: varchar("mode", { length: 64 }).notNull().default("manual"),
    status: varchar("status", { length: 32 }).notNull().default("running"),
    total: int("total").notNull().default(0),
    okCount: int("ok_count").notNull().default(0),
    failCount: int("fail_count").notNull().default(0),
    skippedCount: int("skipped_count").notNull().default(0),
    note: text("note").notNull().default(""),
    finishedAt: datetime("finished_at", { mode: "string", fsp: 3 }),
    createdAt: datetime("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (t) => [index("image_import_runs_created_idx").on(t.createdAt)],
);

export const imageImportFailures = mysqlTable(
  "image_import_failures",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    runId: varchar("run_id", { length: 36 }).notNull(),
    productId: varchar("product_id", { length: 64 }).notNull().default(""),
    productName: varchar("product_name", { length: 512 }).notNull().default(""),
    source: varchar("source", { length: 128 }).notNull().default(""),
    reason: text("reason").notNull().default(""),
    url: varchar("url", { length: 2048 }).notNull().default(""),
    attempts: int("attempts").notNull().default(1),
    resolved: boolean("resolved").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index("image_import_failures_run_idx").on(t.runId),
    index("image_import_failures_resolved_idx").on(t.resolved),
  ],
);

export const prescriptionAudit = mysqlTable(
  "prescription_audit",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    prescriptionId: varchar("prescription_id", { length: 36 }).notNull(),
    userId: varchar("user_id", { length: 36 }).notNull(),
    action: varchar("action", { length: 64 }).notNull(),
    changes: json("changes").$type<Record<string, unknown>>().default({}),
    createdAt: datetime("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (t) => [index("prescription_audit_rx_idx").on(t.prescriptionId, t.createdAt)],
);

export const productImageAudit = mysqlTable(
  "product_image_audit",
  {
    productId: varchar("product_id", { length: 64 }).primaryKey(),
    productName: varchar("product_name", { length: 512 }).notNull().default(""),
    boxUrl: varchar("box_url", { length: 2048 }).notNull().default(""),
    medicineUrl: varchar("medicine_url", { length: 2048 }).notNull().default(""),
    status: varchar("status", { length: 64 }).notNull().default("unknown"),
    source: varchar("source", { length: 128 }).notNull().default(""),
    note: text("note").notNull().default(""),
    httpStatus: int("http_status"),
    checkedAt: datetime("checked_at", { mode: "string", fsp: 3 }),
  },
  (t) => [index("product_image_audit_status_idx").on(t.status)],
);

export const productImageMap = mysqlTable(
  "product_image_map",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    productId: varchar("product_id", { length: 64 }).notNull(),
    url: varchar("url", { length: 2048 }).notNull().default(""),
    medicineUrl: varchar("medicine_url", { length: 2048 }).notNull().default(""),
    createdAt: datetime("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (t) => [uniqueIndex("product_image_map_product_uidx").on(t.productId)],
);

export const rxRetention = mysqlTable("rx_retention", {
  userId: varchar("user_id", { length: 36 }).primaryKey(),
  days: int("days").notNull().default(365),
  notifyEmail: boolean("notify_email").notNull().default(false),
  updatedAt: datetime("updated_at", { mode: "string", fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)`),
});

/** Canonical shop/app settings keys — keep in sync with catalog-db ShopSettings mapping. */
export type SettingDef = {
  key: string;
  label: string;
  labelEn: string;
  defaultValue: string;
  kind: "bool" | "text" | "number";
};

export const APP_SETTING_DEFS: SettingDef[] = [
  {
    key: "delivery_fee",
    label: "ডেলিভারি চার্জ (৳)",
    labelEn: "Delivery fee (৳)",
    defaultValue: "60",
    kind: "number",
  },
  {
    key: "free_delivery_min",
    label: "ফ্রি ডেলিভারি মিনিমাম (৳)",
    labelEn: "Free delivery minimum (৳)",
    defaultValue: "500",
    kind: "number",
  },
  {
    key: "support_phone",
    label: "সাপোর্ট হটলাইন",
    labelEn: "Support hotline",
    defaultValue: "09610-000000",
    kind: "text",
  },
  {
    key: "emergency_phone",
    label: "ইমার্জেন্সি ফোন",
    labelEn: "Emergency phone",
    defaultValue: "01700-000911",
    kind: "text",
  },
  {
    key: "announcement",
    label: "অ্যানাউন্সমেন্ট ব্যানার",
    labelEn: "Announcement banner",
    defaultValue: "",
    kind: "text",
  },
  {
    key: "cod_enabled",
    label: "ক্যাশ অন ডেলিভারি",
    labelEn: "Cash on delivery",
    defaultValue: "true",
    kind: "bool",
  },
  {
    key: "bkash_enabled",
    label: "বিকাশ",
    labelEn: "bKash",
    defaultValue: "true",
    kind: "bool",
  },
  {
    key: "nagad_enabled",
    label: "নগদ",
    labelEn: "Nagad",
    defaultValue: "true",
    kind: "bool",
  },
  {
    key: "card_enabled",
    label: "কার্ড পেমেন্ট",
    labelEn: "Card payment",
    defaultValue: "true",
    kind: "bool",
  },
  {
    key: "express_enabled",
    label: "এক্সপ্রেস ডেলিভারি",
    labelEn: "Express delivery",
    defaultValue: "true",
    kind: "bool",
  },
  {
    key: "express_fee",
    label: "এক্সপ্রেস চার্জ (৳)",
    labelEn: "Express fee (৳)",
    defaultValue: "120",
    kind: "number",
  },
  {
    key: "express_eta",
    label: "এক্সপ্রেস ইটিএ",
    labelEn: "Express ETA",
    defaultValue: "৩০–৬০ মিনিট",
    kind: "text",
  },
];

export function normalizeSettingValue(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "boolean" || typeof raw === "number") return String(raw);
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    // mysql2 may return JSON column text still quoted (e.g. "\"60\"" or "\"true\"")
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      trimmed === "true" ||
      trimmed === "false" ||
      /^-?\d+(\.\d+)?$/.test(trimmed)
    ) {
      try {
        const parsed: unknown = JSON.parse(trimmed);
        if (
          typeof parsed === "string" ||
          typeof parsed === "number" ||
          typeof parsed === "boolean"
        ) {
          return String(parsed);
        }
      } catch {
        /* keep raw */
      }
    }
    return raw;
  }
  try {
    return JSON.stringify(raw);
  } catch {
    return String(raw);
  }
}

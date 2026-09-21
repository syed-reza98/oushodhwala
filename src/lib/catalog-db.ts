import { useQuery } from "@tanstack/react-query";
import { getCatalog } from "./catalog.functions";
import {
  products as staticProducts,
  categories as staticCategories,
  labTests as staticLabTests,
  doctors as staticDoctors,
  type Product,
  type Category,
} from "@/data/catalog";

export type ShopProduct = Product & {
  stock: number;
  lowStock: number;
  image: string;
  medicineImage?: string;
  descEn: string;
  indications: string;
  indicationsEn: string;
  dosage: string;
  dosageEn: string;
  sideEffects: string;
  sideEffectsEn: string;
  manufacturer: string;
  strength: string;
  baseName: string;
  contraindications: string;
  contraindicationsEn: string;
  pregnancy: string;
  pregnancyEn: string;
  precautions: string;
  precautionsEn: string;
  therapeuticClass: string;
  therapeuticClassEn: string;
  storage: string;
  storageEn: string;
};

export type ShopOffer = {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  emoji: string;
  discountPct: number;
  minOrder: number;
  maxDiscount: number;
};

export type ShopLabTest = {
  id: string;
  bn: string;
  en: string;
  price: number;
  mrp: number;
  group: string;
  prep: string;
};

export type ShopDoctor = {
  id: string;
  name: string;
  spec: string;
  degree: string;
  exp: string;
  fee: number;
  emoji: string;
  photo: string;
  phone: string;
  whatsapp: string;
  videoUrl: string;
  online: boolean;
  workStart: string;
  workEnd: string;
  slotMinutes: number;
  workDays: number[];
};

export type ShopSettings = {
  deliveryFee: number;
  freeDeliveryMin: number;
  supportPhone: string;
  announcement: string;
  cod: boolean;
  bkash: boolean;
  nagad: boolean;
  card: boolean;
  expressEnabled: boolean;
  expressFee: number;
  expressEta: string;
  emergencyPhone: string;
};

export type Catalog = {
  products: ShopProduct[];
  categories: Category[];
  offers: ShopOffer[];
  labTests: ShopLabTest[];
  doctors: ShopDoctor[];
  settings: ShopSettings;
};

export const defaultSettings: ShopSettings = {
  deliveryFee: 60,
  freeDeliveryMin: 500,
  supportPhone: "09610-000000",
  announcement: "",
  cod: true,
  bkash: true,
  nagad: true,
  card: true,
  expressEnabled: true,
  expressFee: 120,
  expressEta: "৩০–৬০ মিনিট",
  emergencyPhone: "01700-000911",
};

const fallback: Catalog = {
  products: staticProducts.map((p) => ({
    ...p,
    stock: 50,
    lowStock: 10,
    image: "",
    descEn: "",
    indications: "",
    indicationsEn: "",
    dosage: "",
    dosageEn: "",
    sideEffects: "",
    sideEffectsEn: "",
    manufacturer: "",
    strength: "",
    baseName: "",
    contraindications: "",
    contraindicationsEn: "",
    pregnancy: "",
    pregnancyEn: "",
    precautions: "",
    precautionsEn: "",
    therapeuticClass: "",
    therapeuticClassEn: "",
    storage: "",
    storageEn: "",
  })),
  categories: staticCategories,
  offers: [],
  labTests: staticLabTests.map((t) => ({
    id: t.id,
    bn: t.bn,
    en: t.en,
    price: t.price,
    mrp: t.mrp,
    group: t.group,
    prep: t.prep,
  })),
  doctors: staticDoctors.map((d) => ({
    id: d.id,
    name: d.name,
    spec: d.spec,
    degree: d.degree,
    exp: d.exp,
    fee: d.fee,
    emoji: d.emoji,
    photo: "",
    phone: "",
    whatsapp: "",
    videoUrl: "",
    online: true,
    workStart: "10:00",
    workEnd: "22:00",
    slotMinutes: 30,
    workDays: [0, 1, 2, 3, 4, 5, 6],
  })),
  settings: defaultSettings,
};

type ProductRow = Awaited<ReturnType<typeof getCatalog>>["products"][number] &
  Record<string, unknown>;

function pickStr(r: ProductRow, ...keys: string[]): string {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === "string" && v.length) return v;
  }
  return "";
}

function pickNum(r: ProductRow, ...keys: string[]): number {
  for (const k of keys) {
    const v = Number(r[k]);
    if (Number.isFinite(v)) return v;
  }
  return 0;
}

function normalizeWorkDays(raw: unknown): number[] {
  const fallback = [0, 1, 2, 3, 4, 5, 6];
  let value: unknown = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  if (!Array.isArray(value)) return fallback;
  const days = value.map(Number).filter((n) => Number.isFinite(n) && n >= 0 && n <= 6);
  return days.length ? days : fallback;
}

export function mapProduct(r: ProductRow): ShopProduct {
  return {
    id: String(r.id ?? ""),
    name: pickStr(r, "name"),
    en: pickStr(r, "en"),
    brand: pickStr(r, "brand"),
    generic: pickStr(r, "generic"),
    form: pickStr(r, "form"),
    pack: pickStr(r, "pack"),
    price: pickNum(r, "price"),
    mrp: pickNum(r, "mrp"),
    category: pickStr(r, "category"),
    rx: Boolean(r.rx),
    rating: pickNum(r, "rating"),
    reviews: pickNum(r, "reviews"),
    emoji: pickStr(r, "emoji") || "💊",
    desc: pickStr(r, "description", "desc"),
    stock: pickNum(r, "stock"),
    lowStock: pickNum(r, "lowStockThreshold", "low_stock_threshold") || 10,
    image: pickStr(r, "imageUrl", "image_url"),
    medicineImage: pickStr(r, "medicineImageUrl", "medicine_image_url"),
    descEn: pickStr(r, "descriptionEn", "description_en"),
    indications: pickStr(r, "indications"),
    indicationsEn: pickStr(r, "indicationsEn", "indications_en"),
    dosage: pickStr(r, "dosage"),
    dosageEn: pickStr(r, "dosageEn", "dosage_en"),
    sideEffects: pickStr(r, "sideEffects", "side_effects"),
    sideEffectsEn: pickStr(r, "sideEffectsEn", "side_effects_en"),
    manufacturer: pickStr(r, "manufacturer"),
    strength: pickStr(r, "strength"),
    baseName: pickStr(r, "baseName", "base_name"),
    contraindications: pickStr(r, "contraindications"),
    contraindicationsEn: pickStr(r, "contraindicationsEn", "contraindications_en"),
    pregnancy: pickStr(r, "pregnancy"),
    pregnancyEn: pickStr(r, "pregnancyEn", "pregnancy_en"),
    precautions: pickStr(r, "precautions"),
    precautionsEn: pickStr(r, "precautionsEn", "precautions_en"),
    therapeuticClass: pickStr(r, "therapeuticClass", "therapeutic_class"),
    therapeuticClassEn: pickStr(r, "therapeuticClassEn", "therapeutic_class_en"),
    storage: pickStr(r, "storage"),
    storageEn: pickStr(r, "storageEn", "storage_en"),
  };
}

export const catalogQueryKey = ["catalog"] as const;

export function useCatalog(): Catalog {
  const { data } = useQuery({
    queryKey: catalogQueryKey,
    queryFn: () => getCatalog(),
    staleTime: 30_000,
    select: (raw): Catalog => {
      const map = new Map((raw.settings ?? []).map((s) => [s.key, s.value]));
      const num = (k: string, d: number) => {
        const v = Number(map.get(k));
        return Number.isFinite(v) ? v : d;
      };
      const bool = (k: string) => map.get(k) !== "false";
      return {
        products: raw.products.map(mapProduct),
        categories: raw.categories.map((c) => {
          const r = c as typeof c & {
            kind?: string;
            home_delivery?: boolean;
            home_service?: boolean;
            service_route?: string;
            description?: string;
            description_en?: string;
            eta?: string;
            eta_en?: string;
            base_fee?: number | string;
          };
          return {
            slug: String(c.slug ?? ""),
            bn: String(c.bn ?? ""),
            en: String(c.en ?? ""),
            emoji: String(c.emoji ?? "💊"),
            kind: (r.kind === "service" ? "service" : "product") as "product" | "service",
            homeDelivery: r.home_delivery ?? true,
            homeService: r.home_service ?? false,
            serviceRoute: String(r.service_route ?? ""),
            desc: String(r.description ?? ""),
            descEn: String(r.description_en ?? ""),
            eta: String(r.eta ?? ""),
            etaEn: String(r.eta_en ?? ""),
            baseFee: Number(r.base_fee ?? 0),
          };
        }),
        offers: raw.offers.map((o) => ({
          id: String(o.id ?? ""),
          code: String(o.code ?? ""),
          title: String(o.title ?? ""),
          subtitle: String(o.subtitle ?? ""),
          emoji: String(o.emoji ?? "🎁"),
          discountPct: Number(o.discount_pct),
          minOrder: Number(o.min_order),
          maxDiscount: Number(o.max_discount),
        })),
        labTests: (raw.labTests ?? []).map((t) => ({
          id: String(t.id ?? ""),
          bn: String(t.bn ?? ""),
          en: String(t.en ?? ""),
          price: Number(t.price),
          mrp: Number(t.mrp),
          group: String(t.grp ?? ""),
          prep: String(t.prep ?? ""),
        })),
        doctors: (raw.doctors ?? []).map((d) => ({
          id: String(d.id ?? ""),
          name: String(d.name ?? ""),
          spec: String(d.spec ?? ""),
          degree: String(d.degree ?? ""),
          exp: String(d.exp ?? ""),
          fee: Number(d.fee),
          emoji: String(d.emoji ?? "🩺"),
          photo: String(d.photo_url ?? ""),
          phone: String((d as { phone?: string }).phone ?? ""),
          whatsapp: String((d as { whatsapp?: string }).whatsapp ?? ""),
          videoUrl: String((d as { video_url?: string }).video_url ?? ""),
          online: (d as { online?: boolean }).online ?? true,
          workStart: String((d as { work_start?: string }).work_start || "10:00"),
          workEnd: String((d as { work_end?: string }).work_end || "22:00"),
          slotMinutes: Number((d as { slot_minutes?: number }).slot_minutes ?? 30) || 30,
          workDays: normalizeWorkDays((d as { work_days?: unknown }).work_days),
        })),
        settings: {
          deliveryFee: num("delivery_fee", 60),
          freeDeliveryMin: num("free_delivery_min", 500),
          supportPhone: map.get("support_phone") ?? defaultSettings.supportPhone,
          announcement: map.get("announcement") ?? "",
          cod: bool("cod_enabled"),
          bkash: bool("bkash_enabled"),
          nagad: bool("nagad_enabled"),
          card: bool("card_enabled"),
          expressEnabled: bool("express_enabled"),
          expressFee: num("express_fee", 120),
          expressEta: map.get("express_eta") ?? defaultSettings.expressEta,
          emergencyPhone: map.get("emergency_phone") ?? defaultSettings.emergencyPhone,
        },
      };
    },
  });

  if (!data || data.products.length === 0) return fallback;
  const hasServiceCats = data.categories.some((c) => c.kind === "service");
  return {
    ...data,
    categories: hasServiceCats
      ? data.categories
      : [
          ...data.categories,
          ...fallback.categories.filter((c) => c.kind === "service"),
        ],
    labTests: data.labTests.length ? data.labTests : fallback.labTests,
    doctors: data.doctors.length ? data.doctors : fallback.doctors,
  };
}

/** ডেলিভারি চার্জ হিসাব — ব্যাকএন্ড সেটিংস অনুযায়ী */
export function deliveryChargeFor(payable: number, settings: ShopSettings) {
  if (payable <= 0) return 0;
  return payable >= settings.freeDeliveryMin ? 0 : settings.deliveryFee;
}

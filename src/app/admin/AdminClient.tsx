"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminShell, type AdminNavGroup } from "@/components/AdminShell";
import { AdminDashboard } from "@/components/AdminDashboard";
import { useAuth } from "@/hooks/useAuth";
import type { AppRole } from "@/hooks/useAuth";
import { useT } from "@/lib/i18n";
import { ROLE_LABEL, ROLE_TABS, allowedTabs } from "@/lib/roles";
import { bn } from "@/data/catalog";
import { ProductImage } from "@/components/ProductImage";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AccountsReceivablePanel,
  ApiHubPanel,
  ErpAuditPanel,
  ErpRolesPanel,
  FinanceExtraPanel,
  LabelsPanel,
  StockCountPanel,
  TestsPanel,
} from "@/components/admin/RemainingErpPanels";

const MEDIA_KINDS = [
  { id: "box", t: "পণ্যের বক্স" },
  { id: "medicine", t: "ঔষধের ছবি" },
  { id: "banner", t: "ব্যানার" },
  { id: "category", t: "ক্যাটাগরি" },
  { id: "site", t: "ওয়েবসাইট" },
  { id: "other", t: "অন্যান্য" },
] as const;

const GROUPS: AdminNavGroup[] = [
  {
    label: "Overview",
    items: [
      { id: "dash", t: "ড্যাশবোর্ড", icon: "dash" },
      { id: "workspace", t: "ওয়ার্কস্পেস", icon: "workspace" },
      { id: "orders", t: "অর্ডার", icon: "orders" },
      { id: "rx", t: "প্রেসক্রিপশন", icon: "rx" },
      { id: "reports", t: "রিপোর্ট", icon: "reports" },
    ],
  },
  {
    label: "Catalog",
    items: [
      { id: "products", t: "প্রোডাক্ট", icon: "products" },
      { id: "categories", t: "ক্যাটাগরি", icon: "categories" },
      { id: "offers", t: "অফার", icon: "offers" },
      { id: "lab", t: "ল্যাব টেস্ট", icon: "lab" },
      { id: "doctors", t: "ডাক্তার", icon: "doctors" },
      { id: "gallery", t: "মিডিয়া গ্যালারি", icon: "gallery" },
      { id: "imgupload", t: "ছবি আপলোড", icon: "imgupload" },
      { id: "imgaudit", t: "ছবি যাচাই", icon: "imgaudit" },
      { id: "imgrev", t: "ছবি রিভিশন", icon: "imgrev" },
    ],
  },
  {
    label: "Ops",
    items: [
      { id: "pos", t: "POS", icon: "orders" },
      { id: "delivery", t: "ডেলিভারি", icon: "delivery" },
      { id: "diagnostics", t: "হোম ডায়াগনস্টিক", icon: "diagnostics" },
      { id: "consults", t: "কনসালটেশন", icon: "doctors" },
      { id: "stock", t: "স্টক", icon: "products" },
      { id: "stockcount", t: "স্টক কাউন্ট", icon: "products" },
      { id: "labels", t: "লেবেল প্রিন্ট", icon: "products" },
      { id: "procure", t: "ক্রয়", icon: "products" },
      { id: "finance", t: "ফাইন্যান্স", icon: "offers" },
      { id: "accounts", t: "অ্যাকাউন্টস", icon: "offers" },
      { id: "daybook", t: "ডেবুক", icon: "offers" },
      { id: "financials", t: "ফাইন্যান্সিয়ালস", icon: "offers" },
      { id: "party", t: "পার্টি স্টেটমেন্ট", icon: "offers" },
      { id: "support", t: "সাপোর্ট", icon: "dash" },
      { id: "loyalty", t: "লয়ালটি", icon: "offers" },
      { id: "campaigns", t: "ক্যাম্পেইন", icon: "campaigns" },
      { id: "branches", t: "শাখা", icon: "branches" },
      { id: "zones", t: "ডেলিভারি জোন", icon: "zones" },
    ],
  },
  {
    label: "System",
    items: [
      { id: "customers", t: "গ্রাহক", icon: "customers" },
      { id: "returns", t: "রিটার্ন", icon: "returns" },
      { id: "reviews", t: "রিভিউ", icon: "reviews" },
      { id: "staff", t: "স্টাফ ও ভূমিকা", icon: "staff" },
      { id: "erproles", t: "ERP রোলস", icon: "staff" },
      { id: "perms", t: "পারমিশন ম্যাট্রিক্স", icon: "perms" },
      { id: "health", t: "ডেটা হেলথ", icon: "health" },
      { id: "monitor", t: "সিস্টেম মনিটর", icon: "health" },
      { id: "audit", t: "অডিট লগ", icon: "health" },
      { id: "apihub", t: "API হাব", icon: "settings" },
      { id: "tests", t: "টেস্ট রিপোর্ট", icon: "health" },
      { id: "settings", t: "সেটিংস", icon: "settings" },
    ],
  },
];

const ASSIGNABLE_ROLES: AppRole[] = [
  "super_admin",
  "admin",
  "erp_manager",
  "accountant",
  "support_agent",
  "pharmacist",
  "rider",
];

const PERM_MODULE_LABEL: Record<string, string> = {
  dash: "ড্যাশবোর্ড",
  pos: "POS",
  orders: "অর্ডার",
  products: "প্রোডাক্ট",
  categories: "ক্যাটাগরি",
  offers: "অফার",
  customers: "গ্রাহক",
  support: "সাপোর্ট",
  rx: "প্রেসক্রিপশন",
  consults: "কনসালটেশন",
  doctors: "ডাক্তার",
  lab: "ল্যাব টেস্ট",
  diagnostics: "ডায়াগনস্টিক",
  gallery: "মিডিয়া গ্যালারি",
  imgupload: "ছবি আপলোড",
  imgaudit: "ছবি যাচাই",
  imgrev: "ছবি রিভিশন",
  delivery: "ডেলিভারি",
  zones: "ডেলিভারি জোন",
  branches: "শাখা",
  stock: "স্টক",
  stockcount: "স্টক কাউন্ট",
  labels: "লেবেল প্রিন্ট",
  procure: "ক্রয়",
  finance: "ফাইন্যান্স",
  accounts: "অ্যাকাউন্টস",
  daybook: "ডেবুক",
  financials: "ফাইন্যান্সিয়ালস",
  party: "পার্টি স্টেটমেন্ট",
  returns: "রিটার্ন",
  reviews: "রিভিউ",
  loyalty: "লয়ালটি",
  campaigns: "ক্যাম্পেইন",
  staff: "স্টাফ ও ভূমিকা",
  erproles: "ERP রোলস",
  perms: "পারমিশন ম্যাট্রিক্স",
  health: "ডেটা হেলথ",
  monitor: "সিস্টেম মনিটর",
  audit: "অডিট লগ",
  apihub: "API হাব",
  tests: "টেস্ট রিপোর্ট",
  settings: "সেটিংস",
  workspace: "ওয়ার্কস্পেস",
  reports: "রিপোর্ট",
};

const WORKSPACE_SIMPLE = [
  "pos",
  "orders",
  "stock",
  "products",
  "delivery",
  "finance",
  "customers",
  "reports",
];

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

const STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"] as const;
const RX_STATUSES = ["pending", "reviewing", "approved", "rejected", "fulfilled"] as const;
const APPT_STATUSES = ["confirmed", "completed", "cancelled"] as const;
const DIAG_STATUSES = [
  "requested",
  "confirmed",
  "on_the_way",
  "collected",
  "processing",
  "report_ready",
  "cancelled",
] as const;
const SVC_STATUSES = ["requested", "confirmed", "in_progress", "completed", "cancelled"] as const;
const RETURN_STATUSES = ["requested", "approved", "rejected", "refunded"] as const;
const RETURN_LABEL: Record<string, { bn: string; en: string }> = {
  requested: { bn: "অনুরোধ", en: "Requested" },
  approved: { bn: "অনুমোদিত", en: "Approved" },
  rejected: { bn: "বাতিল", en: "Rejected" },
  refunded: { bn: "রিফান্ড হয়েছে", en: "Refunded" },
};
const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;
const REVIEW_LABEL: Record<string, { bn: string; en: string }> = {
  pending: { bn: "অপেক্ষমাণ", en: "Pending" },
  approved: { bn: "অনুমোদিত", en: "Approved" },
  rejected: { bn: "বাতিল", en: "Rejected" },
};

type DashOrder = {
  id: string;
  order_no: string;
  status: string;
  total: number;
  created_at: string;
  payment_method?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
};

type DashProduct = {
  id: string;
  name: string;
  stock: number;
  low_stock_threshold: number;
  price: number;
  active: boolean;
};

type RxItem = {
  id: string;
  status: string;
  phone: string | null;
  note: string | null;
  adminNote: string | null;
  filePaths: string[];
  ocrText: string | null;
  createdAt: string;
};

type CatItem = {
  id: string;
  slug: string;
  name: string;
  nameEn: string | null;
  sortOrder: number;
  active: boolean;
};

type OfferItem = {
  id: string;
  code: string | null;
  title: string;
  discountPercent: number | null;
  discountAmount: number | null;
  active: boolean;
};

type ApptItem = {
  id: string;
  invoiceNo: string;
  doctorName: string;
  doctorSpec: string;
  mode: string;
  scheduledAt: string;
  patientName: string;
  phone: string;
  fee: number;
  status: string;
  joinUrl?: string;
  reminderSentAt?: string | null;
};

type ReminderItem = {
  id: string;
  appointmentId: string;
  channel: string;
  target: string;
  body: string;
  status: string;
  sentAt: string | null;
  createdAt: string;
};

export default function AdminClient() {
  const t = useT();
  const router = useRouter();
  const qc = useQueryClient();
  const { user, loading, isStaff, isAdmin, isSuperAdmin, profile, signOut, roles } = useAuth();
  const [active, setActive] = useState("dash");
  const [staffQ, setStaffQ] = useState("");
  const [permQ, setPermQ] = useState("");
  const [permRole, setPermRole] = useState<"" | AppRole>("");
  const [mediaKind, setMediaKind] = useState<string>("all");
  const [mediaQ, setMediaQ] = useState("");
  const [mediaUploadKind, setMediaUploadKind] = useState<string>("box");
  const [mediaUrl, setMediaUrl] = useState("");
  const [workspaceQ, setWorkspaceQ] = useState("");
  const [workspaceSimple, setWorkspaceSimple] = useState(false);
  const todayIso = isoDay(new Date());
  const [reportFrom, setReportFrom] = useState(
    isoDay(new Date(Date.now() - 29 * 864e5)),
  );
  const [reportTo, setReportTo] = useState(todayIso);
  const [imgFilter, setImgFilter] = useState<"missing" | "uploaded" | "external" | "all">(
    "missing",
  );
  const [imgQ, setImgQ] = useState("");
  const [imgPage, setImgPage] = useState(0);
  const [auditStatus, setAuditStatus] = useState("all");
  const [auditQ, setAuditQ] = useState("");
  const [auditPage, setAuditPage] = useState(0);
  const [auditBrokenIds, setAuditBrokenIds] = useState<string[]>([]);
  const [revView, setRevView] = useState<"gallery" | "audit">("gallery");
  const [revStatus, setRevStatus] = useState("pending");
  const [revMethod, setRevMethod] = useState("all");
  const [revQ, setRevQ] = useState("");
  const [revPage, setRevPage] = useState(0);
  const [revSel, setRevSel] = useState<string[]>([]);
  const [revForm, setRevForm] = useState({
    productId: "",
    field: "box",
    afterUrl: "",
    note: "",
  });
  const [uptime, setUptime] = useState({ ok: 0, total: 0, lastMs: 0, lastAt: "" });
  const [newCat, setNewCat] = useState({ slug: "", name: "", nameEn: "" });
  const [newOffer, setNewOffer] = useState({ title: "", code: "", discountPercent: "" });
  const [stockAdj, setStockAdj] = useState({
    productId: "",
    change: "",
    note: "",
    reason: "correction",
  });
  const [supportId, setSupportId] = useState<string | null>(null);
  const [supportReply, setSupportReply] = useState("");
  const [loyaltyForm, setLoyaltyForm] = useState({ email: "", points: "", reason: "" });
  const [posQ, setPosQ] = useState("");
  const [posCart, setPosCart] = useState<
    { productId: string; productName: string; price: number; qty: number }[]
  >([]);
  const [posCust, setPosCust] = useState({ name: "", phone: "", discount: "0", method: "cash" });
  const [supplierForm, setSupplierForm] = useState({ name: "", phone: "", contactPerson: "" });
  const [poForm, setPoForm] = useState({ supplierId: "", productId: "", qty: "10", cost: "" });
  const [expenseForm, setExpenseForm] = useState({ category: "misc", amount: "", note: "" });
  const [financeSub, setFinanceSub] = useState<"expenses" | "coa" | "journal">("expenses");
  const [coaForm, setCoaForm] = useState({ code: "", name: "", nameEn: "", kind: "asset" });
  const [journalForm, setJournalForm] = useState({
    entryDate: new Date().toISOString().slice(0, 10),
    memo: "",
    lines: [
      { accountCode: "1000", debit: "", credit: "" },
      { accountCode: "4000", debit: "", credit: "" },
    ],
  });
  const [riderForm, setRiderForm] = useState({ name: "", phone: "", zone: "" });
  const [assignForm, setAssignForm] = useState({ orderId: "", riderId: "" });
  const [labForm, setLabForm] = useState({ id: "", bn: "", en: "", price: "", group: "vital" });
  const [doctorForm, setDoctorForm] = useState({ name: "", spec: "", degree: "", fee: "" });
  const [blackoutFor, setBlackoutFor] = useState("");
  const [blackoutDay, setBlackoutDay] = useState("");
  const [blackoutReason, setBlackoutReason] = useState("");
  const [diagForm, setDiagForm] = useState({ slug: "", name: "", baseFee: "", eta: "" });
  const [settingsDraft, setSettingsDraft] = useState<Record<string, string>>({});
  const [customerQ, setCustomerQ] = useState("");
  const [customerTerm, setCustomerTerm] = useState("");
  const [returnFilter, setReturnFilter] = useState("requested");
  const [reviewFilter, setReviewFilter] = useState("pending");
  const [campaignSeg, setCampaignSeg] = useState<"all" | "buyers30" | "inactive60" | "highvalue">(
    "all",
  );
  const [campaignForm, setCampaignForm] = useState({ title: "", body: "" });
  const [branchForm, setBranchForm] = useState({
    code: "",
    name: "",
    nameEn: "",
    address: "",
    phone: "",
  });
  const [transferFrom, setTransferFrom] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [transferQ, setTransferQ] = useState("");
  const [transferItems, setTransferItems] = useState<
    { productId: string; productName: string; qty: number }[]
  >([]);
  const [zoneForm, setZoneForm] = useState({
    name: "",
    nameEn: "",
    district: "ঢাকা",
    thana: "",
    fee: "40",
    expressFee: "90",
    freeAbove: "1000",
    minOrder: "0",
    etaMinutes: "60",
  });
  const [zoneCartTest, setZoneCartTest] = useState("500");
  const [zoneOnlyActive, setZoneOnlyActive] = useState(false);

  const navGroups = useMemo(() => {
    const tabs = allowedTabs(roles);
    if (tabs === "all") return GROUPS;
    return GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((i) => tabs.has(i.id)),
    })).filter((g) => g.items.length > 0);
  }, [roles]);

  const title = useMemo(() => {
    for (const g of navGroups) {
      const hit = g.items.find((i) => i.id === active);
      if (hit) return hit.t;
    }
    return "Admin";
  }, [active, navGroups]);

  const dash = useQuery({
    queryKey: ["admin-dashboard"],
    enabled: !!user && isStaff,
    queryFn: async () => {
      const res = await fetch("/api/admin/dashboard", { cache: "no-store" });
      if (!res.ok) throw new Error("dashboard fetch failed");
      return res.json() as Promise<{ orders: DashOrder[]; products: DashProduct[] }>;
    },
  });

  const rxQ = useQuery({
    queryKey: ["admin-rx"],
    enabled: !!user && isStaff && active === "rx",
    queryFn: async () => {
      const res = await fetch("/api/admin/prescriptions", { cache: "no-store" });
      if (!res.ok) throw new Error("rx fetch failed");
      return res.json() as Promise<{ items: RxItem[] }>;
    },
  });

  const catQ = useQuery({
    queryKey: ["admin-categories"],
    enabled: !!user && isStaff && active === "categories",
    queryFn: async () => {
      const res = await fetch("/api/admin/categories", { cache: "no-store" });
      if (!res.ok) throw new Error("categories fetch failed");
      return res.json() as Promise<{ items: CatItem[] }>;
    },
  });

  const offerQ = useQuery({
    queryKey: ["admin-offers"],
    enabled: !!user && isStaff && active === "offers",
    queryFn: async () => {
      const res = await fetch("/api/admin/offers", { cache: "no-store" });
      if (!res.ok) throw new Error("offers fetch failed");
      return res.json() as Promise<{ items: OfferItem[] }>;
    },
  });

  const apptQ = useQuery({
    queryKey: ["admin-appointments"],
    enabled: !!user && isStaff && active === "consults",
    queryFn: async () => {
      const res = await fetch("/api/admin/appointments", { cache: "no-store" });
      if (!res.ok) throw new Error("appointments fetch failed");
      return res.json() as Promise<{ items: ApptItem[] }>;
    },
  });

  const remindersQ = useQuery({
    queryKey: ["admin-reminders"],
    enabled: !!user && isStaff && active === "consults",
    queryFn: async () => {
      const res = await fetch("/api/admin/reminders", { cache: "no-store" });
      if (!res.ok) throw new Error("reminders fetch failed");
      return res.json() as Promise<{
        counts: { queued: number; sent: number };
        items: ReminderItem[];
      }>;
    },
  });

  const catalogSvcQ = useQuery({
    queryKey: ["admin-catalog-services", active],
    enabled: !!user && isStaff && (active === "lab" || active === "doctors" || active === "diagnostics"),
    queryFn: async () => {
      const kind = active === "lab" ? "lab" : active === "doctors" ? "doctors" : "diagnostics";
      const res = await fetch(`/api/admin/catalog-services?kind=${kind}`, { cache: "no-store" });
      if (!res.ok) throw new Error("catalog-services fetch failed");
      return res.json() as Promise<{
        labTests: {
          id: string;
          bn: string;
          en: string;
          price: number;
          mrp: number;
          group: string;
          active: boolean;
        }[];
        doctors: {
          id: string;
          name: string;
          spec: string;
          fee: number;
          degree: string;
          active: boolean;
          online: boolean;
        }[];
        diagnostics: {
          id: string;
          slug: string;
          name: string;
          baseFee: number;
          eta: string;
          active: boolean;
        }[];
      }>;
    },
  });

  const blackoutsQ = useQuery({
    queryKey: ["admin-blackouts", blackoutFor],
    enabled: !!user && isStaff && active === "doctors" && !!blackoutFor,
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/doctor-blackouts?doctorId=${encodeURIComponent(blackoutFor)}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error("blackouts fetch failed");
      return res.json() as Promise<{
        items: { id: string; day: string; reason: string }[];
      }>;
    },
  });

  const stockQ = useQuery({
    queryKey: ["admin-stock"],
    enabled: !!user && isStaff && active === "stock",
    queryFn: async () => {
      const res = await fetch("/api/admin/stock", { cache: "no-store" });
      if (!res.ok) throw new Error("stock fetch failed");
      return res.json() as Promise<{
        products: {
          id: string;
          name: string;
          stock: number;
          lowStockThreshold: number;
          low: boolean;
        }[];
        movements: {
          id: string;
          productName: string;
          change: number;
          balance: number;
          kind: string;
          note: string | null;
          createdAt: string;
        }[];
        batches: {
          id: string;
          productName: string;
          batchNo: string;
          expiry: string | null;
          qty: number;
          cost: number;
        }[];
        adjustments: {
          id: string;
          adjNo: string;
          reason: string;
          note: string;
          createdAt: string;
          items: { productName: string; change: number; beforeQty: number; afterQty: number }[];
        }[];
      }>;
    },
  });

  const supportQ = useQuery({
    queryKey: ["admin-support"],
    enabled: !!user && isStaff && active === "support",
    queryFn: async () => {
      const res = await fetch("/api/admin/support", { cache: "no-store" });
      if (!res.ok) throw new Error("support fetch failed");
      return res.json() as Promise<{
        conversations: {
          id: string;
          title: string;
          status: string;
          userEmail: string | null;
          userName: string | null;
          lastMessageAt: string;
          unreadForAgent: number;
        }[];
      }>;
    },
  });

  const supportMsgQ = useQuery({
    queryKey: ["admin-support-msgs", supportId],
    enabled: !!user && isStaff && active === "support" && !!supportId,
    queryFn: async () => {
      const res = await fetch(`/api/admin/support?conversationId=${encodeURIComponent(supportId!)}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("messages fetch failed");
      return res.json() as Promise<{
        messages: { id: string; sender: string; body: string; agentName: string; createdAt: string }[];
      }>;
    },
  });

  const loyaltyQ = useQuery({
    queryKey: ["admin-loyalty"],
    enabled: !!user && isStaff && active === "loyalty",
    queryFn: async () => {
      const res = await fetch("/api/admin/loyalty", { cache: "no-store" });
      if (!res.ok) throw new Error("loyalty fetch failed");
      return res.json() as Promise<{
        accounts: {
          userId: string;
          email: string | null;
          name: string | null;
          balance: number;
          tier: string;
          pointsEarned: number;
          pointsSpent: number;
        }[];
        transactions: {
          id: string;
          userId: string;
          points: number;
          kind: string;
          reason: string;
          createdAt: string;
        }[];
      }>;
    },
  });

  const posTermQ = useQuery({
    queryKey: ["admin-pos", posQ],
    enabled: !!user && isStaff && active === "pos",
    queryFn: async () => {
      const qs = posQ.trim() ? `?q=${encodeURIComponent(posQ.trim())}` : "";
      const res = await fetch(`/api/admin/pos${qs}`, { cache: "no-store" });
      if (!res.ok) throw new Error("pos fetch failed");
      return res.json() as Promise<{
        products: { id: string; name: string; price: number; stock: number }[];
        sales: {
          id: string;
          invoiceNo: string;
          customerName: string;
          total: number;
          method: string;
          createdAt: string;
        }[];
      }>;
    },
  });

  const procureQ = useQuery({
    queryKey: ["admin-procure"],
    enabled: !!user && isStaff && active === "procure",
    queryFn: async () => {
      const res = await fetch("/api/admin/procurement", { cache: "no-store" });
      if (!res.ok) throw new Error("procure fetch failed");
      return res.json() as Promise<{
        suppliers: {
          id: string;
          name: string;
          phone: string;
          contactPerson: string;
          active: boolean;
        }[];
        orders: {
          id: string;
          poNo: string;
          supplierName: string;
          status: string;
          total: number;
          items: { productName: string; qty: number; cost: number }[];
        }[];
      }>;
    },
  });

  const financeQ = useQuery({
    queryKey: ["admin-finance"],
    enabled: !!user && isStaff && active === "finance",
    queryFn: async () => {
      const res = await fetch("/api/admin/finance", { cache: "no-store" });
      if (!res.ok) throw new Error("finance fetch failed");
      return res.json() as Promise<{
        summary: {
          onlineSales: number;
          posSales: number;
          posDue: number;
          expenses: number;
          net: number;
        };
        expenses: { id: string; category: string; amount: number; note: string | null; paidAt: string }[];
      }>;
    },
  });

  const coaQ = useQuery({
    queryKey: ["admin-coa"],
    enabled: !!user && isStaff && active === "finance",
    queryFn: async () => {
      const res = await fetch("/api/admin/coa", { cache: "no-store" });
      if (!res.ok) throw new Error("coa fetch failed");
      return res.json() as Promise<{
        accounts: { code: string; name: string; nameEn: string; kind: string; active: boolean }[];
        entries: {
          id: string;
          entryNo: string;
          entryDate: string;
          memo: string;
          total: number;
          lines: {
            id: string;
            accountCode: string;
            accountName: string;
            debit: number;
            credit: number;
          }[];
        }[];
      }>;
    },
  });

  const deliveryQ = useQuery({
    queryKey: ["admin-delivery"],
    enabled: !!user && isStaff && active === "delivery",
    queryFn: async () => {
      const res = await fetch("/api/admin/delivery", { cache: "no-store" });
      if (!res.ok) throw new Error("delivery fetch failed");
      return res.json() as Promise<{
        riders: {
          id: string;
          name: string;
          phone: string;
          zone: string;
          active: boolean;
          lastLat: number | null;
          lastLng: number | null;
        }[];
        deliveries: {
          id: string;
          orderNo: string;
          status: string;
          riderName: string | null;
          lastLat: number | null;
          lastLng: number | null;
          lastEvent: { status: string; note: string; createdAt: string } | null;
        }[];
        openOrders: { id: string; orderNo: string; customerName: string | null; status: string }[];
      }>;
    },
  });

  const bookingsQ = useQuery({
    queryKey: ["admin-bookings"],
    enabled: !!user && isStaff && active === "diagnostics",
    queryFn: async () => {
      const res = await fetch("/api/admin/bookings", { cache: "no-store" });
      if (!res.ok) throw new Error("bookings fetch failed");
      return res.json() as Promise<{
        diagnostics: {
          id: string;
          bookingNo: string;
          patientName: string;
          phone: string;
          total: number;
          status: string;
          scheduledDate: string;
          tests: { bn?: string; en?: string }[];
        }[];
        services: {
          id: string;
          requestNo: string;
          serviceName: string;
          patientName: string;
          phone: string;
          fee: number;
          status: string;
        }[];
      }>;
    },
  });

  const settingsQ = useQuery({
    queryKey: ["admin-settings"],
    enabled: !!user && isStaff && active === "settings",
    queryFn: async () => {
      const res = await fetch("/api/admin/settings", { cache: "no-store" });
      if (!res.ok) throw new Error("settings fetch failed");
      return res.json() as Promise<{
        items: {
          key: string;
          label: string;
          labelEn: string;
          kind: "bool" | "text" | "number";
          value: string;
        }[];
      }>;
    },
  });

  const customersQ = useQuery({
    queryKey: ["admin-customers", customerTerm],
    enabled: !!user && isStaff && active === "customers",
    queryFn: async () => {
      const qs = customerTerm ? `?q=${encodeURIComponent(customerTerm)}` : "";
      const res = await fetch(`/api/admin/customers${qs}`, { cache: "no-store" });
      if (!res.ok) throw new Error("customers fetch failed");
      return res.json() as Promise<{
        items: {
          userId: string;
          name: string;
          email: string;
          phone: string;
          isAdmin: boolean;
          ordersCount: number;
          totalSpent: number;
          joinedAt: string;
        }[];
      }>;
    },
  });

  const returnsQ = useQuery({
    queryKey: ["admin-returns", returnFilter],
    enabled: !!user && isStaff && active === "returns",
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/returns?status=${encodeURIComponent(returnFilter)}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error("returns fetch failed");
      return res.json() as Promise<{
        items: {
          id: string;
          orderNo: string;
          reason: string;
          details: string | null;
          refundAmount: number;
          status: string;
          adminNote: string | null;
          createdAt: string;
        }[];
      }>;
    },
  });

  const reviewsQ = useQuery({
    queryKey: ["admin-reviews", reviewFilter],
    enabled: !!user && isStaff && active === "reviews",
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/reviews?status=${encodeURIComponent(reviewFilter)}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error("reviews fetch failed");
      return res.json() as Promise<{
        items: {
          id: string;
          productId: string;
          productName: string | null;
          authorName: string | null;
          rating: number;
          comment: string | null;
          verified: boolean;
          status: string;
          createdAt: string;
        }[];
      }>;
    },
  });

  const campaignsQ = useQuery({
    queryKey: ["admin-campaigns", campaignSeg],
    enabled: !!user && isStaff && active === "campaigns",
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/campaigns?segment=${encodeURIComponent(campaignSeg)}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error("campaigns fetch failed");
      return res.json() as Promise<{
        count: number;
        history: { id: string; segment: string; title: string; sentCount: number; createdAt: string }[];
      }>;
    },
  });

  const branchesQ = useQuery({
    queryKey: ["admin-branches"],
    enabled: !!user && isStaff && active === "branches",
    queryFn: async () => {
      const res = await fetch("/api/admin/branches?kind=branches", { cache: "no-store" });
      if (!res.ok) throw new Error("branches fetch failed");
      return res.json() as Promise<{
        branches: {
          id: string;
          code: string;
          name: string;
          nameEn: string;
          address: string;
          phone: string;
          isMain: boolean;
          active: boolean;
        }[];
      }>;
    },
  });

  const transfersQ = useQuery({
    queryKey: ["admin-transfers"],
    enabled: !!user && isStaff && active === "branches",
    queryFn: async () => {
      const res = await fetch("/api/admin/branches?kind=transfers", { cache: "no-store" });
      if (!res.ok) throw new Error("transfers fetch failed");
      return res.json() as Promise<{
        transfers: {
          id: string;
          transferNo: string;
          fromBranchName: string;
          toBranchName: string;
          status: string;
          items: { productId: string; productName: string; qty: number }[];
          createdAt: string;
        }[];
      }>;
    },
  });

  const transferSearchQ = useQuery({
    queryKey: ["admin-transfer-search", transferQ],
    enabled: !!user && isStaff && active === "branches" && transferQ.trim().length > 1,
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/branches?kind=products&q=${encodeURIComponent(transferQ.trim())}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error("product search failed");
      return res.json() as Promise<{ products: { id: string; name: string; stock: number }[] }>;
    },
  });

  const zonesQ = useQuery({
    queryKey: ["admin-zones"],
    enabled: !!user && isStaff && active === "zones",
    queryFn: async () => {
      const res = await fetch("/api/admin/zones?all=1", { cache: "no-store" });
      if (!res.ok) throw new Error("zones fetch failed");
      return res.json() as Promise<{
        items: {
          id: string;
          name: string;
          nameEn: string;
          district: string;
          thana: string;
          fee: number;
          expressFee: number;
          freeAbove: number;
          minOrder: number;
          etaMinutes: number;
          active: boolean;
          sortOrder: number;
        }[];
      }>;
    },
  });

  const staffQry = useQuery({
    queryKey: ["admin-staff"],
    enabled: !!user && isStaff && active === "staff",
    queryFn: async () => {
      const res = await fetch("/api/admin/staff?kind=staff", { cache: "no-store" });
      if (!res.ok) throw new Error("staff fetch failed");
      return res.json() as Promise<{
        items: { userId: string; name: string; email: string; phone: string; roles: AppRole[] }[];
      }>;
    },
  });

  const staffSearchQ = useQuery({
    queryKey: ["admin-staff-search", staffQ],
    enabled: !!user && isStaff && active === "staff" && staffQ.trim().length > 1,
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/staff?kind=search&q=${encodeURIComponent(staffQ.trim())}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error("staff search failed");
      return res.json() as Promise<{
        items: { userId: string; name: string; email: string; phone: string; roles: AppRole[] }[];
      }>;
    },
  });

  const healthQ = useQuery({
    queryKey: ["admin-health"],
    enabled: !!user && isStaff && active === "health",
    queryFn: async () => {
      const res = await fetch("/api/admin/health", { cache: "no-store" });
      if (!res.ok) throw new Error("health fetch failed");
      return res.json() as Promise<{
        activeRiders: number;
        totalRiders: number;
        missingImg: number;
        activeProducts: number;
        doctors: number;
        cats: number;
        labs: number;
        pendingOrders: number;
        unassigned: number;
        offers: number;
      }>;
    },
  });

  const mediaQry = useQuery({
    queryKey: ["admin-media", mediaKind, mediaQ],
    enabled: !!user && isStaff && active === "gallery",
    queryFn: async () => {
      const params = new URLSearchParams();
      if (mediaKind !== "all") params.set("kind", mediaKind);
      if (mediaQ.trim()) params.set("q", mediaQ.trim());
      const res = await fetch(`/api/admin/media?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error("media fetch failed");
      return res.json() as Promise<{
        items: {
          id: string;
          url: string;
          path: string;
          name: string;
          kind: string;
          size: number;
          createdAt: string;
        }[];
      }>;
    },
  });

  const reportsQ = useQuery({
    queryKey: ["admin-reports", reportFrom, reportTo],
    enabled: !!user && isStaff && active === "reports",
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/reports?from=${encodeURIComponent(reportFrom)}&to=${encodeURIComponent(reportTo)}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error("reports fetch failed");
      return res.json() as Promise<{
        orders: {
          orderNo: string;
          createdAt: string;
          total: number;
          status: string;
          paymentMethod: string;
          paymentStatus: string;
        }[];
        items: { name: string; qty: number; price: number; orderStatus: string }[];
        lowStock: {
          id: string;
          name: string;
          brand: string;
          stock: number;
          lowStockThreshold: number;
        }[];
      }>;
    },
  });

  const imgCountsQ = useQuery({
    queryKey: ["admin-product-img-counts"],
    enabled: !!user && isStaff && active === "imgupload",
    queryFn: async () => {
      const res = await fetch("/api/admin/product-images?kind=counts", { cache: "no-store" });
      if (!res.ok) throw new Error("img counts failed");
      return res.json() as Promise<{
        total: number;
        missing: number;
        uploaded: number;
        external: number;
      }>;
    },
  });

  const imgListQ = useQuery({
    queryKey: ["admin-product-img-list", imgFilter, imgQ, imgPage],
    enabled: !!user && isStaff && active === "imgupload",
    queryFn: async () => {
      const params = new URLSearchParams({
        filter: imgFilter,
        page: String(imgPage),
      });
      if (imgQ.trim()) params.set("q", imgQ.trim());
      const res = await fetch(`/api/admin/product-images?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error("img list failed");
      return res.json() as Promise<{
        items: {
          id: string;
          name: string;
          en: string;
          imageUrl: string;
          medicineImageUrl: string;
        }[];
        count: number;
        pageSize: number;
      }>;
    },
  });

  const monitorStatsQ = useQuery({
    queryKey: ["admin-monitor-stats"],
    enabled: !!user && isStaff && active === "monitor",
    refetchInterval: active === "monitor" ? 60_000 : false,
    queryFn: async () => {
      const res = await fetch("/api/admin/monitor?kind=stats", { cache: "no-store" });
      if (!res.ok) throw new Error("monitor stats failed");
      return res.json() as Promise<Record<string, string | number>>;
    },
  });

  const monitorAlertsQ = useQuery({
    queryKey: ["admin-monitor-alerts"],
    enabled: !!user && isStaff && active === "monitor",
    queryFn: async () => {
      const res = await fetch("/api/admin/monitor?kind=alerts", { cache: "no-store" });
      if (!res.ok) throw new Error("monitor alerts failed");
      return res.json() as Promise<{
        items: {
          id: string;
          kind: string;
          detail: string;
          createdAt: string;
        }[];
      }>;
    },
  });

  const monitorErrorsQ = useQuery({
    queryKey: ["admin-monitor-errors"],
    enabled: !!user && isStaff && active === "monitor",
    queryFn: async () => {
      const res = await fetch("/api/admin/monitor?kind=errors", { cache: "no-store" });
      if (!res.ok) throw new Error("monitor errors failed");
      return res.json() as Promise<{
        items: {
          id: string;
          message: string;
          source: string;
          path: string;
          severity: string;
          createdAt: string;
        }[];
      }>;
    },
  });

  const auditSummaryQ = useQuery({
    queryKey: ["admin-image-audit-summary"],
    enabled: !!user && isStaff && active === "imgaudit",
    queryFn: async () => {
      const res = await fetch("/api/admin/image-audit?kind=summary", { cache: "no-store" });
      if (!res.ok) throw new Error("audit summary failed");
      return res.json() as Promise<{
        total: number;
        withMedicine: number;
        counts: Record<string, number>;
      }>;
    },
  });

  const auditListQ = useQuery({
    queryKey: ["admin-image-audit-list", auditStatus, auditQ, auditPage],
    enabled: !!user && isStaff && active === "imgaudit",
    queryFn: async () => {
      const params = new URLSearchParams({
        status: auditStatus,
        page: String(auditPage),
      });
      if (auditQ.trim()) params.set("q", auditQ.trim());
      const res = await fetch(`/api/admin/image-audit?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error("audit list failed");
      return res.json() as Promise<{
        items: {
          id: string;
          name: string;
          en: string;
          imageUrl: string;
          medicineImageUrl: string;
          status: string;
        }[];
        count: number;
        pageSize: number;
      }>;
    },
  });

  const revSummaryQ = useQuery({
    queryKey: ["admin-image-rev-summary"],
    enabled: !!user && isStaff && active === "imgrev",
    queryFn: async () => {
      const res = await fetch("/api/admin/image-revisions?kind=summary", { cache: "no-store" });
      if (!res.ok) throw new Error("rev summary failed");
      return res.json() as Promise<{ counts: Record<string, number>; watermarked: number }>;
    },
  });

  const revListQ = useQuery({
    queryKey: ["admin-image-rev-list", revStatus, revMethod, revQ, revPage],
    enabled: !!user && isStaff && active === "imgrev" && revView === "gallery",
    queryFn: async () => {
      const params = new URLSearchParams({
        status: revStatus,
        method: revMethod,
        page: String(revPage),
      });
      if (revQ.trim()) params.set("q", revQ.trim());
      const res = await fetch(`/api/admin/image-revisions?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error("rev list failed");
      return res.json() as Promise<{
        rows: {
          id: string;
          product_id: string;
          product_name: string;
          field: string;
          before_url: string;
          after_url: string;
          method: string;
          source: string;
          status: string;
          note: string;
        }[];
        count: number;
        pageSize: number;
      }>;
    },
  });

  const revAuditQ = useQuery({
    queryKey: ["admin-image-rev-audit", revQ],
    enabled: !!user && isStaff && active === "imgrev" && revView === "audit",
    queryFn: async () => {
      const params = new URLSearchParams({ kind: "audit", limit: "60" });
      if (revQ.trim()) params.set("q", revQ.trim());
      const res = await fetch(`/api/admin/image-revisions?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error("rev audit failed");
      return res.json() as Promise<{
        rows: {
          id: string;
          product_id: string;
          product_name: string;
          action: string;
          field: string;
          from_url: string;
          to_url: string;
          created_at: string;
        }[];
      }>;
    },
  });

  useEffect(() => {
    if (active !== "monitor") return;
    let alive = true;
    const ping = async () => {
      const t0 = performance.now();
      try {
        const res = await fetch("/api/public/health", { cache: "no-store" });
        const ms = Math.round(performance.now() - t0);
        if (!alive) return;
        setUptime((u) => ({
          ok: u.ok + (res.ok ? 1 : 0),
          total: u.total + 1,
          lastMs: ms,
          lastAt: new Date().toLocaleTimeString("bn-BD"),
        }));
      } catch {
        if (alive) {
          setUptime((u) => ({
            ...u,
            total: u.total + 1,
            lastAt: new Date().toLocaleTimeString("bn-BD"),
          }));
        }
      }
    };
    void ping();
    const t = setInterval(ping, 30_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [active]);

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error("status update failed");
    },
    onSuccess: () => {
      toast.success(t("স্ট্যাটাস আপডেট হয়েছে", "Status updated"));
      void qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: () => toast.error(t("আপডেট ব্যর্থ", "Update failed")),
  });

  const setRxStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch("/api/admin/prescriptions", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error("rx update failed");
    },
    onSuccess: () => {
      toast.success(t("প্রেসক্রিপশন আপডেট", "Prescription updated"));
      void qc.invalidateQueries({ queryKey: ["admin-rx"] });
    },
    onError: () => toast.error(t("আপডেট ব্যর্থ", "Update failed")),
  });

  const toggleCat = useMutation({
    mutationFn: async ({ id, active: next }: { id: string; active: boolean }) => {
      const res = await fetch("/api/admin/categories", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, active: next }),
      });
      if (!res.ok) throw new Error("category update failed");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success(t("ক্যাটাগরি আপডেট", "Category updated"));
    },
  });

  const addCat = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(newCat),
      });
      if (!res.ok) throw new Error("create failed");
    },
    onSuccess: () => {
      setNewCat({ slug: "", name: "", nameEn: "" });
      void qc.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success(t("ক্যাটাগরি যোগ হয়েছে", "Category added"));
    },
    onError: () => toast.error(t("যোগ ব্যর্থ", "Create failed")),
  });

  const toggleOffer = useMutation({
    mutationFn: async ({ id, active: next }: { id: string; active: boolean }) => {
      const res = await fetch("/api/admin/offers", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, active: next }),
      });
      if (!res.ok) throw new Error("offer update failed");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-offers"] });
      toast.success(t("অফার আপডেট", "Offer updated"));
    },
  });

  const addOffer = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/offers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: newOffer.title,
          code: newOffer.code || undefined,
          discountPercent: newOffer.discountPercent ? Number(newOffer.discountPercent) : undefined,
        }),
      });
      if (!res.ok) throw new Error("create failed");
    },
    onSuccess: () => {
      setNewOffer({ title: "", code: "", discountPercent: "" });
      void qc.invalidateQueries({ queryKey: ["admin-offers"] });
      toast.success(t("অফার যোগ হয়েছে", "Offer added"));
    },
    onError: () => toast.error(t("যোগ ব্যর্থ", "Create failed")),
  });

  const setApptStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch("/api/admin/appointments", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error("appt update failed");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-appointments"] });
      toast.success(t("অ্যাপয়েন্টমেন্ট আপডেট", "Appointment updated"));
    },
    onError: () => toast.error(t("আপডেট ব্যর্থ", "Update failed")),
  });

  const queueReminders = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/reminders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "queue", withinHours: 24 }),
      });
      if (!res.ok) throw new Error("queue failed");
      return res.json() as Promise<{ queued: number }>;
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["admin-reminders"] });
      void qc.invalidateQueries({ queryKey: ["admin-appointments"] });
      toast.success(
        t(`রিমাইন্ডার কিউ: ${data.queued}`, `Reminders queued: ${data.queued}`),
      );
    },
    onError: () => toast.error(t("কিউ ব্যর্থ", "Queue failed")),
  });

  const markReminderSent = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/admin/reminders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "mark_sent", id }),
      });
      if (!res.ok) throw new Error("mark sent failed");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-reminders"] });
      toast.success(t("পাঠানো চিহ্নিত", "Marked sent"));
    },
    onError: () => toast.error(t("আপডেট ব্যর্থ", "Update failed")),
  });

  const adjustStock = useMutation({
    mutationFn: async () => {
      const change = Number(stockAdj.change);
      const res = await fetch("/api/admin/stock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "apply_adjustment",
          reason: stockAdj.reason,
          productId: stockAdj.productId,
          change,
          note: stockAdj.note || undefined,
        }),
      });
      if (!res.ok) throw new Error("stock adjust failed");
      return res.json() as Promise<{ adjNo?: string }>;
    },
    onSuccess: (data) => {
      setStockAdj({ productId: "", change: "", note: "", reason: "correction" });
      void qc.invalidateQueries({ queryKey: ["admin-stock"] });
      void qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast.success(t(`স্টক ${data.adjNo ?? "OK"}`, `Stock ${data.adjNo ?? "OK"}`));
    },
    onError: () => toast.error(t("স্টক আপডেট ব্যর্থ", "Stock update failed")),
  });

  const replySupport = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/support", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId: supportId, body: supportReply }),
      });
      if (!res.ok) throw new Error("reply failed");
    },
    onSuccess: () => {
      setSupportReply("");
      void qc.invalidateQueries({ queryKey: ["admin-support-msgs", supportId] });
      void qc.invalidateQueries({ queryKey: ["admin-support"] });
      toast.success(t("রিপ্লাই পাঠানো হয়েছে", "Reply sent"));
    },
    onError: () => toast.error(t("রিপ্লাই ব্যর্থ", "Reply failed")),
  });

  const closeSupport = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/admin/support", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status: "closed" }),
      });
      if (!res.ok) throw new Error("close failed");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-support"] });
      toast.success(t("কথোপকথন বন্ধ", "Conversation closed"));
    },
  });

  const applyLoyalty = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/loyalty", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: loyaltyForm.email.trim().toLowerCase(),
          points: Number(loyaltyForm.points),
          reason: loyaltyForm.reason || undefined,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "loyalty failed");
      }
    },
    onSuccess: () => {
      setLoyaltyForm({ email: "", points: "", reason: "" });
      void qc.invalidateQueries({ queryKey: ["admin-loyalty"] });
      toast.success(t("পয়েন্ট আপডেট", "Points updated"));
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : t("লয়ালটি ব্যর্থ", "Loyalty update failed")),
  });

  const checkoutPos = useMutation({
    mutationFn: async () => {
      if (posCart.length === 0) throw new Error("empty cart");
      const res = await fetch("/api/admin/pos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: posCart,
          customerName: posCust.name,
          phone: posCust.phone,
          discount: Number(posCust.discount) || 0,
          method: posCust.method,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "POS failed");
      }
      return res.json() as Promise<{ invoiceNo: string }>;
    },
    onSuccess: (d) => {
      setPosCart([]);
      setPosCust({ name: "", phone: "", discount: "0", method: "cash" });
      void qc.invalidateQueries({ queryKey: ["admin-pos"] });
      void qc.invalidateQueries({ queryKey: ["admin-stock"] });
      void qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast.success(`${t("বিক্রয় সম্পন্ন", "Sale complete")} — ${d.invoiceNo}`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "POS failed"),
  });

  const addSupplier = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/procurement", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "supplier", ...supplierForm }),
      });
      if (!res.ok) throw new Error("supplier failed");
    },
    onSuccess: () => {
      setSupplierForm({ name: "", phone: "", contactPerson: "" });
      void qc.invalidateQueries({ queryKey: ["admin-procure"] });
      toast.success(t("সাপ্লায়ার যোগ", "Supplier added"));
    },
    onError: () => toast.error(t("সাপ্লায়ার ব্যর্থ", "Supplier failed")),
  });

  const createPo = useMutation({
    mutationFn: async () => {
      const name =
        (dash.data?.products ?? []).find((p) => p.id === poForm.productId)?.name || "";
      const res = await fetch("/api/admin/procurement", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "po",
          supplierId: poForm.supplierId,
          items: [
            {
              productId: poForm.productId,
              productName: name,
              qty: Number(poForm.qty) || 1,
              cost: Number(poForm.cost) || 0,
            },
          ],
        }),
      });
      if (!res.ok) throw new Error("PO failed");
    },
    onSuccess: () => {
      setPoForm({ supplierId: "", productId: "", qty: "10", cost: "" });
      void qc.invalidateQueries({ queryKey: ["admin-procure"] });
      toast.success(t("ক্রয় আদেশ তৈরি", "PO created"));
    },
    onError: () => toast.error(t("ক্রয় আদেশ ব্যর্থ", "PO failed")),
  });

  const receivePo = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/admin/procurement", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "receive_po", id }),
      });
      if (!res.ok) throw new Error("receive failed");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-procure"] });
      void qc.invalidateQueries({ queryKey: ["admin-stock"] });
      void qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast.success(t("মাল গ্রহণ সম্পন্ন", "PO received"));
    },
    onError: () => toast.error(t("গ্রহণ ব্যর্থ", "Receive failed")),
  });

  const addExpense = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/finance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          category: expenseForm.category,
          amount: Number(expenseForm.amount),
          note: expenseForm.note || undefined,
        }),
      });
      if (!res.ok) throw new Error("expense failed");
    },
    onSuccess: () => {
      setExpenseForm({ category: "misc", amount: "", note: "" });
      void qc.invalidateQueries({ queryKey: ["admin-finance"] });
      toast.success(t("খরচ যোগ", "Expense added"));
    },
    onError: () => toast.error(t("খরচ ব্যর্থ", "Expense failed")),
  });

  const addCoaAccount = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/coa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "add_account", ...coaForm }),
      });
      if (!res.ok) throw new Error("coa add failed");
    },
    onSuccess: () => {
      setCoaForm({ code: "", name: "", nameEn: "", kind: "asset" });
      void qc.invalidateQueries({ queryKey: ["admin-coa"] });
      toast.success(t("অ্যাকাউন্ট যোগ", "Account added"));
    },
    onError: () => toast.error(t("যোগ ব্যর্থ", "Add failed")),
  });

  const postJournal = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/coa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "post_journal",
          entryDate: journalForm.entryDate,
          memo: journalForm.memo,
          lines: journalForm.lines.map((l) => ({
            accountCode: l.accountCode,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
          })),
        }),
      });
      const data = (await res.json()) as { error?: string; entryNo?: string };
      if (!res.ok) throw new Error(data.error || "journal failed");
      return data;
    },
    onSuccess: (data) => {
      setJournalForm({
        entryDate: new Date().toISOString().slice(0, 10),
        memo: "",
        lines: [
          { accountCode: "1000", debit: "", credit: "" },
          { accountCode: "4000", debit: "", credit: "" },
        ],
      });
      void qc.invalidateQueries({ queryKey: ["admin-coa"] });
      toast.success(t(`জার্নাল ${data.entryNo}`, `Journal ${data.entryNo}`));
    },
    onError: (e: Error) => toast.error(e.message || t("পোস্ট ব্যর্থ", "Post failed")),
  });

  const addRider = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/delivery", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "rider", ...riderForm }),
      });
      if (!res.ok) throw new Error("rider failed");
    },
    onSuccess: () => {
      setRiderForm({ name: "", phone: "", zone: "" });
      void qc.invalidateQueries({ queryKey: ["admin-delivery"] });
      toast.success(t("রাইডার যোগ", "Rider added"));
    },
    onError: () => toast.error(t("রাইডার ব্যর্থ", "Rider failed")),
  });

  const assignRider = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/delivery", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "assign",
          orderId: assignForm.orderId,
          riderId: assignForm.riderId,
        }),
      });
      if (!res.ok) throw new Error("assign failed");
    },
    onSuccess: () => {
      setAssignForm({ orderId: "", riderId: "" });
      void qc.invalidateQueries({ queryKey: ["admin-delivery"] });
      toast.success(t("রাইডার অ্যাসাইন", "Rider assigned"));
    },
    onError: () => toast.error(t("অ্যাসাইন ব্যর্থ", "Assign failed")),
  });

  const setDeliveryStatus = useMutation({
    mutationFn: async ({ deliveryId, status }: { deliveryId: string; status: string }) => {
      const res = await fetch("/api/admin/delivery", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "status", deliveryId, status }),
      });
      if (!res.ok) throw new Error("status failed");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-delivery"] });
      toast.success(t("স্ট্যাটাস আপডেট", "Status updated"));
    },
    onError: () => toast.error(t("স্ট্যাটাস ব্যর্থ", "Status update failed")),
  });

  const pingRider = useMutation({
    mutationFn: async (riderId: string) => {
      const res = await fetch("/api/admin/delivery", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "ping",
          riderId,
          lat: 23.8103 + Math.random() * 0.02,
          lng: 90.4125 + Math.random() * 0.02,
        }),
      });
      if (!res.ok) throw new Error("ping failed");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-delivery"] });
      toast.success(t("লোকেশন আপডেট", "Location updated"));
    },
  });

  const createCatalogSvc = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/admin/catalog-services", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "create failed");
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-catalog-services"] });
      void qc.invalidateQueries({ queryKey: ["catalog"] });
      setLabForm({ id: "", bn: "", en: "", price: "", group: "vital" });
      setDoctorForm({ name: "", spec: "", degree: "", fee: "" });
      setDiagForm({ slug: "", name: "", baseFee: "", eta: "" });
      toast.success(t("সংরক্ষিত", "Saved"));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "failed"),
  });

  const addBlackout = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/doctor-blackouts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          doctorId: blackoutFor,
          day: blackoutDay,
          reason: blackoutReason,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "add failed");
    },
    onSuccess: () => {
      toast.success(t("ছুটি যোগ হয়েছে", "Blackout added"));
      setBlackoutDay("");
      setBlackoutReason("");
      void qc.invalidateQueries({ queryKey: ["admin-blackouts", blackoutFor] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("ব্যর্থ", "Failed")),
  });

  const delBlackout = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/doctor-blackouts?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("delete failed");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-blackouts", blackoutFor] });
    },
    onError: () => toast.error(t("মুছতে ব্যর্থ", "Delete failed")),
  });

  const patchCatalogSvc = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/admin/catalog-services", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("patch failed");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-catalog-services"] });
      void qc.invalidateQueries({ queryKey: ["catalog"] });
      toast.success(t("আপডেট", "Updated"));
    },
  });

  const patchProduct = useMutation({
    mutationFn: async (payload: { id: string; active?: boolean; price?: number }) => {
      const res = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("product patch failed");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      void qc.invalidateQueries({ queryKey: ["catalog"] });
      toast.success(t("প্রোডাক্ট আপডেট", "Product updated"));
    },
    onError: () => toast.error(t("প্রোডাক্ট আপডেট ব্যর্থ", "Product update failed")),
  });

  const patchBooking = useMutation({
    mutationFn: async (payload: {
      kind: "diagnostic" | "service";
      id: string;
      status: string;
    }) => {
      const res = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("booking patch failed");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      toast.success(t("স্ট্যাটাস আপডেট", "Status updated"));
    },
  });

  const saveSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) throw new Error("settings update failed");
    },
    onSuccess: () => {
      toast.success(t("সেটিংস সংরক্ষিত", "Settings saved"));
      void qc.invalidateQueries({ queryKey: ["admin-settings"] });
      void qc.invalidateQueries({ queryKey: ["catalog"] });
    },
    onError: () => toast.error(t("সেটিংস ব্যর্থ", "Settings update failed")),
  });

  const setCustomerAdmin = useMutation({
    mutationFn: async ({ userId, makeAdmin }: { userId: string; makeAdmin: boolean }) => {
      const res = await fetch("/api/admin/customers", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, makeAdmin }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error || "customer role update failed");
    },
    onSuccess: () => {
      toast.success(t("ভূমিকা হালনাগাদ হয়েছে", "Role updated"));
      void qc.invalidateQueries({ queryKey: ["admin-customers"] });
    },
    onError: (e: Error) =>
      toast.error(
        e.message.includes("CANNOT_DEMOTE_SELF")
          ? t("নিজের অ্যাডমিন ভূমিকা সরানো যাবে না", "Cannot demote yourself")
          : e.message,
      ),
  });

  const patchReturn = useMutation({
    mutationFn: async (payload: { id: string; status?: string; adminNote?: string }) => {
      const res = await fetch("/api/admin/returns", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("return update failed");
    },
    onSuccess: () => {
      toast.success(t("স্ট্যাটাস আপডেট হয়েছে", "Status updated"));
      void qc.invalidateQueries({ queryKey: ["admin-returns"] });
    },
    onError: () => toast.error(t("আপডেট ব্যর্থ", "Update failed")),
  });

  const patchReview = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error("review update failed");
    },
    onSuccess: () => {
      toast.success(t("রিভিউ আপডেট হয়েছে", "Review updated"));
      void qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
    onError: () => toast.error(t("আপডেট ব্যর্থ", "Update failed")),
  });

  const deleteReview = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/reviews?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("review delete failed");
    },
    onSuccess: () => {
      toast.success(t("রিভিউ মুছে ফেলা হয়েছে", "Review deleted"));
      void qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
    onError: () => toast.error(t("মুছতে ব্যর্থ", "Delete failed")),
  });

  const sendCampaign = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          segment: campaignSeg,
          title: campaignForm.title,
          body: campaignForm.body,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; sent?: number };
      if (!res.ok) throw new Error(data.error || "send failed");
      return data;
    },
    onSuccess: (r) => {
      toast.success(
        t(`${r.sent ?? 0} জন গ্রাহকের কাছে পাঠানো হয়েছে`, `Sent to ${r.sent ?? 0} customers`),
      );
      setCampaignForm({ title: "", body: "" });
      void qc.invalidateQueries({ queryKey: ["admin-campaigns"] });
    },
    onError: (e: Error) =>
      toast.error(
        e.message === "TITLE_REQUIRED" ? t("শিরোনাম লিখুন", "Title required") : e.message,
      ),
  });

  const addBranch = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/branches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "create_branch", ...branchForm }),
      });
      if (!res.ok) throw new Error("branch create failed");
    },
    onSuccess: () => {
      toast.success(t("শাখা যুক্ত হয়েছে", "Branch added"));
      setBranchForm({ code: "", name: "", nameEn: "", address: "", phone: "" });
      void qc.invalidateQueries({ queryKey: ["admin-branches"] });
    },
    onError: () => toast.error(t("শাখা যোগ ব্যর্থ", "Branch create failed")),
  });

  const toggleBranch = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await fetch("/api/admin/branches", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "branch", id, active }),
      });
      if (!res.ok) throw new Error("branch toggle failed");
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-branches"] }),
  });

  const createTransfer = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/branches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "create_transfer",
          fromBranchId: transferFrom,
          toBranchId: transferTo,
          items: transferItems,
        }),
      });
      if (!res.ok) throw new Error("transfer create failed");
    },
    onSuccess: () => {
      toast.success(t("ট্রান্সফার পাঠানো হয়েছে", "Transfer sent"));
      setTransferItems([]);
      void qc.invalidateQueries({ queryKey: ["admin-transfers"] });
      void qc.invalidateQueries({ queryKey: ["admin-stock"] });
    },
    onError: () => toast.error(t("ট্রান্সফার ব্যর্থ", "Transfer failed")),
  });

  const patchTransfer = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch("/api/admin/branches", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "transfer", id, status }),
      });
      if (!res.ok) throw new Error("transfer status failed");
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-transfers"] }),
  });

  const addZone = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/zones", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: zoneForm.name,
          nameEn: zoneForm.nameEn,
          district: zoneForm.district,
          thana: zoneForm.thana,
          fee: Number(zoneForm.fee) || 0,
          expressFee: Number(zoneForm.expressFee) || 0,
          freeAbove: Number(zoneForm.freeAbove) || 0,
          minOrder: Number(zoneForm.minOrder) || 0,
          etaMinutes: Number(zoneForm.etaMinutes) || 60,
        }),
      });
      if (!res.ok) throw new Error("zone create failed");
    },
    onSuccess: () => {
      toast.success(t("জোন যুক্ত হয়েছে", "Zone added"));
      setZoneForm((s) => ({ ...s, name: "", nameEn: "", thana: "" }));
      void qc.invalidateQueries({ queryKey: ["admin-zones"] });
    },
    onError: () => toast.error(t("জোন যোগ ব্যর্থ", "Zone create failed")),
  });

  const patchZone = useMutation({
    mutationFn: async (body: {
      id: string;
      fee?: number;
      expressFee?: number;
      freeAbove?: number;
      minOrder?: number;
      etaMinutes?: number;
      active?: boolean;
    }) => {
      const res = await fetch("/api/admin/zones", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("zone update failed");
    },
    onSuccess: () => {
      toast.success(t("সংরক্ষিত", "Saved"));
      void qc.invalidateQueries({ queryKey: ["admin-zones"] });
    },
    onError: () => toast.error(t("আপডেট ব্যর্থ", "Update failed")),
  });

  const setStaffRole = useMutation({
    mutationFn: async ({
      userId,
      role,
      grant,
    }: {
      userId: string;
      role: AppRole;
      grant: boolean;
    }) => {
      const res = await fetch("/api/admin/staff", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, role, grant }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "role update failed");
    },
    onSuccess: () => {
      toast.success(t("ভূমিকা হালনাগাদ হয়েছে", "Role updated"));
      void qc.invalidateQueries({ queryKey: ["admin-staff"] });
      void qc.invalidateQueries({ queryKey: ["admin-staff-search"] });
    },
    onError: (e: Error) => {
      const m = e.message;
      toast.error(
        m === "SUPER_ADMIN_REQUIRED"
          ? t("শুধু সুপার অ্যাডমিন এই ভূমিকা দিতে পারেন", "Only super admin can assign this role")
          : m === "CANNOT_DEMOTE_SELF"
            ? t("নিজের অ্যাডমিন ভূমিকা সরানো যাবে না", "Cannot demote yourself")
            : m,
      );
    },
  });

  const uploadMedia = useMutation({
    mutationFn: async (files: FileList) => {
      for (const f of Array.from(files)) {
        const fd = new FormData();
        fd.set("file", f);
        fd.set("kind", mediaUploadKind);
        const res = await fetch("/api/admin/media", { method: "POST", body: fd });
        if (!res.ok) throw new Error("upload failed");
      }
    },
    onSuccess: () => {
      toast.success(t("ছবি গ্যালারিতে যুক্ত হয়েছে", "Image added to gallery"));
      void qc.invalidateQueries({ queryKey: ["admin-media"] });
    },
    onError: () => toast.error(t("আপলোড ব্যর্থ", "Upload failed")),
  });

  const addMediaUrl = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/media", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: mediaUrl.trim(), kind: mediaUploadKind }),
      });
      if (!res.ok) throw new Error("url add failed");
    },
    onSuccess: () => {
      setMediaUrl("");
      toast.success(t("লিংক থেকে ছবি যুক্ত হয়েছে", "Image added from URL"));
      void qc.invalidateQueries({ queryKey: ["admin-media"] });
    },
    onError: () => toast.error(t("যোগ ব্যর্থ", "Add failed")),
  });

  const deleteMedia = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/media?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("delete failed");
    },
    onSuccess: () => {
      toast.success(t("ছবি মুছে ফেলা হয়েছে", "Image deleted"));
      void qc.invalidateQueries({ queryKey: ["admin-media"] });
    },
    onError: () => toast.error(t("মুছতে ব্যর্থ", "Delete failed")),
  });

  const uploadProductImg = useMutation({
    mutationFn: async ({
      productId,
      file,
      field,
    }: {
      productId: string;
      file: File;
      field?: "imageUrl" | "medicineImageUrl";
    }) => {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("productId", productId);
      fd.set("field", field ?? "imageUrl");
      const res = await fetch("/api/admin/product-images", { method: "POST", body: fd });
      if (!res.ok) throw new Error("upload failed");
      return res.json() as Promise<{ url: string }>;
    },
    onSuccess: () => {
      toast.success(t("ছবি যুক্ত হয়েছে", "Image uploaded"));
      void qc.invalidateQueries({ queryKey: ["admin-product-img-counts"] });
      void qc.invalidateQueries({ queryKey: ["admin-product-img-list"] });
      void qc.invalidateQueries({ queryKey: ["admin-health"] });
    },
    onError: () => toast.error(t("আপলোড ব্যর্থ", "Upload failed")),
  });

  const setProductImgUrl = useMutation({
    mutationFn: async ({
      productId,
      imageUrl,
    }: {
      productId: string;
      imageUrl: string;
    }) => {
      const res = await fetch("/api/admin/product-images", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId, imageUrl }),
      });
      if (!res.ok) throw new Error("set url failed");
    },
    onSuccess: () => {
      toast.success(t("লিংক সংরক্ষিত", "URL saved"));
      void qc.invalidateQueries({ queryKey: ["admin-product-img-counts"] });
      void qc.invalidateQueries({ queryKey: ["admin-product-img-list"] });
    },
    onError: () => toast.error(t("সংরক্ষণ ব্যর্থ", "Save failed")),
  });

  const runStockAlerts = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/monitor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "run_alerts" }),
      });
      const data = (await res.json().catch(() => ({}))) as { created?: number };
      if (!res.ok) throw new Error("alerts failed");
      return data;
    },
    onSuccess: (r) => {
      toast.success(
        (r.created ?? 0) > 0
          ? t(`${bn(r.created!)} টি নতুন সতর্কতা`, `${bn(r.created!)} new alerts`)
          : t("নতুন কোনো সতর্কতা নেই", "No new alerts"),
      );
      void qc.invalidateQueries({ queryKey: ["admin-monitor-alerts"] });
      void qc.invalidateQueries({ queryKey: ["admin-monitor-stats"] });
    },
    onError: () => toast.error(t("সতর্কতা চালাতে ব্যর্থ", "Failed to run alerts")),
  });

  const rescanImages = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/image-audit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "rescan", limit: 40 }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        checked?: number;
        broken?: number;
        brokenIds?: string[];
      };
      if (!res.ok) throw new Error("rescan failed");
      return data;
    },
    onSuccess: (r) => {
      setAuditBrokenIds(r.brokenIds ?? []);
      toast.success(
        t(
          `যাচাই সম্পন্ন — ${bn(r.checked ?? 0)} টি, ভাঙা ${bn(r.broken ?? 0)} টি`,
          `Checked ${bn(r.checked ?? 0)}, broken ${bn(r.broken ?? 0)}`,
        ),
      );
      void qc.invalidateQueries({ queryKey: ["admin-image-audit-summary"] });
      void qc.invalidateQueries({ queryKey: ["admin-image-audit-list"] });
    },
    onError: () => toast.error(t("যাচাই ব্যর্থ", "Rescan failed")),
  });

  const refreshRevs = () => {
    setRevSel([]);
    void qc.invalidateQueries({ queryKey: ["admin-image-rev-summary"] });
    void qc.invalidateQueries({ queryKey: ["admin-image-rev-list"] });
    void qc.invalidateQueries({ queryKey: ["admin-image-rev-audit"] });
  };

  const revAction = useMutation({
    mutationFn: async ({ action, ids }: { action: string; ids: string[] }) => {
      const res = await fetch("/api/admin/image-revisions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, ids }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        applied?: number;
        rejected?: number;
        restored?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "rev action failed");
      return { action, ...data };
    },
    onSuccess: (r) => {
      if (r.action === "approve") {
        toast.success(t(`${bn(r.applied ?? 0)}টি ছবি লাইভ হলো`, `${bn(r.applied ?? 0)} images live`));
      } else if (r.action === "reject") {
        toast.success(t(`${bn(r.rejected ?? 0)}টি বাতিল হলো`, `${bn(r.rejected ?? 0)} rejected`));
      } else {
        toast.success(
          t(`${bn(r.restored ?? 0)}টি আগের ছবিতে ফেরানো হলো`, `${bn(r.restored ?? 0)} rolled back`),
        );
      }
      refreshRevs();
    },
    onError: () => toast.error(t("রিভিশন অ্যাকশন ব্যর্থ", "Revision action failed")),
  });

  const createRev = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/image-revisions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "create",
          productId: revForm.productId.trim(),
          field: revForm.field,
          afterUrl: revForm.afterUrl.trim(),
          note: revForm.note.trim(),
          method: "manual",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "create failed");
      return data;
    },
    onSuccess: () => {
      toast.success(t("রিভিশন যোগ হয়েছে", "Revision queued"));
      setRevForm({ productId: "", field: "box", afterUrl: "", note: "" });
      refreshRevs();
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : t("রিভিশন যোগ ব্যর্থ", "Create failed")),
  });

  if (loading) {
    return <p className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading…</p>;
  }

  if (!user || !isStaff) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <p className="text-sm font-bold">{t("অ্যাডমিন অ্যাক্সেস প্রয়োজন", "Admin access required")}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("স্টাফ অ্যাকাউন্ট দিয়ে লগইন করুন।", "Sign in with a staff account.")}
          </p>
          <Link
            href="/auth"
            className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
          >
            {t("লগইন", "Log in")}
          </Link>
        </div>
      </div>
    );
  }

  const orders = dash.data?.orders ?? [];
  const products = dash.data?.products ?? [];
  const deliveryOrders = orders.filter((o) =>
    ["confirmed", "processing", "shipped", "delivered"].includes(o.status),
  );

  const reportTrend = useMemo(() => {
    const map = new Map<string, { day: string; sales: number; orders: number }>();
    for (
      let d = new Date(`${reportFrom}T00:00:00Z`);
      isoDay(d) <= reportTo;
      d = new Date(d.getTime() + 864e5)
    ) {
      map.set(isoDay(d), { day: isoDay(d), sales: 0, orders: 0 });
    }
    for (const o of reportsQ.data?.orders ?? []) {
      if (o.status === "cancelled") continue;
      const k = o.createdAt.slice(0, 10);
      const row = map.get(k);
      if (!row) continue;
      row.sales += Number(o.total || 0);
      row.orders += 1;
    }
    return [...map.values()];
  }, [reportsQ.data?.orders, reportFrom, reportTo]);

  const reportTotals = useMemo(() => {
    const live = (reportsQ.data?.orders ?? []).filter((o) => o.status !== "cancelled");
    const sales = live.reduce((s, o) => s + Number(o.total || 0), 0);
    const cancelled = (reportsQ.data?.orders ?? []).filter((o) => o.status === "cancelled").length;
    const paid = live
      .filter((o) => o.paymentStatus === "paid")
      .reduce((s, o) => s + Number(o.total || 0), 0);
    return {
      sales,
      paid,
      due: sales - paid,
      count: live.length,
      cancelled,
      avg: live.length ? sales / live.length : 0,
    };
  }, [reportsQ.data?.orders]);

  const reportTopProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; amount: number }>();
    for (const it of reportsQ.data?.items ?? []) {
      if (it.orderStatus === "cancelled") continue;
      const cur = map.get(it.name) ?? { name: it.name, qty: 0, amount: 0 };
      cur.qty += Number(it.qty || 0);
      cur.amount += Number(it.qty || 0) * Number(it.price || 0);
      map.set(it.name, cur);
    }
    return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 10);
  }, [reportsQ.data?.items]);

  const reportClosing = useMemo(() => {
    const day = (reportsQ.data?.orders ?? []).filter(
      (o) => o.createdAt.slice(0, 10) === todayIso && o.status !== "cancelled",
    );
    const by = (m: string) =>
      day.filter((o) => o.paymentMethod === m).reduce((s, o) => s + Number(o.total || 0), 0);
    return {
      count: day.length,
      total: day.reduce((s, o) => s + Number(o.total || 0), 0),
      cod: by("cod"),
      bkash: by("bkash"),
      nagad: by("nagad"),
      card: by("card"),
    };
  }, [reportsQ.data?.orders, todayIso]);

  const workspaceMods = useMemo(() => {
    const all = navGroups.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label })));
    const base = workspaceSimple ? all.filter((m) => WORKSPACE_SIMPLE.includes(m.id)) : all;
    const q = workspaceQ.trim().toLowerCase();
    return q ? base.filter((m) => m.t.toLowerCase().includes(q)) : base;
  }, [navGroups, workspaceQ, workspaceSimple]);

  return (
    <AdminShell
      groups={navGroups}
      active={active}
      onSelect={setActive}
      title={title}
      email={user.email}
      onSignOut={async () => {
        await signOut();
        router.push("/auth");
      }}
    >
      <div className="space-y-4 p-1">
        {active === "dash" && (
          <>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-sm font-bold text-navy">
                {t("স্বাগতম", "Welcome")}
                {profile?.name ? `, ${profile.name}` : ""}
                {isAdmin ? " · Admin" : ""}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t(
                  "লাইভ MySQL অ্যাডমিন — অর্ডার, Rx, ক্যাটালগ ও কনসালটেশন।",
                  "Live MySQL admin — orders, Rx, catalog & consults.",
                )}
              </p>
            </div>
            <AdminDashboard
              orders={orders.map((o) => ({
                id: o.id,
                status: o.status,
                total: o.total,
                created_at: o.created_at,
                payment_method: o.payment_method,
              }))}
              products={products.map((p) => ({
                id: p.id,
                name: p.name,
                stock: p.stock,
                low_stock_threshold: p.low_stock_threshold,
              }))}
              loading={dash.isLoading}
            />
          </>
        )}

        {active === "workspace" && (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold">
                {t("আমার ওয়ার্কস্পেস", "My workspace")}
              </p>
              <span className="text-[11px] text-muted-foreground">
                {workspaceMods.length} {t("টি মডিউল", "modules")}
              </span>
              <button
                type="button"
                onClick={() => setWorkspaceSimple((v) => !v)}
                className={`ml-auto rounded-full px-3 py-1.5 text-[11px] font-bold ${
                  workspaceSimple
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-navy"
                }`}
              >
                {t("সহজ মোড", "Simple mode")}
              </button>
            </div>
            <input
              value={workspaceQ}
              onChange={(e) => setWorkspaceQ(e.target.value)}
              placeholder={t("মডিউল খুঁজুন…", "Search modules…")}
              className="min-h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"
            />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {workspaceMods.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setActive(m.id)}
                  className="rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary"
                >
                  <p className="truncate text-sm font-bold text-navy">{m.t}</p>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {m.group}
                  </p>
                </button>
              ))}
              {workspaceMods.length === 0 && (
                <p className="col-span-full p-6 text-center text-xs text-muted-foreground">
                  {t("কোনো মডিউল মেলেনি", "No modules matched")}
                </p>
              )}
            </div>
          </section>
        )}

        {active === "reports" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-card p-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  {t("শুরুর তারিখ", "From")}
                </label>
                <input
                  type="date"
                  value={reportFrom}
                  onChange={(e) => setReportFrom(e.target.value)}
                  className="h-11 rounded-lg border border-border bg-background px-3 text-base"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  {t("শেষ তারিখ", "To")}
                </label>
                <input
                  type="date"
                  value={reportTo}
                  onChange={(e) => setReportTo(e.target.value)}
                  className="h-11 rounded-lg border border-border bg-background px-3 text-base"
                />
              </div>
              <button
                type="button"
                onClick={() => void reportsQ.refetch()}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm"
              >
                {t("রিফ্রেশ", "Refresh")}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                {
                  t: t("মোট বিক্রয়", "Total sales"),
                  v: `৳${bn(Math.round(reportTotals.sales))}`,
                },
                {
                  t: t("পরিশোধিত", "Paid"),
                  v: `৳${bn(Math.round(reportTotals.paid))}`,
                },
                {
                  t: t("বকেয়া (COD)", "Due (COD)"),
                  v: `৳${bn(Math.round(reportTotals.due))}`,
                },
                {
                  t: t("গড় অর্ডার মূল্য", "Avg order"),
                  v: `৳${bn(Math.round(reportTotals.avg))}`,
                },
              ].map((k) => (
                <div key={k.t} className="rounded-xl border border-border bg-card p-3">
                  <p className="text-xs text-muted-foreground">{k.t}</p>
                  <p className="mt-1 text-lg font-bold">{k.v}</p>
                </div>
              ))}
            </div>

            <section className="rounded-xl border border-border bg-card p-3">
              <h3 className="mb-3 text-sm font-semibold">
                {t("বিক্রয় ট্রেন্ড", "Sales trend")}
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={reportTrend}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis
                      dataKey="day"
                      tickFormatter={(d: string) => d.slice(5)}
                      fontSize={11}
                    />
                    <YAxis fontSize={11} />
                    <Tooltip
                      formatter={(v, n) => [
                        n === "sales"
                          ? `৳${bn(Math.round(Number(v)))}`
                          : bn(Number(v)),
                        n === "sales" ? t("বিক্রয়", "Sales") : t("অর্ডার", "Orders"),
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.15}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-xl border border-border bg-card p-3">
                <h3 className="mb-3 text-sm font-semibold">
                  {t("সর্বাধিক বিক্রীত পণ্য (শীর্ষ ১০)", "Top products (10)")}
                </h3>
                {reportTopProducts.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    {t("এই সময়ে কোন বিক্রয় নেই", "No sales in this range")}
                  </p>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={reportTopProducts}
                        layout="vertical"
                        margin={{ left: 12 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                        <XAxis type="number" fontSize={11} />
                        <YAxis type="category" dataKey="name" width={110} fontSize={10} />
                        <Tooltip formatter={(v) => bn(Number(v))} />
                        <Bar dataKey="qty" fill="hsl(var(--primary))" radius={4} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-border bg-card p-3">
                <h3 className="mb-3 text-sm font-semibold">
                  {t("লো-স্টক অ্যালার্ট", "Low-stock alert")}
                </h3>
                <div className="max-h-72 overflow-auto">
                  {(reportsQ.data?.lowStock?.length ?? 0) === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      {t("সব পণ্যের স্টক ঠিক আছে", "All stock levels OK")}
                    </p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-card text-left text-xs text-muted-foreground">
                        <tr>
                          <th className="py-2">{t("পণ্য", "Product")}</th>
                          <th className="py-2">{t("কোম্পানি", "Brand")}</th>
                          <th className="py-2 text-right">{t("স্টক", "Stock")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportsQ.data!.lowStock.map((p) => (
                          <tr key={p.id} className="border-t border-border/60">
                            <td className="py-2 pr-2">{p.name}</td>
                            <td className="py-2 pr-2 text-xs text-muted-foreground">
                              {p.brand}
                            </td>
                            <td
                              className={`py-2 text-right font-semibold ${
                                Number(p.stock) === 0 ? "text-destructive" : "text-amber-600"
                              }`}
                            >
                              {bn(Number(p.stock))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>
            </div>

            <section className="rounded-xl border border-border bg-card p-3">
              <h3 className="mb-3 text-sm font-semibold">
                {t("আজকের ক্লোজিং রিপোর্ট", "Today's closing")} ({todayIso})
              </h3>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
                {[
                  { t: t("অর্ডার", "Orders"), v: bn(reportClosing.count) },
                  {
                    t: t("মোট", "Total"),
                    v: `৳${bn(Math.round(reportClosing.total))}`,
                  },
                  { t: "COD", v: `৳${bn(Math.round(reportClosing.cod))}` },
                  { t: "bKash", v: `৳${bn(Math.round(reportClosing.bkash))}` },
                  { t: "Nagad", v: `৳${bn(Math.round(reportClosing.nagad))}` },
                  {
                    t: t("কার্ড", "Card"),
                    v: `৳${bn(Math.round(reportClosing.card))}`,
                  },
                ].map((k) => (
                  <div key={k.t} className="rounded-lg border border-border/60 p-2">
                    <p className="text-xs text-muted-foreground">{k.t}</p>
                    <p className="text-sm font-bold">{k.v}</p>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {t("বাতিল অর্ডার", "Cancelled")}: {bn(reportTotals.cancelled)} ·{" "}
                {t("নির্বাচিত সময়ের মোট অর্ডার", "Orders in range")}:{" "}
                {bn(reportTotals.count)}
              </p>
            </section>
          </div>
        )}

        {active === "orders" && (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">{t("অর্ডার", "Order")}</th>
                  <th className="px-3 py-2">{t("গ্রাহক", "Customer")}</th>
                  <th className="px-3 py-2">{t("মোট", "Total")}</th>
                  <th className="px-3 py-2">{t("স্ট্যাটাস", "Status")}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <p className="font-semibold text-navy">{o.order_no}</p>
                      <p className="text-[10px] text-muted-foreground">{o.created_at?.slice(0, 16)}</p>
                    </td>
                    <td className="px-3 py-2">
                      <p>{o.customer_name || "—"}</p>
                      <p className="text-[10px] text-muted-foreground">{o.customer_phone}</p>
                    </td>
                    <td className="px-3 py-2 font-semibold">৳{Math.round(o.total).toLocaleString("en-US")}</td>
                    <td className="px-3 py-2">
                      <select
                        value={o.status}
                        disabled={setStatus.isPending}
                        onChange={(e) => setStatus.mutate({ id: o.id, status: e.target.value })}
                        className="rounded-md border border-border bg-background px-2 py-1 text-[11px]"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && !dash.isLoading && (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                      {t("কোনো অর্ডার নেই", "No orders yet")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {active === "products" && (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">{t("প্রোডাক্ট", "Product")}</th>
                  <th className="px-3 py-2 text-right">{t("স্টক", "Stock")}</th>
                  <th className="px-3 py-2 text-right">{t("দাম", "Price")}</th>
                  <th className="px-3 py-2">{t("অবস্থা", "Status")}</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-3 py-2 font-semibold text-navy">{p.name}</td>
                    <td
                      className={`px-3 py-2 text-right ${
                        p.stock <= p.low_stock_threshold ? "font-bold text-amber-600" : ""
                      }`}
                    >
                      {p.stock}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={p.price}
                        disabled={patchProduct.isPending}
                        onBlur={(e) => {
                          const next = Number(e.target.value);
                          if (!Number.isFinite(next) || next === p.price) return;
                          patchProduct.mutate({ id: p.id, price: next });
                        }}
                        className="w-24 rounded-md border border-border bg-background px-2 py-1 text-right text-[11px]"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        disabled={patchProduct.isPending}
                        onClick={() => patchProduct.mutate({ id: p.id, active: !p.active })}
                        className={`rounded px-2 py-1 text-[11px] font-semibold ${
                          p.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {p.active ? t("সক্রিয়", "Active") : t("বন্ধ", "Off")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
              <Link href="/products" className="text-primary underline">
                {t("স্টোরফ্রন্ট ক্যাটালগ", "Storefront catalog")}
              </Link>
            </p>
          </div>
        )}

        {active === "rx" && (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">{t("প্রেসক্রিপশন", "Prescription")}</th>
                  <th className="px-3 py-2">{t("নোট", "Note")}</th>
                  <th className="px-3 py-2">{t("ফাইল", "Files")}</th>
                  <th className="px-3 py-2">{t("স্ট্যাটাস", "Status")}</th>
                </tr>
              </thead>
              <tbody>
                {(rxQ.data?.items ?? []).map((r) => (
                  <tr key={r.id} className="border-t border-border align-top">
                    <td className="px-3 py-2">
                      <p className="font-mono text-[10px] text-muted-foreground">{r.id.slice(0, 8)}…</p>
                      <p className="text-[10px]">{r.createdAt?.slice(0, 16)}</p>
                      <p className="text-[10px] text-muted-foreground">{r.phone || "—"}</p>
                    </td>
                    <td className="max-w-[220px] px-3 py-2">
                      <p className="line-clamp-3">{r.note || r.ocrText || "—"}</p>
                    </td>
                    <td className="px-3 py-2">
                      {r.filePaths.map((p) => (
                        <a
                          key={p}
                          href={`/uploads/${p}`}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-primary underline"
                        >
                          {p.split("/").pop()}
                        </a>
                      ))}
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={r.status}
                        disabled={setRxStatus.isPending}
                        onChange={(e) => setRxStatus.mutate({ id: r.id, status: e.target.value })}
                        className="rounded-md border border-border bg-background px-2 py-1 text-[11px]"
                      >
                        {RX_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
                {!rxQ.isLoading && (rxQ.data?.items?.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                      {t("কোনো প্রেসক্রিপশন নেই", "No prescriptions yet")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {active === "categories" && (
          <div className="space-y-3">
            <form
              className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-3"
              onSubmit={(e) => {
                e.preventDefault();
                addCat.mutate();
              }}
            >
              <input
                required
                placeholder="slug"
                value={newCat.slug}
                onChange={(e) => setNewCat((s) => ({ ...s, slug: e.target.value }))}
                className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
              />
              <input
                required
                placeholder={t("নাম", "Name")}
                value={newCat.name}
                onChange={(e) => setNewCat((s) => ({ ...s, name: e.target.value }))}
                className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
              />
              <input
                placeholder="EN"
                value={newCat.nameEn}
                onChange={(e) => setNewCat((s) => ({ ...s, nameEn: e.target.value }))}
                className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
              />
              <button
                type="submit"
                disabled={addCat.isPending}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
              >
                {t("যোগ", "Add")}
              </button>
            </form>
            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">{t("নাম", "Name")}</th>
                    <th className="px-3 py-2">slug</th>
                    <th className="px-3 py-2">{t("সক্রিয়", "Active")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(catQ.data?.items ?? []).map((c) => (
                    <tr key={c.id} className="border-t border-border">
                      <td className="px-3 py-2 font-semibold text-navy">
                        {c.name}
                        {c.nameEn ? (
                          <span className="ml-1 text-[10px] text-muted-foreground">({c.nameEn})</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 font-mono text-[10px]">{c.slug}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            c.active ? "bg-secondary text-primary-dark" : "bg-muted text-muted-foreground"
                          }`}
                          onClick={() => toggleCat.mutate({ id: c.id, active: !c.active })}
                        >
                          {c.active ? t("সক্রিয়", "Active") : t("বন্ধ", "Off")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {active === "offers" && (
          <div className="space-y-3">
            <form
              className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-3"
              onSubmit={(e) => {
                e.preventDefault();
                addOffer.mutate();
              }}
            >
              <input
                required
                placeholder={t("শিরোনাম", "Title")}
                value={newOffer.title}
                onChange={(e) => setNewOffer((s) => ({ ...s, title: e.target.value }))}
                className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
              />
              <input
                placeholder="CODE"
                value={newOffer.code}
                onChange={(e) => setNewOffer((s) => ({ ...s, code: e.target.value }))}
                className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
              />
              <input
                placeholder="%"
                value={newOffer.discountPercent}
                onChange={(e) => setNewOffer((s) => ({ ...s, discountPercent: e.target.value }))}
                className="w-16 rounded-md border border-border bg-background px-2 py-1.5 text-xs"
              />
              <button
                type="submit"
                disabled={addOffer.isPending}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
              >
                {t("যোগ", "Add")}
              </button>
            </form>
            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">{t("অফার", "Offer")}</th>
                    <th className="px-3 py-2">{t("ছাড়", "Discount")}</th>
                    <th className="px-3 py-2">{t("সক্রিয়", "Active")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(offerQ.data?.items ?? []).map((o) => (
                    <tr key={o.id} className="border-t border-border">
                      <td className="px-3 py-2">
                        <p className="font-semibold text-navy">{o.title}</p>
                        {o.code && <p className="font-mono text-[10px] text-muted-foreground">{o.code}</p>}
                      </td>
                      <td className="px-3 py-2">
                        {o.discountPercent != null
                          ? `${o.discountPercent}%`
                          : o.discountAmount != null
                            ? `৳${o.discountAmount}`
                            : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            o.active ? "bg-secondary text-primary-dark" : "bg-muted text-muted-foreground"
                          }`}
                          onClick={() => toggleOffer.mutate({ id: o.id, active: !o.active })}
                        >
                          {o.active ? t("সক্রিয়", "Active") : t("বন্ধ", "Off")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {active === "delivery" && (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-4">
              <input
                value={riderForm.name}
                onChange={(e) => setRiderForm({ ...riderForm, name: e.target.value })}
                placeholder={t("রাইডার নাম", "Rider name")}
                className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <input
                value={riderForm.phone}
                onChange={(e) => setRiderForm({ ...riderForm, phone: e.target.value })}
                placeholder={t("মোবাইল", "Phone")}
                className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <input
                value={riderForm.zone}
                onChange={(e) => setRiderForm({ ...riderForm, zone: e.target.value })}
                placeholder={t("জোন", "Zone")}
                className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <button
                type="button"
                disabled={!riderForm.name.trim() || addRider.isPending}
                onClick={() => addRider.mutate()}
                className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {t("রাইডার যোগ", "Add rider")}
              </button>
            </div>

            <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-3">
              <select
                value={assignForm.orderId}
                onChange={(e) => setAssignForm({ ...assignForm, orderId: e.target.value })}
                className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm"
              >
                <option value="">{t("অর্ডার", "Order")}</option>
                {(deliveryQ.data?.openOrders ?? []).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.orderNo} · {o.customerName || "—"}
                  </option>
                ))}
              </select>
              <select
                value={assignForm.riderId}
                onChange={(e) => setAssignForm({ ...assignForm, riderId: e.target.value })}
                className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm"
              >
                <option value="">{t("রাইডার", "Rider")}</option>
                {(deliveryQ.data?.riders ?? [])
                  .filter((r) => r.active)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.phone ? `· ${r.phone}` : ""}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                disabled={!assignForm.orderId || !assignForm.riderId || assignRider.isPending}
                onClick={() => assignRider.mutate()}
                className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {t("অ্যাসাইন", "Assign")}
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                <p className="border-b border-border px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">
                  {t("রাইডার", "Riders")}
                </p>
                <ul className="divide-y divide-border text-xs">
                  {(deliveryQ.data?.riders ?? []).map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-2 px-3 py-2">
                      <div>
                        <p className="font-semibold text-navy">{r.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {r.phone || "—"} · {r.zone || "—"}
                          {r.lastLat != null && r.lastLng != null
                            ? ` · ${r.lastLat.toFixed(4)},${r.lastLng.toFixed(4)}`
                            : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => pingRider.mutate(r.id)}
                        className="rounded-md border border-border px-2 py-1 text-[10px] font-semibold"
                      >
                        {t("ম্যাপ পিং", "Map ping")}
                      </button>
                    </li>
                  ))}
                  {!deliveryQ.isLoading && (deliveryQ.data?.riders?.length ?? 0) === 0 && (
                    <li className="px-3 py-6 text-center text-muted-foreground">
                      {t("কোনো রাইডার নেই", "No riders")}
                    </li>
                  )}
                </ul>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                <p className="border-b border-border px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">
                  {t("ডেলিভারি", "Deliveries")}
                </p>
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">{t("অর্ডার", "Order")}</th>
                      <th className="px-3 py-2">{t("রাইডার", "Rider")}</th>
                      <th className="px-3 py-2">{t("স্ট্যাটাস", "Status")}</th>
                      <th className="px-3 py-2">{t("ম্যাপ", "Map")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(deliveryQ.data?.deliveries ?? []).map((d) => (
                      <tr key={d.id} className="border-t border-border align-top">
                        <td className="px-3 py-2 font-semibold text-navy">
                          <Link href={`/track/${d.orderNo}`} className="underline">
                            {d.orderNo}
                          </Link>
                          {d.lastEvent && (
                            <p className="mt-1 text-[10px] font-normal text-muted-foreground">
                              {d.lastEvent.note || d.lastEvent.status}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2">{d.riderName || "—"}</td>
                        <td className="px-3 py-2">
                          <select
                            value={d.status}
                            disabled={setDeliveryStatus.isPending}
                            onChange={(e) =>
                              setDeliveryStatus.mutate({
                                deliveryId: d.id,
                                status: e.target.value,
                              })
                            }
                            className="rounded border border-border bg-background px-1.5 py-1 text-[11px]"
                          >
                            {["assigned", "picked_up", "in_transit", "delivered", "failed", "cancelled"].map(
                              (s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ),
                            )}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-[10px] text-muted-foreground">
                          {d.lastLat != null && d.lastLng != null
                            ? `${d.lastLat.toFixed(4)}, ${d.lastLng.toFixed(4)}`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                    {(deliveryQ.data?.deliveries?.length ?? 0) === 0 &&
                      deliveryOrders.map((o) => (
                        <tr key={o.id} className="border-t border-border">
                          <td className="px-3 py-2 font-semibold text-navy">{o.order_no}</td>
                          <td className="px-3 py-2">—</td>
                          <td className="px-3 py-2">{o.status}</td>
                          <td className="px-3 py-2">
                            <Link href={`/track/${o.order_no}`} className="text-primary underline">
                              track
                            </Link>
                          </td>
                        </tr>
                      ))}
                    {!deliveryQ.isLoading &&
                      (deliveryQ.data?.deliveries?.length ?? 0) === 0 &&
                      deliveryOrders.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                            {t("কোনো ডেলিভারি নেই", "No deliveries")}
                          </td>
                        </tr>
                      )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {active === "pos" && (
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="space-y-3">
              <input
                value={posQ}
                onChange={(e) => setPosQ(e.target.value)}
                placeholder={t("পণ্য খুঁজুন…", "Search products…")}
                className="min-h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
              />
              <div className="grid gap-2 sm:grid-cols-2">
                {(posTermQ.data?.products ?? []).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setPosCart((cart) => {
                        const i = cart.findIndex((c) => c.productId === p.id);
                        if (i >= 0) {
                          const next = [...cart];
                          next[i] = { ...next[i]!, qty: next[i]!.qty + 1 };
                          return next;
                        }
                        return [
                          ...cart,
                          { productId: p.id, productName: p.name, price: p.price, qty: 1 },
                        ];
                      });
                    }}
                    className="rounded-xl border border-border bg-card px-3 py-2 text-left text-xs hover:border-primary"
                  >
                    <p className="font-semibold text-navy">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      ৳{p.price} · {t("স্টক", "Stock")} {p.stock}
                    </p>
                  </button>
                ))}
              </div>
              <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                <p className="border-b border-border px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">
                  {t("সাম্প্রতিক বিক্রয়", "Recent sales")}
                </p>
                <ul className="divide-y divide-border text-xs">
                  {(posTermQ.data?.sales ?? []).map((s) => (
                    <li key={s.id} className="flex justify-between px-3 py-2">
                      <span className="font-mono text-[10px]">{s.invoiceNo}</span>
                      <span>
                        ৳{s.total} · {s.method}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
              <p className="text-sm font-bold">{t("কার্ট", "Cart")}</p>
              <ul className="space-y-2 text-xs">
                {posCart.map((l) => (
                  <li key={l.productId} className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{l.productName}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="rounded border px-1"
                        onClick={() =>
                          setPosCart((c) =>
                            c
                              .map((x) =>
                                x.productId === l.productId ? { ...x, qty: Math.max(1, x.qty - 1) } : x,
                              )
                              .filter((x) => x.qty > 0),
                          )
                        }
                      >
                        −
                      </button>
                      <span>{l.qty}</span>
                      <button
                        type="button"
                        className="rounded border px-1"
                        onClick={() =>
                          setPosCart((c) =>
                            c.map((x) =>
                              x.productId === l.productId ? { ...x, qty: x.qty + 1 } : x,
                            ),
                          )
                        }
                      >
                        +
                      </button>
                      <span className="w-14 text-right">৳{l.price * l.qty}</span>
                    </div>
                  </li>
                ))}
                {posCart.length === 0 && (
                  <li className="py-4 text-center text-muted-foreground">{t("খালি", "Empty")}</li>
                )}
              </ul>
              <input
                value={posCust.name}
                onChange={(e) => setPosCust({ ...posCust, name: e.target.value })}
                placeholder={t("গ্রাহক", "Customer")}
                className="min-h-9 w-full rounded-lg border border-border bg-background px-2 text-xs"
              />
              <input
                value={posCust.phone}
                onChange={(e) => setPosCust({ ...posCust, phone: e.target.value })}
                placeholder={t("মোবাইল", "Phone")}
                className="min-h-9 w-full rounded-lg border border-border bg-background px-2 text-xs"
              />
              <div className="flex gap-2">
                <input
                  value={posCust.discount}
                  onChange={(e) => setPosCust({ ...posCust, discount: e.target.value })}
                  placeholder={t("ডিসকাউন্ট", "Discount")}
                  className="min-h-9 w-full rounded-lg border border-border bg-background px-2 text-xs"
                />
                <select
                  value={posCust.method}
                  onChange={(e) => setPosCust({ ...posCust, method: e.target.value })}
                  className="min-h-9 rounded-lg border border-border bg-background px-2 text-xs"
                >
                  <option value="cash">cash</option>
                  <option value="bkash">bkash</option>
                  <option value="nagad">nagad</option>
                  <option value="card">card</option>
                  <option value="due">due</option>
                </select>
              </div>
              <p className="text-sm font-bold">
                ৳
                {Math.max(
                  posCart.reduce((a, l) => a + l.price * l.qty, 0) - (Number(posCust.discount) || 0),
                  0,
                )}
              </p>
              <button
                type="button"
                disabled={posCart.length === 0 || checkoutPos.isPending}
                onClick={() => checkoutPos.mutate()}
                className="min-h-10 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {t("চেকআউট", "Checkout")}
              </button>
            </div>
          </div>
        )}

        {active === "procure" && (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-4">
              <input
                value={supplierForm.name}
                onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                placeholder={t("সাপ্লায়ার", "Supplier")}
                className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <input
                value={supplierForm.contactPerson}
                onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })}
                placeholder={t("যোগাযোগ", "Contact")}
                className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <input
                value={supplierForm.phone}
                onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                placeholder={t("মোবাইল", "Phone")}
                className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <button
                type="button"
                disabled={!supplierForm.name.trim() || addSupplier.isPending}
                onClick={() => addSupplier.mutate()}
                className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {t("সাপ্লায়ার যোগ", "Add supplier")}
              </button>
            </div>

            <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-5">
              <select
                value={poForm.supplierId}
                onChange={(e) => setPoForm({ ...poForm, supplierId: e.target.value })}
                className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm"
              >
                <option value="">{t("সাপ্লায়ার", "Supplier")}</option>
                {(procureQ.data?.suppliers ?? [])
                  .filter((s) => s.active)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
              <select
                value={poForm.productId}
                onChange={(e) => setPoForm({ ...poForm, productId: e.target.value })}
                className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm sm:col-span-2"
              >
                <option value="">{t("পণ্য", "Product")}</option>
                {(dash.data?.products ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <input
                value={poForm.qty}
                onChange={(e) => setPoForm({ ...poForm, qty: e.target.value })}
                placeholder="qty"
                className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <div className="flex gap-2">
                <input
                  value={poForm.cost}
                  onChange={(e) => setPoForm({ ...poForm, cost: e.target.value })}
                  placeholder={t("কস্ট", "Cost")}
                  className="min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                />
                <button
                  type="button"
                  disabled={
                    !poForm.supplierId || !poForm.productId || createPo.isPending
                  }
                  onClick={() => createPo.mutate()}
                  className="min-h-10 shrink-0 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                >
                  PO
                </button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                <p className="border-b border-border px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">
                  {t("সাপ্লায়ার", "Suppliers")}
                </p>
                <ul className="divide-y divide-border text-xs">
                  {(procureQ.data?.suppliers ?? []).map((s) => (
                    <li key={s.id} className="px-3 py-2">
                      <p className="font-semibold text-navy">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {s.contactPerson || "—"} · {s.phone || "—"} · {s.active ? "active" : "off"}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                <p className="border-b border-border px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">
                  {t("ক্রয় আদেশ", "Purchase orders")}
                </p>
                <ul className="divide-y divide-border text-xs">
                  {(procureQ.data?.orders ?? []).map((o) => (
                    <li key={o.id} className="flex items-center justify-between gap-2 px-3 py-2">
                      <div>
                        <p className="font-mono text-[10px] font-semibold">{o.poNo}</p>
                        <p className="text-muted-foreground">
                          {o.supplierName} · ৳{o.total} · {o.status}
                        </p>
                      </div>
                      {o.status !== "received" && (
                        <button
                          type="button"
                          disabled={receivePo.isPending}
                          onClick={() => receivePo.mutate(o.id)}
                          className="rounded-md border border-border px-2 py-1 text-[10px] font-semibold"
                        >
                          {t("গ্রহণ", "Receive")}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {active === "finance" && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                { k: t("অনলাইন", "Online"), v: financeQ.data?.summary.onlineSales },
                { k: "POS", v: financeQ.data?.summary.posSales },
                { k: t("POS বাকি", "POS due"), v: financeQ.data?.summary.posDue },
                { k: t("খরচ", "Expenses"), v: financeQ.data?.summary.expenses },
                { k: t("নেট", "Net"), v: financeQ.data?.summary.net },
              ].map((x) => (
                <div key={x.k} className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-[11px] uppercase text-muted-foreground">{x.k}</p>
                  <p className="mt-1 text-lg font-bold text-navy">
                    ৳{Number(x.v ?? 0).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: "expenses" as const, bn: "খরচ", en: "Expenses" },
                  { id: "coa" as const, bn: "চার্ট অব অ্যাকাউন্টস", en: "Chart of accounts" },
                  { id: "journal" as const, bn: "জার্নাল", en: "Journal" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFinanceSub(tab.id)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${
                    financeSub === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-navy"
                  }`}
                >
                  {t(tab.bn, tab.en)}
                </button>
              ))}
            </div>

            {financeSub === "expenses" && (
              <>
                <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-4">
                  <input
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    placeholder={t("ক্যাটাগরি", "Category")}
                    className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm"
                  />
                  <input
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    placeholder={t("পরিমাণ", "Amount")}
                    className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm"
                  />
                  <input
                    value={expenseForm.note}
                    onChange={(e) => setExpenseForm({ ...expenseForm, note: e.target.value })}
                    placeholder={t("নোট", "Note")}
                    className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm"
                  />
                  <button
                    type="button"
                    disabled={!expenseForm.amount || addExpense.isPending}
                    onClick={() => addExpense.mutate()}
                    className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {t("খরচ যোগ", "Add expense")}
                  </button>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">{t("ক্যাটাগরি", "Category")}</th>
                        <th className="px-3 py-2">{t("পরিমাণ", "Amount")}</th>
                        <th className="px-3 py-2">{t("নোট", "Note")}</th>
                        <th className="px-3 py-2">{t("তারিখ", "Date")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(financeQ.data?.expenses ?? []).map((e) => (
                        <tr key={e.id} className="border-t border-border">
                          <td className="px-3 py-2">{e.category}</td>
                          <td className="px-3 py-2 font-semibold">৳{e.amount}</td>
                          <td className="px-3 py-2 text-muted-foreground">{e.note || "—"}</td>
                          <td className="px-3 py-2 text-[10px]">{e.paidAt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {financeSub === "coa" && (
              <div className="space-y-3">
                <div className="grid gap-2 rounded-2xl border border-border bg-card p-4 sm:grid-cols-5">
                  <input
                    value={coaForm.code}
                    onChange={(e) => setCoaForm({ ...coaForm, code: e.target.value })}
                    placeholder={t("কোড", "Code")}
                    className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm"
                  />
                  <input
                    value={coaForm.name}
                    onChange={(e) => setCoaForm({ ...coaForm, name: e.target.value })}
                    placeholder={t("নাম", "Name")}
                    className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm"
                  />
                  <input
                    value={coaForm.nameEn}
                    onChange={(e) => setCoaForm({ ...coaForm, nameEn: e.target.value })}
                    placeholder="Name (EN)"
                    className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm"
                  />
                  <select
                    value={coaForm.kind}
                    onChange={(e) => setCoaForm({ ...coaForm, kind: e.target.value })}
                    className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm"
                  >
                    {(
                      [
                        ["asset", "সম্পদ", "Asset"],
                        ["liability", "দায়", "Liability"],
                        ["equity", "মূলধন", "Equity"],
                        ["income", "আয়", "Income"],
                        ["expense", "ব্যয়", "Expense"],
                      ] as const
                    ).map(([v, bn, en]) => (
                      <option key={v} value={v}>
                        {t(bn, en)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!coaForm.code || !coaForm.name || addCoaAccount.isPending}
                    onClick={() => addCoaAccount.mutate()}
                    className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {t("যোগ", "Add")}
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(["asset", "liability", "equity", "income", "expense"] as const).map((kind) => (
                    <div key={kind} className="rounded-2xl border border-border bg-card">
                      <p className="border-b border-border px-3 py-2 text-[11px] font-bold uppercase">
                        {kind}
                      </p>
                      <ul className="max-h-48 divide-y divide-border overflow-y-auto text-xs">
                        {(coaQ.data?.accounts ?? [])
                          .filter((a) => a.kind === kind)
                          .map((a) => (
                            <li key={a.code} className="flex gap-2 px-3 py-2">
                              <span className="w-12 font-mono text-muted-foreground">{a.code}</span>
                              <span className="min-w-0 flex-1 truncate font-semibold">{a.name}</span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {financeSub === "journal" && (
              <div className="space-y-3">
                <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      type="date"
                      value={journalForm.entryDate}
                      onChange={(e) => setJournalForm({ ...journalForm, entryDate: e.target.value })}
                      className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm"
                    />
                    <input
                      value={journalForm.memo}
                      onChange={(e) => setJournalForm({ ...journalForm, memo: e.target.value })}
                      placeholder={t("মেমো", "Memo")}
                      className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm"
                    />
                  </div>
                  {journalForm.lines.map((line, idx) => (
                    <div key={idx} className="grid gap-2 sm:grid-cols-4">
                      <select
                        value={line.accountCode}
                        onChange={(e) => {
                          const lines = [...journalForm.lines];
                          lines[idx] = { ...line, accountCode: e.target.value };
                          setJournalForm({ ...journalForm, lines });
                        }}
                        className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm sm:col-span-2"
                      >
                        {(coaQ.data?.accounts ?? []).map((a) => (
                          <option key={a.code} value={a.code}>
                            {a.code} — {a.name}
                          </option>
                        ))}
                      </select>
                      <input
                        value={line.debit}
                        onChange={(e) => {
                          const lines = [...journalForm.lines];
                          lines[idx] = { ...line, debit: e.target.value, credit: "" };
                          setJournalForm({ ...journalForm, lines });
                        }}
                        placeholder={t("ডেবিট", "Debit")}
                        className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm"
                      />
                      <input
                        value={line.credit}
                        onChange={(e) => {
                          const lines = [...journalForm.lines];
                          lines[idx] = { ...line, credit: e.target.value, debit: "" };
                          setJournalForm({ ...journalForm, lines });
                        }}
                        placeholder={t("ক্রেডিট", "Credit")}
                        className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm"
                      />
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setJournalForm({
                          ...journalForm,
                          lines: [...journalForm.lines, { accountCode: "5900", debit: "", credit: "" }],
                        })
                      }
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold"
                    >
                      {t("লাইন যোগ", "Add line")}
                    </button>
                    <button
                      type="button"
                      disabled={postJournal.isPending}
                      onClick={() => postJournal.mutate()}
                      className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      {t("পোস্ট", "Post")}
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                  <table className="w-full min-w-[640px] text-left text-xs">
                    <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">{t("এন্ট্রি", "Entry")}</th>
                        <th className="px-3 py-2">{t("তারিখ", "Date")}</th>
                        <th className="px-3 py-2">{t("মেমো", "Memo")}</th>
                        <th className="px-3 py-2 text-right">{t("মোট", "Total")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(coaQ.data?.entries ?? []).map((e) => (
                        <tr key={e.id} className="border-t border-border">
                          <td className="px-3 py-2 font-mono text-[10px]">{e.entryNo}</td>
                          <td className="px-3 py-2">{e.entryDate}</td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {e.memo || e.lines.map((l) => `${l.accountCode}`).join(" / ")}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold">৳{e.total}</td>
                        </tr>
                      ))}
                      {!coaQ.isLoading && (coaQ.data?.entries?.length ?? 0) === 0 && (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                            {t("কোনো জার্নাল নেই", "No journal entries yet")}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {active === "consults" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
              <button
                type="button"
                disabled={queueReminders.isPending}
                onClick={() => queueReminders.mutate()}
                className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {t("রিমাইন্ডার কিউ (২৪ঘণ্টা)", "Queue reminders (24h)")}
              </button>
              <p className="text-xs text-muted-foreground">
                {t("কিউড", "Queued")}: {remindersQ.data?.counts.queued ?? 0} ·{" "}
                {t("পাঠানো", "Sent")}: {remindersQ.data?.counts.sent ?? 0}
              </p>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">{t("ইনভয়েস", "Invoice")}</th>
                    <th className="px-3 py-2">{t("ডাক্তার", "Doctor")}</th>
                    <th className="px-3 py-2">{t("রোগী", "Patient")}</th>
                    <th className="px-3 py-2">{t("সময়", "When")}</th>
                    <th className="px-3 py-2">{t("রিমাইন্ডার", "Reminder")}</th>
                    <th className="px-3 py-2">{t("স্ট্যাটাস", "Status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(apptQ.data?.items ?? []).map((a) => (
                    <tr key={a.id} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-[10px]">{a.invoiceNo}</td>
                      <td className="px-3 py-2">
                        <p className="font-semibold text-navy">{a.doctorName}</p>
                        <p className="text-[10px] text-muted-foreground">{a.doctorSpec}</p>
                      </td>
                      <td className="px-3 py-2">
                        {a.patientName}
                        <p className="text-[10px] text-muted-foreground">{a.phone}</p>
                      </td>
                      <td className="px-3 py-2 text-[11px]">{a.scheduledAt?.slice(0, 16)}</td>
                      <td className="px-3 py-2 text-[10px] text-muted-foreground">
                        {a.reminderSentAt
                          ? a.reminderSentAt.slice(0, 16)
                          : t("বাকি", "pending")}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={a.status}
                          disabled={setApptStatus.isPending}
                          onChange={(e) => setApptStatus.mutate({ id: a.id, status: e.target.value })}
                          className="rounded-md border border-border bg-background px-2 py-1 text-[11px]"
                        >
                          {APPT_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                  {!apptQ.isLoading && (apptQ.data?.items?.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                        {t("কোনো অ্যাপয়েন্টমেন্ট নেই", "No appointments yet")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">{t("চ্যানেল", "Channel")}</th>
                    <th className="px-3 py-2">{t("টার্গেট", "Target")}</th>
                    <th className="px-3 py-2">{t("বার্তা", "Body")}</th>
                    <th className="px-3 py-2">{t("স্ট্যাটাস", "Status")}</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {(remindersQ.data?.items ?? []).map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-3 py-2 font-semibold">{r.channel}</td>
                      <td className="px-3 py-2 font-mono text-[10px]">{r.target || "—"}</td>
                      <td className="max-w-[280px] truncate px-3 py-2 text-muted-foreground" title={r.body}>
                        {r.body}
                      </td>
                      <td className="px-3 py-2">{r.status}</td>
                      <td className="px-3 py-2">
                        {r.status === "queued" && (
                          <button
                            type="button"
                            disabled={markReminderSent.isPending}
                            onClick={() => markReminderSent.mutate(r.id)}
                            className="rounded-md border border-border px-2 py-1 text-[10px] hover:bg-muted"
                          >
                            {t("পাঠানো", "Mark sent")}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!remindersQ.isLoading && (remindersQ.data?.items?.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                        {t("কোনো রিমাইন্ডার নেই", "No reminders yet")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {active === "lab" && (
          <div className="space-y-4">
            <div className="grid gap-2 rounded-2xl border border-border bg-card p-4 sm:grid-cols-5">
              <input
                value={labForm.id}
                onChange={(e) => setLabForm({ ...labForm, id: e.target.value })}
                placeholder="id (cbc)"
                className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <input
                value={labForm.bn}
                onChange={(e) => setLabForm({ ...labForm, bn: e.target.value })}
                placeholder={t("নাম (বাংলা)", "Name (BN)")}
                className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm sm:col-span-2"
              />
              <input
                value={labForm.price}
                onChange={(e) => setLabForm({ ...labForm, price: e.target.value })}
                placeholder={t("দাম", "Price")}
                className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <button
                type="button"
                disabled={!labForm.bn.trim() || createCatalogSvc.isPending}
                onClick={() =>
                  createCatalogSvc.mutate({
                    kind: "lab",
                    id: labForm.id || undefined,
                    bn: labForm.bn,
                    en: labForm.en || labForm.bn,
                    price: Number(labForm.price) || 0,
                    group: labForm.group,
                  })
                }
                className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {t("যোগ", "Add")}
              </button>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">{t("নাম", "Name")}</th>
                    <th className="px-3 py-2">{t("দাম", "Price")}</th>
                    <th className="px-3 py-2">{t("অবস্থা", "Status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(catalogSvcQ.data?.labTests ?? []).map((x) => (
                    <tr key={x.id} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-[10px]">{x.id}</td>
                      <td className="px-3 py-2 font-semibold text-navy">{x.bn}</td>
                      <td className="px-3 py-2">৳{x.price}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() =>
                            patchCatalogSvc.mutate({ kind: "lab", id: x.id, active: !x.active })
                          }
                          className={`rounded px-2 py-1 text-[11px] font-semibold ${
                            x.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {x.active ? t("সক্রিয়", "Active") : t("বন্ধ", "Off")}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!catalogSvcQ.isLoading && (catalogSvcQ.data?.labTests?.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                        {t("কোনো ল্যাব টেস্ট নেই — seed চালান", "No lab tests — run seed")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {active === "doctors" && (
          <div className="space-y-4">
            <div className="grid gap-2 rounded-2xl border border-border bg-card p-4 sm:grid-cols-5">
              <input
                value={doctorForm.name}
                onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })}
                placeholder={t("নাম", "Name")}
                className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <input
                value={doctorForm.spec}
                onChange={(e) => setDoctorForm({ ...doctorForm, spec: e.target.value })}
                placeholder={t("বিশেষত্ব", "Specialty")}
                className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <input
                value={doctorForm.degree}
                onChange={(e) => setDoctorForm({ ...doctorForm, degree: e.target.value })}
                placeholder={t("ডিগ্রি", "Degree")}
                className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <input
                value={doctorForm.fee}
                onChange={(e) => setDoctorForm({ ...doctorForm, fee: e.target.value })}
                placeholder={t("ফি", "Fee")}
                className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <button
                type="button"
                disabled={!doctorForm.name.trim() || createCatalogSvc.isPending}
                onClick={() =>
                  createCatalogSvc.mutate({
                    kind: "doctor",
                    name: doctorForm.name,
                    spec: doctorForm.spec,
                    degree: doctorForm.degree,
                    fee: Number(doctorForm.fee) || 0,
                  })
                }
                className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {t("যোগ", "Add")}
              </button>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">{t("ডাক্তার", "Doctor")}</th>
                    <th className="px-3 py-2">{t("ফি", "Fee")}</th>
                    <th className="px-3 py-2">{t("অবস্থা", "Status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(catalogSvcQ.data?.doctors ?? []).map((d) => (
                    <tr key={d.id} className="border-t border-border">
                      <td className="px-3 py-2" colSpan={blackoutFor === d.id ? 3 : 1}>
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-navy">{d.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {d.spec} · {d.degree}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setBlackoutFor(blackoutFor === d.id ? "" : d.id);
                                setBlackoutDay("");
                                setBlackoutReason("");
                              }}
                              className="rounded-lg border border-border px-2 py-1 text-[10px] font-semibold"
                            >
                              {t("ছুটি", "Off days")}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                patchCatalogSvc.mutate({
                                  kind: "doctor",
                                  id: d.id,
                                  active: !d.active,
                                })
                              }
                              className={`rounded px-2 py-1 text-[11px] font-semibold ${
                                d.active
                                  ? "bg-primary/10 text-primary"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {d.active ? t("সক্রিয়", "Active") : t("বন্ধ", "Off")}
                            </button>
                          </div>
                        </div>
                        {blackoutFor === d.id && (
                          <div className="mt-3 rounded-lg border border-dashed border-border p-3">
                            <p className="text-[10px] font-bold text-muted-foreground">
                              {t("ছুটির দিন (ব্ল্যাকআউট)", "Blackout days")}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <input
                                type="date"
                                value={blackoutDay}
                                onChange={(e) => setBlackoutDay(e.target.value)}
                                className="rounded-lg border border-border bg-background px-2 py-1.5 text-[11px] outline-none"
                              />
                              <input
                                value={blackoutReason}
                                onChange={(e) => setBlackoutReason(e.target.value)}
                                maxLength={120}
                                placeholder={t("কারণ", "Reason")}
                                className="min-w-[8rem] flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-[11px] outline-none"
                              />
                              <button
                                type="button"
                                disabled={!blackoutDay || addBlackout.isPending}
                                onClick={() => addBlackout.mutate()}
                                className="rounded-lg bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground disabled:opacity-50"
                              >
                                {t("যোগ", "Add")}
                              </button>
                            </div>
                            <ul className="mt-2 space-y-1">
                              {(blackoutsQ.data?.items ?? []).map((b) => (
                                <li key={b.id} className="flex items-center gap-2 text-[11px]">
                                  <span className="font-semibold">{b.day}</span>
                                  <span className="text-muted-foreground">{b.reason}</span>
                                  <button
                                    type="button"
                                    onClick={() => delBlackout.mutate(b.id)}
                                    className="ml-auto text-destructive"
                                  >
                                    {t("মুছুন", "Delete")}
                                  </button>
                                </li>
                              ))}
                              {!blackoutsQ.isLoading && (blackoutsQ.data?.items?.length ?? 0) === 0 && (
                                <li className="text-[10px] text-muted-foreground">
                                  {t("কোনো ছুটি নেই।", "No blackouts.")}
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </td>
                      {blackoutFor !== d.id && (
                        <>
                          <td className="px-3 py-2">৳{d.fee}</td>
                          <td className="px-3 py-2" />
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {active === "diagnostics" && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <p className="border-b border-border px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">
                {t("ডায়াগনস্টিক বুকিং", "Diagnostic bookings")}
              </p>
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">{t("রোগী", "Patient")}</th>
                    <th className="px-3 py-2">{t("টেস্ট", "Tests")}</th>
                    <th className="px-3 py-2">{t("মোট", "Total")}</th>
                    <th className="px-3 py-2">{t("স্ট্যাটাস", "Status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(bookingsQ.data?.diagnostics ?? []).map((b) => (
                    <tr key={b.id} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-[10px]">{b.bookingNo}</td>
                      <td className="px-3 py-2">
                        <p className="font-semibold">{b.patientName}</p>
                        <p className="text-[10px] text-muted-foreground">{b.phone}</p>
                      </td>
                      <td className="px-3 py-2 text-[10px]">
                        {(b.tests ?? []).map((x) => x.bn || x.en).filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="px-3 py-2">৳{b.total}</td>
                      <td className="px-3 py-2">
                        <select
                          value={b.status}
                          disabled={patchBooking.isPending}
                          onChange={(e) =>
                            patchBooking.mutate({
                              kind: "diagnostic",
                              id: b.id,
                              status: e.target.value,
                            })
                          }
                          className="rounded-md border border-border bg-background px-2 py-1 text-[11px]"
                        >
                          {DIAG_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                  {!bookingsQ.isLoading && (bookingsQ.data?.diagnostics?.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                        {t("কোনো বুকিং নেই", "No bookings")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <p className="border-b border-border px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">
                {t("হোম সার্ভিস রিকোয়েস্ট", "Home service requests")}
              </p>
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">{t("সেবা", "Service")}</th>
                    <th className="px-3 py-2">{t("গ্রাহক", "Customer")}</th>
                    <th className="px-3 py-2">{t("ফি", "Fee")}</th>
                    <th className="px-3 py-2">{t("স্ট্যাটাস", "Status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(bookingsQ.data?.services ?? []).map((s) => (
                    <tr key={s.id} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-[10px]">{s.requestNo}</td>
                      <td className="px-3 py-2 font-semibold">{s.serviceName}</td>
                      <td className="px-3 py-2">
                        {s.patientName}
                        <p className="text-[10px] text-muted-foreground">{s.phone}</p>
                      </td>
                      <td className="px-3 py-2">৳{s.fee}</td>
                      <td className="px-3 py-2">
                        <select
                          value={s.status}
                          disabled={patchBooking.isPending}
                          onChange={(e) =>
                            patchBooking.mutate({
                              kind: "service",
                              id: s.id,
                              status: e.target.value,
                            })
                          }
                          className="rounded-md border border-border bg-background px-2 py-1 text-[11px]"
                        >
                          {SVC_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-2 rounded-2xl border border-border bg-card p-4 sm:grid-cols-5">
              <input
                value={diagForm.slug}
                onChange={(e) => setDiagForm({ ...diagForm, slug: e.target.value })}
                placeholder="slug"
                className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <input
                value={diagForm.name}
                onChange={(e) => setDiagForm({ ...diagForm, name: e.target.value })}
                placeholder={t("সেবা নাম", "Service name")}
                className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm sm:col-span-2"
              />
              <input
                value={diagForm.baseFee}
                onChange={(e) => setDiagForm({ ...diagForm, baseFee: e.target.value })}
                placeholder={t("বেস ফি", "Base fee")}
                className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <button
                type="button"
                disabled={!diagForm.slug.trim() || !diagForm.name.trim() || createCatalogSvc.isPending}
                onClick={() =>
                  createCatalogSvc.mutate({
                    kind: "diagnostic",
                    slug: diagForm.slug,
                    name: diagForm.name,
                    baseFee: Number(diagForm.baseFee) || 0,
                    eta: diagForm.eta,
                    serviceRoute: "/home-diagnostics",
                  })
                }
                className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {t("সেবা যোগ", "Add service")}
              </button>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <p className="border-b border-border px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">
                {t("সার্ভিস ক্যাটাগরি", "Service categories")}
              </p>
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">slug</th>
                    <th className="px-3 py-2">{t("সেবা", "Service")}</th>
                    <th className="px-3 py-2">{t("ফি", "Fee")}</th>
                    <th className="px-3 py-2">{t("অবস্থা", "Status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(catalogSvcQ.data?.diagnostics ?? []).map((c) => (
                    <tr key={c.id} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-[10px]">{c.slug}</td>
                      <td className="px-3 py-2 font-semibold text-navy">{c.name}</td>
                      <td className="px-3 py-2">৳{c.baseFee}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() =>
                            patchCatalogSvc.mutate({
                              kind: "diagnostic",
                              id: c.id,
                              active: !c.active,
                            })
                          }
                          className={`rounded px-2 py-1 text-[11px] font-semibold ${
                            c.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {c.active ? t("সক্রিয়", "Active") : t("বন্ধ", "Off")}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!catalogSvcQ.isLoading && (catalogSvcQ.data?.diagnostics?.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                        {t("কোনো হোম সার্ভিস নেই — seed চালান", "No home services — run seed")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {active === "stock" && (
          <div className="space-y-3">
            <form
              className="flex flex-wrap items-end gap-2 rounded-2xl border border-border bg-card p-3"
              onSubmit={(e) => {
                e.preventDefault();
                adjustStock.mutate();
              }}
            >
              <label className="text-[11px]">
                {t("প্রোডাক্ট", "Product")}
                <select
                  required
                  value={stockAdj.productId}
                  onChange={(e) => setStockAdj((s) => ({ ...s, productId: e.target.value }))}
                  className="mt-1 block min-w-[200px] rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                >
                  <option value="">{t("বাছুন", "Select")}</option>
                  {(stockQ.data?.products ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.stock})
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-[11px]">
                {t("পরিবর্তন (±)", "Change (±)")}
                <input
                  required
                  type="number"
                  value={stockAdj.change}
                  onChange={(e) => setStockAdj((s) => ({ ...s, change: e.target.value }))}
                  className="mt-1 block w-24 rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                />
              </label>
              <label className="text-[11px]">
                {t("কারণ", "Reason")}
                <select
                  value={stockAdj.reason}
                  onChange={(e) => setStockAdj((s) => ({ ...s, reason: e.target.value }))}
                  className="mt-1 block min-w-[140px] rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                >
                  {(
                    [
                      ["correction", "সংশোধন", "Correction"],
                      ["damage", "নষ্ট/ভাঙা", "Damage"],
                      ["expiry", "মেয়াদোত্তীর্ণ", "Expiry"],
                      ["lost", "হারানো", "Lost"],
                      ["found", "অতিরিক্ত পাওয়া", "Found"],
                    ] as const
                  ).map(([v, bn, en]) => (
                    <option key={v} value={v}>
                      {t(bn, en)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-[11px] flex-1 min-w-[140px]">
                {t("নোট", "Note")}
                <input
                  value={stockAdj.note}
                  onChange={(e) => setStockAdj((s) => ({ ...s, note: e.target.value }))}
                  className="mt-1 block w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                />
              </label>
              <button
                type="submit"
                disabled={adjustStock.isPending}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
              >
                {t("অ্যাডজাস্ট", "Adjust")}
              </button>
            </form>
            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">{t("অ্যাডজাস্টমেন্ট", "Adjustment")}</th>
                    <th className="px-3 py-2">{t("কারণ", "Reason")}</th>
                    <th className="px-3 py-2">{t("আইটেম", "Items")}</th>
                    <th className="px-3 py-2">{t("তারিখ", "Date")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(stockQ.data?.adjustments ?? []).map((a) => (
                    <tr key={a.id} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-[10px]">{a.adjNo}</td>
                      <td className="px-3 py-2">{a.reason}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {a.items
                          .map((i) => `${i.productName} ${i.change >= 0 ? "+" : ""}${i.change}`)
                          .join(", ") || "—"}
                      </td>
                      <td className="px-3 py-2 text-[10px]">{a.createdAt?.slice(0, 16)}</td>
                    </tr>
                  ))}
                  {!stockQ.isLoading && (stockQ.data?.adjustments?.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                        {t("কোনো অ্যাডজাস্টমেন্ট নেই", "No adjustments yet")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">{t("প্রোডাক্ট", "Product")}</th>
                    <th className="px-3 py-2 text-right">{t("স্টক", "Stock")}</th>
                    <th className="px-3 py-2">{t("অ্যালার্ট", "Alert")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(stockQ.data?.products ?? []).map((p) => (
                    <tr key={p.id} className="border-t border-border">
                      <td className="px-3 py-2 font-semibold text-navy">{p.name}</td>
                      <td className={`px-3 py-2 text-right ${p.low ? "font-bold text-amber-600" : ""}`}>
                        {p.stock}
                      </td>
                      <td className="px-3 py-2 text-[10px] text-muted-foreground">
                        ≤{p.lowStockThreshold}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">{t("ব্যাচ", "Batch")}</th>
                    <th className="px-3 py-2">{t("প্রোডাক্ট", "Product")}</th>
                    <th className="px-3 py-2 text-right">{t("পরিমাণ", "Qty")}</th>
                    <th className="px-3 py-2">{t("মেয়াদ", "Expiry")}</th>
                    <th className="px-3 py-2 text-right">{t("কস্ট", "Cost")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(stockQ.data?.batches ?? []).map((b) => (
                    <tr key={b.id} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-[10px]">{b.batchNo || "—"}</td>
                      <td className="px-3 py-2 font-semibold text-navy">{b.productName}</td>
                      <td className="px-3 py-2 text-right">{b.qty}</td>
                      <td className="px-3 py-2 text-[10px] text-muted-foreground">
                        {b.expiry || "—"}
                      </td>
                      <td className="px-3 py-2 text-right">৳{b.cost}</td>
                    </tr>
                  ))}
                  {!stockQ.isLoading && (stockQ.data?.batches?.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                        {t("কোনো ব্যাচ নেই — PO রিসিভ করলে তৈরি হবে", "No batches yet — created on PO receive")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="rounded-2xl border border-border bg-card p-3">
              <p className="mb-2 text-[11px] font-bold">{t("সাম্প্রতিক মুভমেন্ট", "Recent movements")}</p>
              <ul className="max-h-48 space-y-1 overflow-y-auto text-[11px]">
                {(stockQ.data?.movements ?? []).map((m) => (
                  <li key={m.id} className="flex justify-between gap-2 border-b border-border/60 py-1">
                    <span>
                      {m.productName}{" "}
                      <span className={m.change >= 0 ? "text-emerald-600" : "text-destructive"}>
                        {m.change >= 0 ? "+" : ""}
                        {m.change}
                      </span>{" "}
                      → {m.balance}
                    </span>
                    <span className="text-muted-foreground">{m.createdAt?.slice(0, 16)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {active === "support" && (
          <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
            <div className="rounded-2xl border border-border bg-card">
              <p className="border-b border-border px-3 py-2 text-[11px] font-bold">
                {t("ইনবক্স", "Inbox")}
              </p>
              <ul className="max-h-[420px] overflow-y-auto text-xs">
                {(supportQ.data?.conversations ?? []).map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSupportId(c.id)}
                      className={`block w-full border-b border-border px-3 py-2 text-left hover:bg-muted/40 ${
                        supportId === c.id ? "bg-secondary/40" : ""
                      }`}
                    >
                      <p className="font-semibold text-navy">{c.userName || c.userEmail || c.title || c.id.slice(0, 8)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {c.status} · {c.lastMessageAt?.slice(0, 16)}
                        {c.unreadForAgent > 0 ? ` · ${c.unreadForAgent} new` : ""}
                      </p>
                    </button>
                  </li>
                ))}
                {!supportQ.isLoading && (supportQ.data?.conversations?.length ?? 0) === 0 && (
                  <li className="px-3 py-8 text-center text-muted-foreground">
                    {t("কোনো কথোপকথন নেই", "No conversations")}
                  </li>
                )}
              </ul>
            </div>
            <div className="rounded-2xl border border-border bg-card p-3">
              {!supportId ? (
                <p className="py-12 text-center text-xs text-muted-foreground">
                  {t("একটি কথোপকথন বাছুন", "Select a conversation")}
                </p>
              ) : (
                <>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-mono text-muted-foreground">{supportId.slice(0, 8)}…</p>
                    <button
                      type="button"
                      onClick={() => closeSupport.mutate(supportId)}
                      className="rounded-md border border-border px-2 py-1 text-[10px] font-semibold"
                    >
                      {t("বন্ধ করুন", "Close")}
                    </button>
                  </div>
                  <ul className="mb-3 max-h-[280px] space-y-2 overflow-y-auto text-xs">
                    {(supportMsgQ.data?.messages ?? []).map((m) => (
                      <li
                        key={m.id}
                        className={`rounded-lg px-3 py-2 ${
                          m.sender === "agent" ? "bg-secondary/50 ml-6" : "bg-muted/50 mr-6"
                        }`}
                      >
                        <p className="text-[10px] font-bold text-muted-foreground">
                          {m.sender}
                          {m.agentName ? ` · ${m.agentName}` : ""}
                        </p>
                        <p className="mt-0.5 whitespace-pre-wrap">{m.body}</p>
                      </li>
                    ))}
                  </ul>
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      replySupport.mutate();
                    }}
                  >
                    <input
                      required
                      value={supportReply}
                      onChange={(e) => setSupportReply(e.target.value)}
                      placeholder={t("রিপ্লাই লিখুন…", "Write a reply…")}
                      className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                    />
                    <button
                      type="submit"
                      disabled={replySupport.isPending}
                      className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
                    >
                      {t("পাঠান", "Send")}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        )}

        {active === "loyalty" && (
          <div className="space-y-3">
            <form
              className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-3"
              onSubmit={(e) => {
                e.preventDefault();
                applyLoyalty.mutate();
              }}
            >
              <input
                required
                type="email"
                placeholder="user@email"
                value={loyaltyForm.email}
                onChange={(e) => setLoyaltyForm((s) => ({ ...s, email: e.target.value }))}
                className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
              />
              <input
                required
                type="number"
                placeholder={t("পয়েন্ট (±)", "Points (±)")}
                value={loyaltyForm.points}
                onChange={(e) => setLoyaltyForm((s) => ({ ...s, points: e.target.value }))}
                className="w-28 rounded-md border border-border bg-background px-2 py-1.5 text-xs"
              />
              <input
                placeholder={t("কারণ", "Reason")}
                value={loyaltyForm.reason}
                onChange={(e) => setLoyaltyForm((s) => ({ ...s, reason: e.target.value }))}
                className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
              />
              <button
                type="submit"
                disabled={applyLoyalty.isPending}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
              >
                {t("প্রয়োগ", "Apply")}
              </button>
            </form>
            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">{t("ইউজার", "User")}</th>
                    <th className="px-3 py-2 text-right">{t("ব্যালেন্স", "Balance")}</th>
                    <th className="px-3 py-2">{t("টিয়ার", "Tier")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(loyaltyQ.data?.accounts ?? []).map((a) => (
                    <tr key={a.userId} className="border-t border-border">
                      <td className="px-3 py-2">
                        <p className="font-semibold text-navy">{a.name || a.email || a.userId.slice(0, 8)}</p>
                        <p className="text-[10px] text-muted-foreground">{a.email}</p>
                      </td>
                      <td className="px-3 py-2 text-right font-bold">{a.balance}</td>
                      <td className="px-3 py-2 uppercase">{a.tier}</td>
                    </tr>
                  ))}
                  {!loyaltyQ.isLoading && (loyaltyQ.data?.accounts?.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={3} className="px-3 py-8 text-center text-muted-foreground">
                        {t("কোনো অ্যাকাউন্ট নেই", "No accounts yet")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {active === "stockcount" && <StockCountPanel />}
        {active === "labels" && <LabelsPanel />}
        {active === "accounts" && <AccountsReceivablePanel />}
        {active === "daybook" && <FinanceExtraPanel kind="daybook" />}
        {active === "financials" && <FinanceExtraPanel kind="financials" />}
        {active === "party" && <FinanceExtraPanel kind="party" />}
        {active === "audit" && <ErpAuditPanel />}
        {active === "apihub" && <ApiHubPanel />}
        {active === "erproles" && <ErpRolesPanel />}
        {active === "tests" && <TestsPanel />}

        {active === "settings" && (
          <div className="space-y-2">
            {settingsQ.isLoading && (
              <p className="text-xs text-muted-foreground">{t("লোড হচ্ছে...", "Loading...")}</p>
            )}
            {(settingsQ.data?.items ?? []).map((s) => (
              <div
                key={s.key}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3"
              >
                <p className="min-w-0 flex-1 text-xs font-semibold">
                  {t(s.label, s.labelEn)}
                  <span className="block text-[10px] font-normal text-muted-foreground">{s.key}</span>
                </p>
                {s.kind === "bool" || s.value === "true" || s.value === "false" ? (
                  <button
                    type="button"
                    disabled={saveSetting.isPending}
                    onClick={() =>
                      saveSetting.mutate({
                        key: s.key,
                        value: s.value === "true" ? "false" : "true",
                      })
                    }
                    className={`rounded-lg border px-3 py-1.5 text-[10px] font-semibold ${
                      s.value === "true"
                        ? "border-primary text-primary"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {s.value === "true" ? t("চালু", "On") : t("বন্ধ", "Off")}
                  </button>
                ) : (
                  <>
                    <input
                      value={settingsDraft[s.key] ?? s.value}
                      onChange={(e) =>
                        setSettingsDraft((d) => ({ ...d, [s.key]: e.target.value }))
                      }
                      className="w-44 rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none"
                    />
                    <button
                      type="button"
                      disabled={saveSetting.isPending}
                      onClick={() =>
                        saveSetting.mutate({
                          key: s.key,
                          value: settingsDraft[s.key] ?? s.value,
                        })
                      }
                      className="rounded-lg bg-primary px-3 py-1.5 text-[10px] font-semibold text-primary-foreground"
                    >
                      {t("সেভ", "Save")}
                    </button>
                  </>
                )}
              </div>
            ))}
            {!settingsQ.isLoading && (settingsQ.data?.items?.length ?? 0) === 0 && (
              <p className="text-xs text-muted-foreground">
                {t("কোনো সেটিংস নেই — সিড চালান", "No settings — run seed")}
              </p>
            )}
          </div>
        )}

        {active === "customers" && (
          <div className="space-y-3">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setCustomerTerm(customerQ.trim());
              }}
            >
              <input
                value={customerQ}
                onChange={(e) => setCustomerQ(e.target.value)}
                placeholder={t("নাম, ফোন বা ইমেইল", "Name, phone or email")}
                className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-xs outline-none"
              />
              <button
                type="submit"
                className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
              >
                {t("খুঁজুন", "Search")}
              </button>
            </form>
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="bg-muted text-[11px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">{t("গ্রাহক", "Customer")}</th>
                    <th className="px-3 py-2">{t("যোগাযোগ", "Contact")}</th>
                    <th className="px-3 py-2 text-center">{t("অর্ডার", "Orders")}</th>
                    <th className="px-3 py-2 text-right">{t("মোট খরচ", "Spent")}</th>
                    <th className="px-3 py-2 text-right">{t("ভূমিকা", "Role")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(customersQ.data?.items ?? []).map((r) => (
                    <tr key={r.userId} className="border-t border-border">
                      <td className="px-3 py-2 font-semibold text-navy">{r.name || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        <span className="block">{r.email || "—"}</span>
                        <span className="block">{r.phone || "—"}</span>
                      </td>
                      <td className="px-3 py-2 text-center">{r.ordersCount}</td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {t.money(Math.round(r.totalSpent))}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          disabled={setCustomerAdmin.isPending || !isAdmin}
                          onClick={() =>
                            setCustomerAdmin.mutate({
                              userId: r.userId,
                              makeAdmin: !r.isAdmin,
                            })
                          }
                          className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-50 ${
                            r.isAdmin
                              ? "bg-primary text-primary-foreground"
                              : "border border-border text-muted-foreground"
                          }`}
                        >
                          {r.isAdmin ? t("অ্যাডমিন", "Admin") : t("ব্যবহারকারী", "User")}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!customersQ.isLoading && (customersQ.data?.items?.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                        {t("কোনো গ্রাহক পাওয়া যায়নি", "No customers found")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {active === "returns" && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {(["requested", "approved", "refunded", "rejected", "all"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setReturnFilter(s)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                    returnFilter === s
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card"
                  }`}
                >
                  {s === "all"
                    ? t("সব", "All")
                    : t(RETURN_LABEL[s]?.bn ?? s, RETURN_LABEL[s]?.en ?? s)}
                </button>
              ))}
            </div>
            {returnsQ.isLoading && (
              <p className="text-xs text-muted-foreground">{t("লোড হচ্ছে...", "Loading...")}</p>
            )}
            <div className="space-y-2">
              {(returnsQ.data?.items ?? []).map((r) => (
                <article key={r.id} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="text-sm">#{r.orderNo}</b>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-primary">
                      {t(
                        RETURN_LABEL[r.status]?.bn ?? r.status,
                        RETURN_LABEL[r.status]?.en ?? r.status,
                      )}
                    </span>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {new Date(r.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs">
                    <b>{t("কারণ", "Reason")}:</b> {r.reason}
                    {r.details ? ` — ${r.details}` : ""}
                  </p>
                  <p className="mt-1 text-xs">
                    <b>{t("রিফান্ড", "Refund")}:</b> {t.money(Math.round(r.refundAmount))}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {RETURN_STATUSES.filter((s) => s !== "requested").map((s) => (
                      <button
                        key={s}
                        type="button"
                        disabled={patchReturn.isPending || r.status === s}
                        onClick={() => patchReturn.mutate({ id: r.id, status: s })}
                        className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50"
                      >
                        {t(RETURN_LABEL[s]?.bn ?? s, RETURN_LABEL[s]?.en ?? s)}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const note = window.prompt(
                          t("অ্যাডমিন নোট", "Admin note"),
                          r.adminNote ?? "",
                        );
                        if (note !== null) {
                          patchReturn.mutate({ id: r.id, adminNote: note });
                        }
                      }}
                      className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-semibold"
                    >
                      {t("নোট", "Note")}
                    </button>
                  </div>
                  {r.adminNote && (
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      {t("নোট", "Note")}: {r.adminNote}
                    </p>
                  )}
                </article>
              ))}
              {!returnsQ.isLoading && (returnsQ.data?.items?.length ?? 0) === 0 && (
                <p className="text-xs text-muted-foreground">
                  {t("কোনো অনুরোধ নেই।", "No requests.")}
                </p>
              )}
            </div>
          </div>
        )}

        {active === "reviews" && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {(["pending", "approved", "rejected", "all"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setReviewFilter(s)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                    reviewFilter === s
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card"
                  }`}
                >
                  {s === "all"
                    ? t("সব", "All")
                    : t(REVIEW_LABEL[s]?.bn ?? s, REVIEW_LABEL[s]?.en ?? s)}
                </button>
              ))}
            </div>
            {reviewsQ.isLoading && (
              <p className="text-xs text-muted-foreground">{t("লোড হচ্ছে...", "Loading...")}</p>
            )}
            <div className="space-y-2">
              {(reviewsQ.data?.items ?? []).map((r) => (
                <article key={r.id} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-sale">
                      {"★".repeat(r.rating)}
                      {"☆".repeat(Math.max(0, 5 - r.rating))}
                    </span>
                    <b className="text-xs">{r.authorName || t("গ্রাহক", "Customer")}</b>
                    {r.verified && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {t("যাচাইকৃত", "Verified")}
                      </span>
                    )}
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold">
                      {t(
                        REVIEW_LABEL[r.status]?.bn ?? r.status,
                        REVIEW_LABEL[r.status]?.en ?? r.status,
                      )}
                    </span>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {new Date(r.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {t("প্রোডাক্ট", "Product")}: {r.productName || r.productId}
                  </p>
                  {r.comment && (
                    <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed">{r.comment}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {REVIEW_STATUSES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        disabled={patchReview.isPending || r.status === s}
                        onClick={() => patchReview.mutate({ id: r.id, status: s })}
                        className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50"
                      >
                        {t(REVIEW_LABEL[s]?.bn ?? s, REVIEW_LABEL[s]?.en ?? s)}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={deleteReview.isPending}
                      onClick={() => deleteReview.mutate(r.id)}
                      className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-semibold text-sale"
                    >
                      {t("মুছুন", "Delete")}
                    </button>
                  </div>
                </article>
              ))}
              {!reviewsQ.isLoading && (reviewsQ.data?.items?.length ?? 0) === 0 && (
                <p className="text-xs text-muted-foreground">
                  {t("কোনো রিভিউ নেই।", "No reviews.")}
                </p>
              )}
            </div>
          </div>
        )}

        {active === "campaigns" && (
          <div className="space-y-4">
            <section className="rounded-xl border border-border bg-card p-3">
              <h3 className="mb-3 text-sm font-semibold">{t("গ্রাহক সেগমেন্ট", "Audience segment")}</h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {(
                  [
                    { id: "all" as const, bn: "সব গ্রাহক", en: "All customers", dBn: "নিবন্ধিত সকল", dEn: "All registered" },
                    {
                      id: "buyers30" as const,
                      bn: "সক্রিয় ক্রেতা (৩০ দিন)",
                      en: "Active (30d)",
                      dBn: "গত ৩০ দিনে অর্ডার",
                      dEn: "Ordered in last 30 days",
                    },
                    {
                      id: "inactive60" as const,
                      bn: "নিষ্ক্রিয় (৬০+ দিন)",
                      en: "Inactive (60d+)",
                      dBn: "৬০ দিনের বেশি অর্ডার নেই",
                      dEn: "No order in 60+ days",
                    },
                    {
                      id: "highvalue" as const,
                      bn: "উচ্চমূল্যের গ্রাহক",
                      en: "High value",
                      dBn: "মোট ক্রয় ৳৫,০০০+",
                      dEn: "Spend ৳5,000+",
                    },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setCampaignSeg(s.id)}
                    className={`rounded-lg border p-3 text-left ${
                      campaignSeg === s.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-secondary"
                    }`}
                  >
                    <p className="text-sm font-semibold">{t(s.bn, s.en)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{t(s.dBn, s.dEn)}</p>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {t("নির্বাচিত সেগমেন্টে গ্রাহক সংখ্যা:", "Audience size:")}{" "}
                <span className="font-bold text-foreground">
                  {campaignsQ.isLoading ? "…" : campaignsQ.data?.count ?? 0}
                </span>
              </p>
            </section>

            <section className="rounded-xl border border-border bg-card p-3">
              <h3 className="mb-3 text-sm font-semibold">{t("বার্তা তৈরি করুন", "Compose message")}</h3>
              <div className="mb-3 flex flex-wrap gap-2">
                {(
                  [
                    {
                      t: "নতুন অফার",
                      title: "🎁 বিশেষ ছাড় চলছে!",
                      body: "আজই অর্ডার করুন — নির্বাচিত ঔষধে বিশেষ ছাড়। কুপন কোড ব্যবহার করে সাশ্রয় করুন।",
                    },
                    {
                      t: "রিফিল রিমাইন্ডার",
                      title: "💊 ঔষধ ফুরিয়ে যাচ্ছে?",
                      body: "নিয়মিত ঔষধ সময়মতো পেতে এখনই রিফিল অর্ডার করুন — দ্রুত হোম ডেলিভারি।",
                    },
                    {
                      t: "ফিরে আসার আমন্ত্রণ",
                      title: "আপনাকে মিস করছি!",
                      body: "আপনার পরবর্তী অর্ডারে বিশেষ ছাড় অপেক্ষা করছে। ঔষধওয়ালায় আবার স্বাগতম।",
                    },
                  ] as const
                ).map((tp) => (
                  <button
                    key={tp.t}
                    type="button"
                    onClick={() => setCampaignForm({ title: tp.title, body: tp.body })}
                    className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-secondary"
                  >
                    {tp.t}
                  </button>
                ))}
              </div>
              <input
                value={campaignForm.title}
                onChange={(e) => setCampaignForm((s) => ({ ...s, title: e.target.value }))}
                placeholder={t("শিরোনাম", "Title")}
                className="mb-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-base"
              />
              <textarea
                value={campaignForm.body}
                onChange={(e) => setCampaignForm((s) => ({ ...s, body: e.target.value }))}
                rows={4}
                placeholder={t("বার্তার বিবরণ", "Message body")}
                className="w-full rounded-lg border border-border bg-background p-3 text-base"
              />
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={sendCampaign.isPending || !campaignForm.title.trim()}
                  onClick={() => sendCampaign.mutate()}
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {sendCampaign.isPending
                    ? t("পাঠানো হচ্ছে…", "Sending…")
                    : t(
                        `পাঠান (${campaignsQ.data?.count ?? 0} জন)`,
                        `Send (${campaignsQ.data?.count ?? 0})`,
                      )}
                </button>
                <span className="text-xs text-muted-foreground">
                  {t(
                    "বার্তাটি গ্রাহকের নোটিফিকেশন ইনবক্সে যাবে।",
                    "Message goes to customer notification inbox.",
                  )}
                </span>
              </div>
            </section>

            {(campaignForm.title || campaignForm.body) && (
              <section className="rounded-xl border border-border bg-card p-3">
                <h3 className="mb-2 text-sm font-semibold">{t("প্রিভিউ", "Preview")}</h3>
                <div className="rounded-lg border border-border/60 bg-secondary/40 p-3">
                  <p className="text-sm font-bold">{campaignForm.title || t("শিরোনাম", "Title")}</p>
                  <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                    {campaignForm.body}
                  </p>
                </div>
              </section>
            )}

            {(campaignsQ.data?.history?.length ?? 0) > 0 && (
              <section className="rounded-xl border border-border bg-card p-3">
                <h3 className="mb-2 text-sm font-semibold">{t("সাম্প্রতিক পাঠানো", "Recent sends")}</h3>
                <ul className="space-y-2 text-xs">
                  {campaignsQ.data!.history.map((h) => (
                    <li key={h.id} className="flex flex-wrap gap-2 border-t border-border pt-2 first:border-0 first:pt-0">
                      <span className="font-semibold">{h.title}</span>
                      <span className="text-muted-foreground">{h.segment}</span>
                      <span className="ml-auto">{h.sentCount}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        {active === "branches" && (
          <div className="space-y-6">
            <section className="space-y-3">
              <h3 className="text-sm font-bold">{t("শাখা", "Branches")}</h3>
              <form
                className="grid gap-2 rounded-xl border border-border bg-card p-3 sm:grid-cols-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  addBranch.mutate();
                }}
              >
                <input
                  required
                  value={branchForm.code}
                  onChange={(e) =>
                    setBranchForm((s) => ({ ...s, code: e.target.value.toUpperCase() }))
                  }
                  placeholder={t("কোড", "Code")}
                  className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm"
                />
                <input
                  required
                  value={branchForm.name}
                  onChange={(e) => setBranchForm((s) => ({ ...s, name: e.target.value }))}
                  placeholder={t("শাখার নাম", "Branch name")}
                  className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm"
                />
                <input
                  value={branchForm.nameEn}
                  onChange={(e) => setBranchForm((s) => ({ ...s, nameEn: e.target.value }))}
                  placeholder="Branch name"
                  className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm"
                />
                <input
                  value={branchForm.address}
                  onChange={(e) => setBranchForm((s) => ({ ...s, address: e.target.value }))}
                  placeholder={t("ঠিকানা", "Address")}
                  className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm"
                />
                <input
                  value={branchForm.phone}
                  onChange={(e) => setBranchForm((s) => ({ ...s, phone: e.target.value }))}
                  placeholder={t("ফোন", "Phone")}
                  className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm"
                />
                <button
                  type="submit"
                  disabled={addBranch.isPending}
                  className="min-h-11 rounded-lg bg-primary text-sm font-bold text-primary-foreground disabled:opacity-50"
                >
                  {t("যোগ করুন", "Add")}
                </button>
              </form>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {(branchesQ.data?.branches ?? []).map((b) => (
                  <div key={b.id} className="rounded-xl border border-border bg-card p-3">
                    <p className="text-sm font-bold">
                      {b.name}{" "}
                      <span className="text-[10px] font-normal text-muted-foreground">{b.code}</span>
                      {b.isMain && (
                        <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[10px]">
                          {t("প্রধান", "Main")}
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{b.nameEn}</p>
                    <p className="mt-1 text-xs">{b.address}</p>
                    <p className="text-xs text-muted-foreground">{b.phone}</p>
                    <button
                      type="button"
                      onClick={() => toggleBranch.mutate({ id: b.id, active: !b.active })}
                      className={`mt-2 rounded-lg px-3 py-1.5 text-[11px] font-bold ${
                        b.active
                          ? "bg-secondary text-primary-dark"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {b.active ? t("সক্রিয়", "Active") : t("নিষ্ক্রিয়", "Inactive")}
                    </button>
                  </div>
                ))}
                {!branchesQ.isLoading && (branchesQ.data?.branches?.length ?? 0) === 0 && (
                  <p className="text-xs text-muted-foreground">{t("কোনো শাখা নেই", "No branches")}</p>
                )}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-bold">{t("স্টক ট্রান্সফার", "Stock transfer")}</h3>
              <div className="rounded-xl border border-border bg-card p-3">
                <div className="mb-2 grid gap-2 sm:grid-cols-2">
                  <select
                    value={transferFrom}
                    onChange={(e) => setTransferFrom(e.target.value)}
                    className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm"
                  >
                    <option value="">{t("— যে শাখা থেকে —", "— From branch —")}</option>
                    {(branchesQ.data?.branches ?? [])
                      .filter((b) => b.active)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                  </select>
                  <select
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value)}
                    className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm"
                  >
                    <option value="">{t("— যে শাখায় —", "— To branch —")}</option>
                    {(branchesQ.data?.branches ?? [])
                      .filter((b) => b.active)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                  </select>
                </div>
                <input
                  value={transferQ}
                  onChange={(e) => setTransferQ(e.target.value)}
                  placeholder={t("পণ্য খুঁজুন…", "Search products…")}
                  className="mb-2 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
                />
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {(transferSearchQ.data?.products ?? []).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        setTransferItems((it) =>
                          it.some((x) => x.productId === p.id)
                            ? it
                            : [...it, { productId: p.id, productName: p.name, qty: 1 }],
                        )
                      }
                      className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold hover:border-primary"
                    >
                      + {p.name} ({p.stock})
                    </button>
                  ))}
                </div>
                <ul className="mb-2 divide-y divide-border rounded-lg border border-border text-xs">
                  {transferItems.map((i, idx) => (
                    <li key={i.productId} className="flex items-center gap-2 px-3 py-2">
                      <span className="min-w-0 flex-1 truncate font-semibold">{i.productName}</span>
                      <input
                        type="number"
                        min={1}
                        value={i.qty}
                        onChange={(e) =>
                          setTransferItems((it) =>
                            it.map((x, n) =>
                              n === idx
                                ? { ...x, qty: Math.max(1, Number(e.target.value) || 1) }
                                : x,
                            ),
                          )
                        }
                        className="h-9 w-20 rounded-lg border border-border bg-background px-2 text-center"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setTransferItems((it) => it.filter((_, n) => n !== idx))
                        }
                        className="text-sale"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                  {transferItems.length === 0 && (
                    <li className="p-3 text-center text-muted-foreground">
                      {t("পণ্য যোগ করুন", "Add products")}
                    </li>
                  )}
                </ul>
                <button
                  type="button"
                  disabled={
                    createTransfer.isPending ||
                    !transferFrom ||
                    !transferTo ||
                    transferFrom === transferTo ||
                    transferItems.length === 0
                  }
                  onClick={() => createTransfer.mutate()}
                  className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
                >
                  {t("ট্রান্সফার পাঠান", "Send transfer")}
                </button>
              </div>

              <div className="space-y-2">
                {(transfersQ.data?.transfers ?? []).map((tr) => (
                  <article key={tr.id} className="rounded-xl border border-border bg-card p-3 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <b>{tr.transferNo}</b>
                      <span className="text-muted-foreground">
                        {tr.fromBranchName} → {tr.toBranchName}
                      </span>
                      <span className="rounded-full bg-secondary px-2 py-0.5 font-semibold">
                        {tr.status}
                      </span>
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {new Date(tr.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {tr.items.map((i) => `${i.productName}×${i.qty}`).join(", ")}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {tr.status === "sent" && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              patchTransfer.mutate({ id: tr.id, status: "received" })
                            }
                            className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-semibold"
                          >
                            {t("গ্রহণ", "Receive")}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              patchTransfer.mutate({ id: tr.id, status: "cancelled" })
                            }
                            className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-semibold text-sale"
                          >
                            {t("বাতিল", "Cancel")}
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}

        {active === "zones" && (
          <div className="space-y-4">
            <form
              className="grid gap-2 rounded-xl border border-border bg-card p-3 sm:grid-cols-4 lg:grid-cols-9"
              onSubmit={(e) => {
                e.preventDefault();
                addZone.mutate();
              }}
            >
              <input
                required
                value={zoneForm.name}
                onChange={(e) => setZoneForm((s) => ({ ...s, name: e.target.value }))}
                placeholder={t("জোনের নাম", "Zone name")}
                className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <input
                value={zoneForm.nameEn}
                onChange={(e) => setZoneForm((s) => ({ ...s, nameEn: e.target.value }))}
                placeholder="Zone (EN)"
                className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <input
                value={zoneForm.district}
                onChange={(e) => setZoneForm((s) => ({ ...s, district: e.target.value }))}
                placeholder={t("জেলা", "District")}
                className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <input
                value={zoneForm.thana}
                onChange={(e) => setZoneForm((s) => ({ ...s, thana: e.target.value }))}
                placeholder={t("থানা", "Thana")}
                className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <input
                type="number"
                value={zoneForm.fee}
                onChange={(e) => setZoneForm((s) => ({ ...s, fee: e.target.value }))}
                placeholder={t("ফ্ল্যাট চার্জ", "Flat fee")}
                className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <input
                type="number"
                value={zoneForm.expressFee}
                onChange={(e) => setZoneForm((s) => ({ ...s, expressFee: e.target.value }))}
                placeholder={t("এক্সপ্রেস", "Express")}
                className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <input
                type="number"
                value={zoneForm.minOrder}
                onChange={(e) => setZoneForm((s) => ({ ...s, minOrder: e.target.value }))}
                placeholder={t("ন্যূনতম অর্ডার", "Min order")}
                className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <input
                type="number"
                value={zoneForm.etaMinutes}
                onChange={(e) => setZoneForm((s) => ({ ...s, etaMinutes: e.target.value }))}
                placeholder={t("মিনিট", "Minutes")}
                className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <button
                type="submit"
                disabled={addZone.isPending || !zoneForm.name.trim()}
                className="min-h-11 rounded-lg bg-primary text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                {t("যোগ", "Add")}
              </button>
            </form>

            <div className="flex flex-wrap items-center gap-2">
              <label className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={zoneOnlyActive}
                  onChange={(e) => setZoneOnlyActive(e.target.checked)}
                />{" "}
                {t("শুধু সক্রিয়", "Active only")}
              </label>
              <label className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-semibold">
                {t("কার্ট ৳", "Cart ৳")}
                <input
                  type="number"
                  value={zoneCartTest}
                  onChange={(e) => setZoneCartTest(e.target.value)}
                  className="h-8 w-24 rounded-lg border border-border bg-background px-2 text-right"
                />
              </label>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full min-w-[900px] text-xs">
                <thead className="bg-secondary/40 text-[10px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">{t("জোন", "Zone")}</th>
                    <th className="px-3 py-2 text-left">{t("এলাকা", "Area")}</th>
                    <th className="px-3 py-2 text-right">{t("ফ্ল্যাট", "Flat")}</th>
                    <th className="px-3 py-2 text-right">{t("এক্সপ্রেস", "Express")}</th>
                    <th className="px-3 py-2 text-right">{t("ন্যূনতম", "Min")}</th>
                    <th className="px-3 py-2 text-right">{t("ফ্রি ডেলিভারি", "Free above")}</th>
                    <th className="px-3 py-2 text-right">{t("সময়", "ETA")}</th>
                    <th className="px-3 py-2 text-left">{t("প্রযোজ্য", "Applies")}</th>
                    <th className="px-3 py-2 text-center">{t("অবস্থা", "Status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(zonesQ.data?.items ?? [])
                    .filter((z) => !zoneOnlyActive || z.active)
                    .map((z) => {
                      const cart = Number(zoneCartTest) || 0;
                      let fee = z.fee;
                      let reason = t("ফ্ল্যাট চার্জ", "Flat charge");
                      let blocked = false;
                      if (z.minOrder > 0 && cart < z.minOrder) {
                        blocked = true;
                        reason = t(`ন্যূনতম অর্ডার ৳${z.minOrder}`, `Min order ৳${z.minOrder}`);
                      } else if (z.freeAbove > 0 && cart >= z.freeAbove) {
                        fee = 0;
                        reason = t(
                          `৳${z.freeAbove}+ অর্ডারে ফ্রি`,
                          `Free above ৳${z.freeAbove}`,
                        );
                      }
                      return (
                        <tr key={z.id}>
                          <td className="px-3 py-2">
                            <span className="font-semibold">{z.name}</span>
                            <span className="block text-[10px] text-muted-foreground">
                              {z.nameEn}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {z.district}
                            {z.thana ? ` · ${z.thana}` : ""}
                          </td>
                          {(
                            [
                              ["fee", z.fee],
                              ["expressFee", z.expressFee],
                              ["minOrder", z.minOrder],
                              ["freeAbove", z.freeAbove],
                              ["etaMinutes", z.etaMinutes],
                            ] as const
                          ).map(([key, val]) => (
                            <td key={key} className="px-3 py-2 text-right">
                              <input
                                type="number"
                                defaultValue={val}
                                onBlur={(e) => {
                                  const v = Number(e.target.value);
                                  if (v !== val) patchZone.mutate({ id: z.id, [key]: v });
                                }}
                                className="h-9 w-20 rounded-lg border border-border bg-background px-2 text-right"
                              />
                            </td>
                          ))}
                          <td className="px-3 py-2 text-[11px]">
                            {blocked ? (
                              <span className="font-semibold text-sale">
                                {t("অর্ডার নেওয়া যাবে না", "Order blocked")} — {reason}
                              </span>
                            ) : (
                              <span>
                                {t("সাধারণ", "Standard")}{" "}
                                <b className="text-primary">৳{fee}</b>
                                <span className="block text-[10px] text-muted-foreground">
                                  {reason}
                                </span>
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                patchZone.mutate({ id: z.id, active: !z.active })
                              }
                              className={`rounded-lg px-3 py-1.5 text-[11px] font-bold ${
                                z.active
                                  ? "bg-secondary text-primary-dark"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {z.active ? t("সক্রিয়", "Active") : t("বন্ধ", "Off")}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  {!zonesQ.isLoading && (zonesQ.data?.items?.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">
                        {t("কোনো জোন নেই", "No zones")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {active === "staff" && (
          <div className="space-y-4">
            <section className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs font-bold text-navy">
                {t("ভূমিকা ও অনুমতি", "Roles & permissions")}
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {ASSIGNABLE_ROLES.map((r) => (
                  <div key={r} className="rounded-lg border border-border p-2">
                    <p className="text-[11px] font-bold text-navy">{ROLE_LABEL[r].bn}</p>
                    <p className="text-[10px] text-muted-foreground">{ROLE_LABEL[r].desc}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs font-bold text-navy">
                {t("নতুন স্টাফ যোগ করুন", "Add staff")}
              </p>
              <input
                value={staffQ}
                onChange={(e) => setStaffQ(e.target.value)}
                placeholder={t(
                  "নাম, ফোন বা ইমেইল দিয়ে ব্যবহারকারী খুঁজুন",
                  "Search by name, phone or email",
                )}
                className="mt-2 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
              />
              {(staffSearchQ.data?.items?.length ?? 0) > 0 && (
                <div className="mt-2 space-y-2">
                  {staffSearchQ.data!.items.map((u) => (
                    <div key={u.userId} className="rounded-lg border border-border p-2.5">
                      <p className="text-xs font-bold text-navy">{u.name || "—"}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {u.email || "—"} · {u.phone || "—"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {ASSIGNABLE_ROLES.map((r) => {
                          const on = (u.roles ?? []).includes(r);
                          const locked =
                            (r === "admin" || r === "super_admin") && !isSuperAdmin;
                          return (
                            <button
                              key={r}
                              type="button"
                              disabled={setStaffRole.isPending || locked || !isAdmin}
                              title={
                                locked
                                  ? t(
                                      "শুধু সুপার অ্যাডমিন পরিবর্তন করতে পারেন",
                                      "Only super admin can change",
                                    )
                                  : ""
                              }
                              onClick={() =>
                                setStaffRole.mutate({
                                  userId: u.userId,
                                  role: r,
                                  grant: !on,
                                })
                              }
                              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-40 ${
                                on
                                  ? "bg-primary text-primary-foreground"
                                  : "border border-border text-muted-foreground hover:text-navy"
                              }`}
                            >
                              {ROLE_LABEL[r].bn}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs font-bold text-navy">
                {t("বর্তমান স্টাফ", "Current staff")} ({staffQry.data?.items?.length ?? 0})
              </p>
              <div className="mt-2 space-y-2">
                {(staffQry.data?.items ?? []).map((s) => (
                  <div key={s.userId} className="rounded-lg border border-border p-2.5">
                    <p className="text-xs font-bold text-navy">{s.name || "—"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {s.email || "—"} · {s.phone || "—"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {ASSIGNABLE_ROLES.map((r) => {
                        const on = s.roles.includes(r);
                        const locked =
                          (r === "admin" || r === "super_admin") && !isSuperAdmin;
                        return (
                          <button
                            key={r}
                            type="button"
                            disabled={setStaffRole.isPending || locked || !isAdmin}
                            title={
                              locked
                                ? t(
                                    "শুধু সুপার অ্যাডমিন পরিবর্তন করতে পারেন",
                                    "Only super admin can change",
                                  )
                                : ""
                            }
                            onClick={() =>
                              setStaffRole.mutate({
                                userId: s.userId,
                                role: r,
                                grant: !on,
                              })
                            }
                            className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-40 ${
                              on
                                ? "bg-primary text-primary-foreground"
                                : "border border-border text-muted-foreground hover:text-navy"
                            }`}
                          >
                            {ROLE_LABEL[r].bn}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {!staffQry.isLoading && (staffQry.data?.items?.length ?? 0) === 0 && (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    {t("কোনো স্টাফ নেই", "No staff")}
                  </p>
                )}
              </div>
            </section>
          </div>
        )}

        {active === "gallery" && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <select
                value={mediaKind}
                onChange={(e) => setMediaKind(e.target.value)}
                className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
              >
                <option value="all">{t("সব ছবি", "All images")}</option>
                {MEDIA_KINDS.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.t}
                  </option>
                ))}
              </select>
              <input
                value={mediaQ}
                onChange={(e) => setMediaQ(e.target.value)}
                placeholder={t("ছবির নাম খুঁজুন", "Search by name")}
                className="min-w-[8rem] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none"
              />
            </div>

            <div className="rounded-xl border border-border bg-card p-3">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={mediaUploadKind}
                  onChange={(e) => setMediaUploadKind(e.target.value)}
                  className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
                >
                  {MEDIA_KINDS.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.t}
                    </option>
                  ))}
                </select>
                <label className="cursor-pointer rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
                  {uploadMedia.isPending
                    ? t("আপলোড হচ্ছে...", "Uploading...")
                    : t("ছবি আপলোড", "Upload image")}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.length) uploadMedia.mutate(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder={t("অথবা ছবির লিংক (URL) দিন", "Or paste image URL")}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none"
                />
                <button
                  type="button"
                  disabled={!mediaUrl.trim() || addMediaUrl.isPending}
                  onClick={() => addMediaUrl.mutate()}
                  className="rounded-lg border border-border px-3 py-2 text-xs font-semibold disabled:opacity-50"
                >
                  {t("যোগ করুন", "Add")}
                </button>
              </div>
            </div>

            {mediaQry.isLoading ? (
              <p className="text-xs text-muted-foreground">{t("লোড হচ্ছে...", "Loading...")}</p>
            ) : (mediaQry.data?.items?.length ?? 0) === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t("এই ধরনের কোনো ছবি নেই।", "No images of this kind.")}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                {mediaQry.data!.items.map((a) => (
                  <div key={a.id} className="overflow-hidden rounded-xl border border-border bg-card">
                    <div className="bg-muted/40 p-1">
                      <ProductImage src={a.url} alt={a.name} emoji="🖼️" ratio="square" />
                    </div>
                    <div className="px-2 pb-2">
                      <p className="truncate text-[10px] text-muted-foreground">{a.name}</p>
                      <div className="mt-1 flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            void navigator.clipboard.writeText(a.url);
                            toast.success(t("লিংক কপি হয়েছে", "Link copied"));
                          }}
                          className="rounded border border-border px-1.5 py-0.5 text-[9px] font-semibold"
                        >
                          {t("লিংক", "Link")}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteMedia.mutate(a.id)}
                          className="rounded border border-border px-1.5 py-0.5 text-[9px] font-semibold text-sale"
                        >
                          {t("মুছুন", "Delete")}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {active === "imgupload" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {[
                {
                  t: t("মোট সক্রিয় পণ্য", "Active products"),
                  v: bn(imgCountsQ.data?.total ?? 0),
                },
                {
                  t: t("ছবি অনুপস্থিত", "Missing"),
                  v: bn(imgCountsQ.data?.missing ?? 0),
                  tone: "text-sale",
                },
                {
                  t: t("ফাইল আপলোড আছে", "Uploaded"),
                  v: bn(imgCountsQ.data?.uploaded ?? 0),
                  tone: "text-primary",
                },
                {
                  t: t("লিংক থেকে লোড", "External URL"),
                  v: bn(imgCountsQ.data?.external ?? 0),
                },
              ].map((s) => (
                <div key={s.t} className="rounded-xl border border-border bg-card p-3">
                  <p className="text-[11px] text-muted-foreground">{s.t}</p>
                  <p className={`mt-1 text-lg font-extrabold ${s.tone ?? ""}`}>{s.v}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-card p-3">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={imgFilter}
                  onChange={(e) => {
                    setImgFilter(e.target.value as typeof imgFilter);
                    setImgPage(0);
                  }}
                  className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
                >
                  <option value="missing">{t("ছবি অনুপস্থিত", "Missing")}</option>
                  <option value="uploaded">{t("ফাইল আপলোড আছে", "Uploaded")}</option>
                  <option value="external">{t("লিংক থেকে লোড", "External")}</option>
                  <option value="all">{t("সব পণ্য", "All products")}</option>
                </select>
                <input
                  value={imgQ}
                  onChange={(e) => {
                    setImgQ(e.target.value);
                    setImgPage(0);
                  }}
                  placeholder={t("পণ্যের নাম বা আইডি খুঁজুন", "Search name or id")}
                  className="min-w-[9rem] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none"
                />
                <span className="text-[11px] text-muted-foreground">
                  {t("মোট", "Total")} {bn(imgListQ.data?.count ?? 0)}
                </span>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {imgListQ.isLoading && (
                  <p className="text-xs text-muted-foreground">{t("লোড হচ্ছে...", "Loading...")}</p>
                )}
                {(imgListQ.data?.items ?? []).map((r) => {
                  const url = r.imageUrl;
                  const missing = !url.trim();
                  const uploaded =
                    !missing &&
                    (url.includes("/uploads/") || url.includes("product-images"));
                  const label = missing
                    ? t("ছবি নেই", "No image")
                    : uploaded
                      ? t("আপলোড", "Uploaded")
                      : t("বহিরাগত লিংক", "External");
                  return (
                    <div
                      key={r.id}
                      className="flex items-center gap-3 rounded-lg border border-border p-2"
                    >
                      <div className="w-14 shrink-0">
                        <ProductImage
                          src={r.imageUrl || null}
                          alt={r.name}
                          ratio="square"
                          className="rounded-lg"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold">{r.name}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{r.id}</p>
                        <span
                          className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold ${
                            missing
                              ? "bg-sale/10 text-sale"
                              : uploaded
                                ? "bg-primary/10 text-primary"
                                : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {label}
                        </span>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          <label className="cursor-pointer rounded border border-border px-1.5 py-0.5 text-[9px] font-semibold">
                            {uploadProductImg.isPending
                              ? "…"
                              : t("আপলোড", "Upload")}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) {
                                  uploadProductImg.mutate({ productId: r.id, file: f });
                                }
                                e.target.value = "";
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const next = window.prompt(
                                t("ছবির URL দিন", "Enter image URL"),
                                r.imageUrl || "",
                              );
                              if (next == null) return;
                              setProductImgUrl.mutate({
                                productId: r.id,
                                imageUrl: next.trim(),
                              });
                            }}
                            className="rounded border border-border px-1.5 py-0.5 text-[9px] font-semibold"
                          >
                            URL
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {!imgListQ.isLoading && (imgListQ.data?.items?.length ?? 0) === 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t("কোনো পণ্য নেই।", "No products.")}
                  </p>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  disabled={imgPage === 0}
                  onClick={() => setImgPage((p) => Math.max(0, p - 1))}
                  className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-40"
                >
                  {t("আগের", "Prev")}
                </button>
                <span className="text-[11px] text-muted-foreground">
                  {t("পৃষ্ঠা", "Page")} {bn(imgPage + 1)}
                </span>
                <button
                  type="button"
                  disabled={
                    (imgPage + 1) * (imgListQ.data?.pageSize ?? 24) >=
                    (imgListQ.data?.count ?? 0)
                  }
                  onClick={() => setImgPage((p) => p + 1)}
                  className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-40"
                >
                  {t("পরের", "Next")}
                </button>
              </div>
            </div>
          </div>
        )}

        {active === "imgaudit" && (
          <div className="space-y-4">
            {(() => {
              const c = auditSummaryQ.data?.counts ?? {};
              const total = auditSummaryQ.data?.total ?? 0;
              const okPct = total ? Math.round(((c.ok ?? 0) / total) * 100) : 0;
              const STATUS_LABEL: Record<string, string> = {
                ok: t("ঠিক আছে", "OK"),
                placeholder: t("প্লেসহোল্ডার", "Placeholder"),
                duplicate: t("ডুপ্লিকেট URL", "Duplicate URL"),
                missing: t("ছবি নেই", "Missing"),
                broken: t("লোড হয় না", "Broken"),
                unknown: t("অজানা", "Unknown"),
              };
              return (
                <>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                    {[
                      { t: t("মোট পণ্য", "Products"), v: bn(total) },
                      {
                        t: t("সঠিক ছবি", "OK"),
                        v: `${bn(c.ok ?? 0)} (${bn(okPct)}%)`,
                      },
                      {
                        t: t("প্লেসহোল্ডার", "Placeholder"),
                        v: bn(c.placeholder ?? 0),
                        warn: true,
                      },
                      {
                        t: t("ডুপ্লিকেট", "Duplicate"),
                        v: bn(c.duplicate ?? 0),
                        warn: true,
                      },
                      {
                        t: t("ছবি নেই", "Missing"),
                        v: bn(c.missing ?? 0),
                        warn: true,
                      },
                      {
                        t: t("ভাঙা (স্ক্যান)", "Broken scan"),
                        v: bn(auditBrokenIds.length),
                        warn: true,
                      },
                    ].map((s) => (
                      <div key={s.t} className="rounded-xl border border-border bg-card p-3">
                        <p className="text-[11px] text-muted-foreground">{s.t}</p>
                        <p
                          className={`mt-1 text-lg font-extrabold ${
                            s.warn ? "text-sale" : ""
                          }`}
                        >
                          {s.v}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {t("ঔষধের ছবি আছে", "Medicine images")}:{" "}
                    {bn(auditSummaryQ.data?.withMedicine ?? 0)}{" "}
                    {t("টি পণ্যের।", "products.")}
                  </p>

                  <div className="rounded-xl border border-border bg-card p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={rescanImages.isPending}
                        onClick={() => rescanImages.mutate()}
                        className="rounded-lg border border-border px-3 py-2 text-xs font-semibold disabled:opacity-50"
                      >
                        {rescanImages.isPending
                          ? t("যাচাই হচ্ছে...", "Scanning...")
                          : t("বহিরাগত URL লোড যাচাই", "Rescan external URLs")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActive("imgupload")}
                        className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                      >
                        {t("ছবি আপলোডে যান", "Go to image upload")}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-card p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={auditStatus}
                        onChange={(e) => {
                          setAuditStatus(e.target.value);
                          setAuditPage(0);
                        }}
                        className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
                      >
                        <option value="all">{t("সব সমস্যা", "All issues")}</option>
                        {["missing", "placeholder", "duplicate", "ok"].map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>
                      <input
                        value={auditQ}
                        onChange={(e) => {
                          setAuditQ(e.target.value);
                          setAuditPage(0);
                        }}
                        placeholder={t("পণ্যের নাম খুঁজুন", "Search products")}
                        className="min-w-[8rem] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none"
                      />
                      <span className="text-[11px] text-muted-foreground">
                        {bn(auditListQ.data?.count ?? 0)}
                      </span>
                    </div>

                    <div className="mt-3 space-y-2">
                      {(auditListQ.data?.items ?? []).map((a) => {
                        const broken = auditBrokenIds.includes(a.id);
                        const status = broken ? "broken" : a.status;
                        return (
                          <div
                            key={a.id}
                            className="flex items-center gap-3 rounded-lg border border-border p-2"
                          >
                            <div className="w-12 shrink-0">
                              <ProductImage
                                src={a.imageUrl || null}
                                alt={a.name}
                                ratio="square"
                                className="rounded-lg"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold">{a.name}</p>
                              <p className="truncate text-[10px] text-muted-foreground">
                                {a.imageUrl || "—"}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                status === "ok"
                                  ? "bg-primary/10 text-primary"
                                  : "bg-sale/10 text-sale"
                              }`}
                            >
                              {STATUS_LABEL[status] ?? status}
                            </span>
                            <button
                              type="button"
                              onClick={() => setActive("imgupload")}
                              className="shrink-0 rounded border border-border px-2 py-1 text-[10px] font-semibold"
                            >
                              {t("ঠিক করুন", "Fix")}
                            </button>
                          </div>
                        );
                      })}
                      {!auditListQ.isLoading &&
                        (auditListQ.data?.items?.length ?? 0) === 0 && (
                          <p className="py-4 text-center text-xs text-muted-foreground">
                            {t("কোনো সমস্যা নেই", "No issues")}
                          </p>
                        )}
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <button
                        type="button"
                        disabled={auditPage === 0}
                        onClick={() => setAuditPage((p) => Math.max(0, p - 1))}
                        className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-40"
                      >
                        {t("আগের", "Prev")}
                      </button>
                      <span className="text-[11px] text-muted-foreground">
                        {t("পৃষ্ঠা", "Page")} {bn(auditPage + 1)}
                      </span>
                      <button
                        type="button"
                        disabled={
                          (auditPage + 1) * (auditListQ.data?.pageSize ?? 25) >=
                          (auditListQ.data?.count ?? 0)
                        }
                        onClick={() => setAuditPage((p) => p + 1)}
                        className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-40"
                      >
                        {t("পরের", "Next")}
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {active === "imgrev" && (
          <div className="space-y-4">
            {(() => {
              const c = revSummaryQ.data?.counts ?? {};
              const STATUS_LABEL: Record<string, string> = {
                pending: t("অপেক্ষমাণ", "Pending"),
                approved: t("অনুমোদিত", "Approved"),
                rejected: t("বাতিল", "Rejected"),
                rolled_back: t("রোলব্যাক", "Rolled back"),
              };
              const METHOD_LABEL: Record<string, string> = {
                manual: t("ম্যানুয়াল", "Manual"),
                unwatermark: t("ওয়াটারমার্ক মুছে ফেলা", "Unwatermark"),
                "alt-source": t("বিকল্প সোর্স", "Alt source"),
              };
              const ACTION_LABEL: Record<string, string> = {
                propose: t("প্রস্তাব", "Propose"),
                approve: t("অনুমোদন", "Approve"),
                reject: t("বাতিল", "Reject"),
                rollback: t("রোলব্যাক", "Rollback"),
              };
              const TONE: Record<string, string> = {
                pending: "bg-secondary text-muted-foreground",
                approved: "bg-primary/10 text-primary",
                rejected: "bg-destructive/10 text-destructive",
                rolled_back: "bg-sale/10 text-sale",
              };
              const rows = revListQ.data?.rows ?? [];
              const allSelected = rows.length > 0 && revSel.length === rows.length;
              return (
                <>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    {(
                      [
                        ["pending", t("অপেক্ষমাণ", "Pending")],
                        ["approved", t("অনুমোদিত", "Approved")],
                        ["rejected", t("বাতিল", "Rejected")],
                        ["rolled_back", t("রোলব্যাক", "Rolled back")],
                      ] as const
                    ).map(([k, label]) => (
                      <div key={k} className="rounded-xl border border-border bg-card p-3">
                        <p className="text-[11px] text-muted-foreground">{label}</p>
                        <p className="mt-1 text-lg font-extrabold">{bn(c[k] ?? 0)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl border border-border bg-card p-3">
                    <p className="mb-2 text-xs font-semibold">
                      {t("নতুন রিভিশন প্রস্তাব", "Propose revision")}
                    </p>
                    <div className="flex flex-wrap items-end gap-2">
                      <label className="text-[11px] text-muted-foreground">
                        {t("পণ্য ID", "Product ID")}
                        <input
                          value={revForm.productId}
                          onChange={(e) => setRevForm((f) => ({ ...f, productId: e.target.value }))}
                          className="mt-1 block w-44 rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
                        />
                      </label>
                      <label className="text-[11px] text-muted-foreground">
                        {t("স্লট", "Slot")}
                        <select
                          value={revForm.field}
                          onChange={(e) => setRevForm((f) => ({ ...f, field: e.target.value }))}
                          className="mt-1 block rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
                        >
                          <option value="box">{t("বক্স", "Box")}</option>
                          <option value="medicine">{t("ঔষধ", "Medicine")}</option>
                        </select>
                      </label>
                      <label className="min-w-[12rem] flex-1 text-[11px] text-muted-foreground">
                        {t("নতুন URL", "New URL")}
                        <input
                          value={revForm.afterUrl}
                          onChange={(e) => setRevForm((f) => ({ ...f, afterUrl: e.target.value }))}
                          className="mt-1 block w-full rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
                        />
                      </label>
                      <button
                        type="button"
                        disabled={
                          createRev.isPending ||
                          !revForm.productId.trim() ||
                          !revForm.afterUrl.trim()
                        }
                        onClick={() => createRev.mutate()}
                        className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                      >
                        {t("যোগ করুন", "Queue")}
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {t(
                        "মেডেক্স অটো-ফেচ এখনো নেই — ম্যানুয়াল URL প্রস্তাব করুন।",
                        "Medex auto-fetch deferred — propose URLs manually.",
                      )}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {(["gallery", "audit"] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setRevView(v)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                          revView === v
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {v === "gallery"
                          ? t("রিভিউ গ্যালারি", "Review gallery")
                          : t("অডিট লগ", "Audit log")}
                      </button>
                    ))}
                    <input
                      value={revQ}
                      onChange={(e) => {
                        setRevQ(e.target.value);
                        setRevPage(0);
                      }}
                      placeholder={t("পণ্যের নাম/আইডি", "Product name/ID")}
                      className="h-9 min-w-[10rem] flex-1 rounded-lg border border-border bg-background px-3 text-xs outline-none"
                    />
                  </div>

                  {revView === "gallery" && (
                    <>
                      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
                        <select
                          value={revStatus}
                          onChange={(e) => {
                            setRevStatus(e.target.value);
                            setRevPage(0);
                          }}
                          className="h-9 rounded-lg border border-border bg-background px-2 text-xs"
                        >
                          {["pending", "approved", "rejected", "rolled_back", "all"].map((v) => (
                            <option key={v} value={v}>
                              {v === "all" ? t("সব", "All") : STATUS_LABEL[v]}
                            </option>
                          ))}
                        </select>
                        <select
                          value={revMethod}
                          onChange={(e) => {
                            setRevMethod(e.target.value);
                            setRevPage(0);
                          }}
                          className="h-9 rounded-lg border border-border bg-background px-2 text-xs"
                        >
                          <option value="all">{t("সব পদ্ধতি", "All methods")}</option>
                          {Object.entries(METHOD_LABEL).map(([k, label]) => (
                            <option key={k} value={k}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <div className="ml-auto flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setRevSel(allSelected ? [] : rows.map((r) => r.id))
                            }
                            className="rounded-lg bg-secondary px-3 py-1.5 text-xs"
                          >
                            {allSelected
                              ? t("নির্বাচন বাতিল", "Clear")
                              : t("সব নির্বাচন", "Select all")}
                          </button>
                          <span className="text-[11px] text-muted-foreground">
                            {bn(revSel.length)} • {bn(revListQ.data?.count ?? 0)}
                          </span>
                          <button
                            type="button"
                            disabled={!revSel.length || revAction.isPending}
                            onClick={() => revAction.mutate({ action: "approve", ids: revSel })}
                            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
                          >
                            {t("অনুমোদন", "Approve")}
                          </button>
                          <button
                            type="button"
                            disabled={!revSel.length || revAction.isPending}
                            onClick={() => revAction.mutate({ action: "reject", ids: revSel })}
                            className="rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive disabled:opacity-40"
                          >
                            {t("বাতিল", "Reject")}
                          </button>
                          <button
                            type="button"
                            disabled={!revSel.length || revAction.isPending}
                            onClick={() => revAction.mutate({ action: "rollback", ids: revSel })}
                            className="rounded-lg bg-sale/10 px-3 py-1.5 text-xs font-semibold text-sale disabled:opacity-40"
                          >
                            {t("রোলব্যাক", "Rollback")}
                          </button>
                        </div>
                      </div>

                      {revListQ.isLoading ? (
                        <p className="py-10 text-center text-sm text-muted-foreground">
                          {t("লোড হচ্ছে…", "Loading…")}
                        </p>
                      ) : rows.length === 0 ? (
                        <p className="py-10 text-center text-sm text-muted-foreground">
                          {t("কোনো রিভিশন নেই", "No revisions")}
                        </p>
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {rows.map((r) => {
                            const checked = revSel.includes(r.id);
                            return (
                              <div
                                key={r.id}
                                className={`rounded-xl border p-3 ${
                                  checked ? "border-primary" : "border-border"
                                } bg-card`}
                              >
                                <div className="mb-2 flex items-start gap-2">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() =>
                                      setRevSel((p) =>
                                        checked ? p.filter((i) => i !== r.id) : [...p, r.id],
                                      )
                                    }
                                    className="mt-1 h-4 w-4"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold">{r.product_name}</p>
                                    <p className="truncate text-[11px] text-muted-foreground">
                                      {r.product_id} •{" "}
                                      {r.field === "box" ? t("বক্স", "Box") : t("ঔষধ", "Medicine")}
                                    </p>
                                  </div>
                                  <span
                                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${
                                      TONE[r.status] ?? ""
                                    }`}
                                  >
                                    {STATUS_LABEL[r.status] ?? r.status}
                                  </span>
                                </div>
                                <div className="flex gap-2">
                                  {[
                                    { url: r.before_url, label: t("আগে", "Before") },
                                    { url: r.after_url, label: t("পরে", "After") },
                                  ].map((f) => (
                                    <div key={f.label} className="flex-1">
                                      <p className="mb-1 text-[11px] text-muted-foreground">
                                        {f.label}
                                      </p>
                                      <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-background">
                                        {f.url ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img
                                            src={f.url}
                                            alt={f.label}
                                            loading="lazy"
                                            className="absolute inset-0 h-full w-full object-contain p-1"
                                          />
                                        ) : (
                                          <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">
                                            {t("ছবি নেই", "No image")}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <p className="mt-2 text-[11px] text-muted-foreground">
                                  {METHOD_LABEL[r.method] ?? r.method}
                                  {r.source ? ` • ${r.source}` : ""}
                                  {r.note ? ` • ${r.note}` : ""}
                                </p>
                                <div className="mt-2 flex gap-2">
                                  {r.status === "pending" && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          revAction.mutate({ action: "approve", ids: [r.id] })
                                        }
                                        className="flex-1 rounded-lg bg-primary px-2 py-1.5 text-xs font-medium text-primary-foreground"
                                      >
                                        {t("অনুমোদন", "Approve")}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          revAction.mutate({ action: "reject", ids: [r.id] })
                                        }
                                        className="flex-1 rounded-lg bg-secondary px-2 py-1.5 text-xs font-medium"
                                      >
                                        {t("বাতিল", "Reject")}
                                      </button>
                                    </>
                                  )}
                                  {r.status === "approved" && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        revAction.mutate({ action: "rollback", ids: [r.id] })
                                      }
                                      className="flex-1 rounded-lg bg-sale/10 px-2 py-1.5 text-xs font-medium text-sale"
                                    >
                                      {t("রোলব্যাক", "Rollback")}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          disabled={revPage === 0}
                          onClick={() => setRevPage((p) => Math.max(0, p - 1))}
                          className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-40"
                        >
                          {t("আগের", "Prev")}
                        </button>
                        <span className="text-[11px] text-muted-foreground">
                          {t("পৃষ্ঠা", "Page")} {bn(revPage + 1)}
                        </span>
                        <button
                          type="button"
                          disabled={
                            (revPage + 1) * (revListQ.data?.pageSize ?? 24) >=
                            (revListQ.data?.count ?? 0)
                          }
                          onClick={() => setRevPage((p) => p + 1)}
                          className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-40"
                        >
                          {t("পরের", "Next")}
                        </button>
                      </div>
                    </>
                  )}

                  {revView === "audit" && (
                    <div className="overflow-x-auto rounded-xl border border-border bg-card">
                      <table className="w-full text-sm">
                        <thead className="bg-secondary/60 text-left text-xs text-muted-foreground">
                          <tr>
                            <th className="p-2">{t("সময়", "Time")}</th>
                            <th className="p-2">{t("পণ্য", "Product")}</th>
                            <th className="p-2">{t("অ্যাকশন", "Action")}</th>
                            <th className="p-2">{t("স্লট", "Slot")}</th>
                            <th className="p-2">{t("আগে", "From")}</th>
                            <th className="p-2">{t("পরে", "To")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(revAuditQ.data?.rows ?? []).map((a) => (
                            <tr key={a.id} className="border-t border-border">
                              <td className="whitespace-nowrap p-2 text-xs text-muted-foreground">
                                {new Date(a.created_at).toLocaleString(
                                  t.en ? "en-US" : "bn-BD",
                                )}
                              </td>
                              <td className="p-2">
                                <span className="block max-w-[180px] truncate">
                                  {a.product_name}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  {a.product_id}
                                </span>
                              </td>
                              <td className="p-2">{ACTION_LABEL[a.action] ?? a.action}</td>
                              <td className="p-2">
                                {a.field === "box" ? t("বক্স", "Box") : t("ঔষধ", "Medicine")}
                              </td>
                              <td className="p-2">
                                {a.from_url ? (
                                  <a
                                    href={a.from_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-primary underline"
                                  >
                                    {t("দেখুন", "View")}
                                  </a>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td className="p-2">
                                {a.to_url ? (
                                  <a
                                    href={a.to_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-primary underline"
                                  >
                                    {t("দেখুন", "View")}
                                  </a>
                                ) : (
                                  "—"
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {revAuditQ.isLoading && (
                        <p className="p-4 text-center text-sm text-muted-foreground">
                          {t("লোড হচ্ছে…", "Loading…")}
                        </p>
                      )}
                      {!revAuditQ.isLoading && (revAuditQ.data?.rows?.length ?? 0) === 0 && (
                        <p className="p-4 text-center text-sm text-muted-foreground">
                          {t("কোনো লগ নেই", "No log entries")}
                        </p>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {active === "health" && (
          <div className="space-y-4">
            {(() => {
              const d = healthQ.data;
              const checks = d
                ? [
                    {
                      id: "riders",
                      label: t("সক্রিয় ডেলিভারিম্যান", "Active riders"),
                      ok: d.activeRiders > 0,
                      detail:
                        d.activeRiders > 0
                          ? t(
                              `${bn(d.activeRiders)} জন সক্রিয় (মোট ${bn(d.totalRiders)})`,
                              `${bn(d.activeRiders)} active (of ${bn(d.totalRiders)})`,
                            )
                          : t(
                              "কোনো ডেলিভারিম্যান নেই — অর্ডার অ্যাসাইন করা যাবে না",
                              "No riders — cannot assign deliveries",
                            ),
                      fixTab: "delivery",
                      fixLabel: t("ডেলিভারি", "Delivery"),
                    },
                    {
                      id: "images",
                      label: t("পণ্যের ছবি", "Product images"),
                      ok: d.missingImg === 0,
                      detail: t(
                        `${bn(d.missingImg)} টি পণ্যের ছবি নেই (মোট ${bn(d.activeProducts)})`,
                        `${bn(d.missingImg)} products missing images (of ${bn(d.activeProducts)})`,
                      ),
                      fixTab: "products",
                      fixLabel: t("প্রোডাক্ট", "Products"),
                    },
                    {
                      id: "unassigned",
                      label: t("অ্যাসাইন হয়নি এমন ডেলিভারি", "Unassigned deliveries"),
                      ok: d.unassigned === 0,
                      detail: t(
                        `${bn(d.unassigned)} টি ডেলিভারিতে রাইডার নেই`,
                        `${bn(d.unassigned)} deliveries without rider`,
                      ),
                      fixTab: "delivery",
                      fixLabel: t("ডেলিভারি", "Delivery"),
                    },
                    {
                      id: "orders",
                      label: t("প্রক্রিয়াধীন অর্ডার", "Open orders"),
                      ok: true,
                      detail: t(
                        `${bn(d.pendingOrders)} টি অর্ডার প্রস্তুত/নিশ্চিত অবস্থায়`,
                        `${bn(d.pendingOrders)} confirmed/processing orders`,
                      ),
                      fixTab: "orders",
                      fixLabel: t("অর্ডার", "Orders"),
                    },
                    {
                      id: "doctors",
                      label: t("সক্রিয় ডাক্তার", "Active doctors"),
                      ok: d.doctors > 0,
                      detail: t(
                        `${bn(d.doctors)} জন ডাক্তার সক্রিয়`,
                        `${bn(d.doctors)} doctors active`,
                      ),
                      fixTab: "doctors",
                      fixLabel: t("ডাক্তার", "Doctors"),
                    },
                    {
                      id: "catalog",
                      label: t("ক্যাটালগ সেটআপ", "Catalog setup"),
                      ok: d.cats > 0 && d.labs > 0,
                      detail: t(
                        `ক্যাটাগরি ${bn(d.cats)} · ল্যাব ${bn(d.labs)} · অফার ${bn(d.offers)}`,
                        `Categories ${bn(d.cats)} · Labs ${bn(d.labs)} · Offers ${bn(d.offers)}`,
                      ),
                      fixTab: "categories",
                      fixLabel: t("ক্যাটাগরি", "Categories"),
                    },
                  ]
                : [];
              const bad = checks.filter((c) => !c.ok);
              return (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold">
                        {t("সিস্টেম হেলথ ও QA", "System health & QA")}
                      </h2>
                      <p className="text-[11px] text-muted-foreground">
                        {healthQ.isLoading
                          ? t("যাচাই হচ্ছে...", "Checking...")
                          : bad.length === 0
                            ? t("সবকিছু ঠিক আছে", "All clear")
                            : t(
                                `${bn(bad.length)} টি বিষয়ে মনোযোগ প্রয়োজন`,
                                `${bn(bad.length)} items need attention`,
                              )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void healthQ.refetch()}
                      className="rounded-lg border border-border px-3 py-2 text-xs font-semibold"
                    >
                      {t("রিফ্রেশ", "Refresh")}
                    </button>
                  </div>
                  {bad.length > 0 && (
                    <div className="rounded-xl border border-sale/30 bg-sale/5 p-3">
                      <p className="text-xs font-bold text-sale">
                        {t("দ্রুত ঠিক করার তালিকা", "Quick fix list")}
                      </p>
                      <ul className="mt-2 space-y-1">
                        {bad.map((c) => (
                          <li
                            key={c.id}
                            className="flex flex-wrap items-center gap-2 text-[11px]"
                          >
                            <span className="font-semibold">{c.label}:</span>
                            <span className="text-muted-foreground">{c.detail}</span>
                            <button
                              type="button"
                              onClick={() => setActive(c.fixTab)}
                              className="ml-auto rounded-lg bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground"
                            >
                              {c.fixLabel}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="grid gap-2 sm:grid-cols-2">
                    {checks.map((c) => (
                      <div key={c.id} className="rounded-xl border border-border bg-card p-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              c.ok ? "bg-primary" : "bg-sale"
                            }`}
                          />
                          <p className="text-xs font-bold">{c.label}</p>
                          <button
                            type="button"
                            onClick={() => setActive(c.fixTab)}
                            className="ml-auto text-[10px] font-semibold text-primary underline"
                          >
                            {c.fixLabel}
                          </button>
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">{c.detail}</p>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {active === "monitor" && (
          <div className="space-y-4">
            {(() => {
              const s = monitorStatsQ.data ?? {};
              const pct = uptime.total
                ? Math.round((uptime.ok / uptime.total) * 100)
                : 100;
              const errors24 = Number(s.errors_24h ?? 0);
              const kpi = (
                label: string,
                value: string,
                tone = "",
              ) => (
                <div className="rounded-xl border border-border bg-card p-3">
                  <p className="text-[11px] text-muted-foreground">{label}</p>
                  <p className={`mt-1 text-lg font-extrabold ${tone}`}>{value}</p>
                </div>
              );
              return (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void monitorStatsQ.refetch();
                        void monitorAlertsQ.refetch();
                        void monitorErrorsQ.refetch();
                      }}
                      className="min-h-11 rounded-lg border border-border px-4 text-sm font-semibold"
                    >
                      {t("রিফ্রেশ", "Refresh")}
                    </button>
                    <button
                      type="button"
                      onClick={() => runStockAlerts.mutate()}
                      disabled={runStockAlerts.isPending}
                      className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      {t("কম স্টক সতর্কতা চালান", "Run stock alerts")}
                    </button>
                    <span className="text-xs text-muted-foreground">
                      {t("সার্ভার সময়", "Server time")}:{" "}
                      {s.server_time
                        ? new Date(String(s.server_time)).toLocaleString("bn-BD")
                        : "—"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {kpi(
                      t("আপটাইম (এই সেশন)", "Uptime (session)"),
                      `${bn(pct)}% · ${bn(uptime.ok)}/${bn(uptime.total)}`,
                      pct === 100 ? "text-primary" : "text-sale",
                    )}
                    {kpi(
                      t("সার্ভার রেসপন্স", "Response"),
                      uptime.lastMs ? `${bn(uptime.lastMs)} ms` : "—",
                    )}
                    {kpi(t("সর্বশেষ চেক", "Last check"), uptime.lastAt || "—")}
                    {kpi(
                      t("২৪ ঘণ্টায় এরর", "Errors 24h"),
                      bn(errors24),
                      errors24 ? "text-sale" : "text-primary",
                    )}
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-bold">
                      {t("ডাটাবেজ ও ব্যবসায়িক স্বাস্থ্য", "DB & business health")}
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {kpi(t("মোট পণ্য", "Products"), bn(Number(s.products ?? 0)))}
                      {kpi(t("সক্রিয় পণ্য", "Active"), bn(Number(s.products_active ?? 0)))}
                      {kpi(
                        t("ছবি নেই", "No image"),
                        bn(Number(s.products_no_image ?? 0)),
                      )}
                      {kpi(
                        t("কম স্টক", "Low stock"),
                        bn(Number(s.low_stock ?? 0)),
                        Number(s.low_stock) ? "text-sale" : "text-primary",
                      )}
                      {kpi(
                        t("স্টক আউট", "Out of stock"),
                        bn(Number(s.out_of_stock ?? 0)),
                        Number(s.out_of_stock) ? "text-sale" : "",
                      )}
                      {kpi(t("মোট অর্ডার", "Orders"), bn(Number(s.orders ?? 0)))}
                      {kpi(t("আজকের অর্ডার", "Today"), bn(Number(s.orders_today ?? 0)))}
                      {kpi(
                        t("চলমান অর্ডার", "Open orders"),
                        bn(Number(s.orders_pending ?? 0)),
                      )}
                      {kpi(
                        t("৩০ দিনের আয়", "Revenue 30d"),
                        `৳${bn(Math.round(Number(s.revenue_30d ?? 0)))}`,
                        "text-primary",
                      )}
                      {kpi(t("গ্রাহক", "Customers"), bn(Number(s.customers ?? 0)))}
                      {kpi(
                        t("সক্রিয় রাইডার", "Active riders"),
                        bn(Number(s.riders_active ?? 0)),
                      )}
                      {kpi(
                        t("চলমান ডেলিভারি", "Open deliveries"),
                        bn(Number(s.deliveries_open ?? 0)),
                      )}
                      {kpi(t("সাপ্লায়ার", "Suppliers"), bn(Number(s.suppliers ?? 0)))}
                      {kpi(t("খোলা ক্রয়", "Open POs"), bn(Number(s.po_open ?? 0)))}
                      {kpi(t("ডাটাবেজ সাইজ", "DB size"), String(s.db_size ?? "—"))}
                      {kpi(
                        t("২৪ ঘণ্টায় সতর্কতা", "Alerts 24h"),
                        bn(Number(s.alerts_24h ?? 0)),
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="mb-2 text-sm font-bold">
                      {t("সাম্প্রতিক সতর্কতা", "Recent alerts")} (
                      {bn(monitorAlertsQ.data?.items?.length ?? 0)})
                    </p>
                    <ul className="space-y-1 text-xs">
                      {(monitorAlertsQ.data?.items?.length ?? 0) === 0 && (
                        <li className="text-muted-foreground">
                          {t("কোনো সতর্কতা নেই", "No alerts")}
                        </li>
                      )}
                      {(monitorAlertsQ.data?.items ?? []).slice(0, 15).map((a) => (
                        <li
                          key={a.id}
                          className="flex flex-wrap gap-2 border-b border-border pb-1"
                        >
                          <span className="rounded bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-navy">
                            {a.kind}
                          </span>
                          <span className="flex-1">{a.detail}</span>
                          <span className="text-muted-foreground">
                            {new Date(a.createdAt).toLocaleString("bn-BD")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="mb-2 text-sm font-bold">
                      {t("এরর লগ", "Error log")} (
                      {bn(monitorErrorsQ.data?.items?.length ?? 0)})
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-secondary text-[11px] uppercase text-muted-foreground">
                          <tr>
                            <th className="px-2 py-1.5">{t("সময়", "Time")}</th>
                            <th className="px-2 py-1.5">{t("উৎস", "Source")}</th>
                            <th className="px-2 py-1.5">{t("বার্তা", "Message")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(monitorErrorsQ.data?.items ?? []).map((e) => (
                            <tr key={e.id} className="border-t border-border">
                              <td className="px-2 py-1.5 whitespace-nowrap text-muted-foreground">
                                {new Date(e.createdAt).toLocaleString("bn-BD")}
                              </td>
                              <td className="px-2 py-1.5">{e.source}</td>
                              <td className="px-2 py-1.5">{e.message}</td>
                            </tr>
                          ))}
                          {(monitorErrorsQ.data?.items?.length ?? 0) === 0 && (
                            <tr>
                              <td
                                colSpan={3}
                                className="px-2 py-4 text-center text-muted-foreground"
                              >
                                {t("কোনো এরর নেই", "No errors")}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {active === "perms" && (
          <div className="space-y-4">
            {(() => {
              const allRoles = Object.keys(ROLE_LABEL) as AppRole[];
              const mods = Object.keys(PERM_MODULE_LABEL)
                .filter((m) => {
                  const term = permQ.trim().toLowerCase();
                  const okQ =
                    !term ||
                    (PERM_MODULE_LABEL[m] ?? m).toLowerCase().includes(term) ||
                    m.includes(term);
                  const okR =
                    !permRole ||
                    (ROLE_TABS[permRole] ?? []).includes("*") ||
                    (ROLE_TABS[permRole] ?? []).includes(m);
                  return okQ && okR;
                })
                .sort((a, b) =>
                  (PERM_MODULE_LABEL[a] ?? a).localeCompare(PERM_MODULE_LABEL[b] ?? b, "bn"),
                );
              const shown = permRole ? ([permRole] as AppRole[]) : allRoles;
              const roleCan = (role: AppRole, mod: string) => {
                const tabs = ROLE_TABS[role] ?? [];
                return tabs.includes("*") || tabs.includes(mod);
              };
              return (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={permQ}
                      onChange={(e) => setPermQ(e.target.value)}
                      placeholder={t("মডিউল খুঁজুন…", "Search modules…")}
                      className="min-h-11 min-w-48 flex-1 rounded-lg border border-border bg-card px-3 text-sm"
                    />
                    <select
                      value={permRole}
                      onChange={(e) => setPermRole(e.target.value as "" | AppRole)}
                      className="min-h-11 rounded-lg border border-border bg-card px-3 text-sm"
                    >
                      <option value="">{t("সব ভূমিকা", "All roles")}</option>
                      {allRoles.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r].bn}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-border bg-card">
                    <table className="w-full min-w-[760px] text-xs">
                      <thead className="bg-secondary/40 text-[10px] uppercase text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 text-left">{t("মডিউল", "Module")}</th>
                          {shown.map((r) => (
                            <th key={r} className="px-2 py-2 text-center">
                              {ROLE_LABEL[r].bn}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {mods.map((m) => (
                          <tr key={m}>
                            <td className="px-3 py-2">
                              <span className="font-semibold">
                                {PERM_MODULE_LABEL[m] ?? m}
                              </span>
                              <span className="ml-1 font-mono text-[10px] text-muted-foreground">
                                {m}
                              </span>
                            </td>
                            {shown.map((r) => (
                              <td key={r} className="px-2 py-2 text-center">
                                {roleCan(r, m) ? (
                                  <span className="font-bold text-primary">✓</span>
                                ) : (
                                  <span className="text-muted-foreground/50">—</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                        {mods.length === 0 && (
                          <tr>
                            <td
                              colSpan={shown.length + 1}
                              className="p-4 text-center text-muted-foreground"
                            >
                              {t("কোনো মডিউল মেলেনি", "No modules matched")}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </AdminShell>
  );
}


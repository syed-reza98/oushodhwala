export type AppRole =
  | "super_admin"
  | "admin"
  | "erp_manager"
  | "support_agent"
  | "accountant"
  | "pharmacist"
  | "rider"
  | "user";

export const STAFF_ROLES: AppRole[] = [
  "super_admin",
  "admin",
  "erp_manager",
  "support_agent",
  "accountant",
  "pharmacist",
];

/** Mirrors src/lib/roles.ts ROLE_TABS — keep in sync for UI freeze */
export const ROLE_TABS: Record<AppRole, string[]> = {
  super_admin: ["*"],
  admin: ["*"],
  erp_manager: [
    "dash",
    "workspace",
    "orders",
    "inventory",
    "products",
    "suppliers",
    "purchases",
    "batches",
    "erpreports",
    "audit",
    "monitor",
    "health",
    "stockadj",
    "stockcount",
    "labels",
    "branches",
    "transfers",
    "zones",
    "pos",
  ],
  accountant: [
    "dash",
    "workspace",
    "orders",
    "accounts",
    "reports",
    "returns",
    "loyalty",
    "expenses",
    "coa",
    "journal",
    "daybook",
    "financials",
    "party",
  ],
  support_agent: [
    "dash",
    "workspace",
    "support",
    "orders",
    "customers",
    "rx",
    "consults",
    "returns",
    "reviews",
  ],
  pharmacist: [
    "dash",
    "workspace",
    "pos",
    "rx",
    "consults",
    "products",
    "inventory",
    "lab",
    "diagnostics",
    "doctors",
    "labels",
  ],
  rider: [],
  user: [],
};

export function allowedTabs(roles: AppRole[]): "all" | Set<string> {
  if (roles.some((r) => ROLE_TABS[r]?.includes("*"))) return "all";
  const set = new Set<string>();
  roles.forEach((r) => (ROLE_TABS[r] ?? []).forEach((t) => set.add(t)));
  return set;
}

export function hasStaffAccess(roles: AppRole[]): boolean {
  return roles.some((r) => STAFF_ROLES.includes(r));
}

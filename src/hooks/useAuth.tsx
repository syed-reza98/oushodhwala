"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useSession, signOut as nextSignOut } from "next-auth/react";
import type { AppRole } from "@/server/auth/roles";
import { STAFF_ROLES } from "@/server/auth/roles";

export type { AppRole };
export { STAFF_ROLES };

type Profile = { id: string; name: string; phone: string };

type AuthCtx = {
  session: { user: { id: string; email?: string | null } } | null;
  user: { id: string; email?: string | null } | null;
  profile: Profile | null;
  roles: AppRole[];
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isStaff: boolean;
  hasRole: (r: AppRole) => boolean;
  loading: boolean;
  expired: boolean;
  clearExpired: () => void;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, status } = useSession();
  const roles = ((data?.user as { roles?: AppRole[] } | undefined)?.roles ??
    []) as AppRole[];
  const user = data?.user
    ? { id: data.user.id, email: data.user.email }
    : null;

  const value = useMemo<AuthCtx>(
    () => ({
      session: user ? { user } : null,
      user,
      profile: user
        ? {
            id: user.id,
            name: data?.user?.name ?? "",
            phone: "",
          }
        : null,
      roles,
      isAdmin: roles.includes("admin") || roles.includes("super_admin"),
      isSuperAdmin: roles.includes("super_admin"),
      isStaff: roles.some((r) => STAFF_ROLES.includes(r)),
      hasRole: (r) => roles.includes(r),
      loading: status === "loading",
      expired: false,
      clearExpired: () => {},
      refresh: async () => {},
      signOut: async () => {
        await nextSignOut({ redirect: false });
      },
    }),
    [user, roles, status, data?.user?.name],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

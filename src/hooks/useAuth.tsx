"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
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

/**
 * Interim auth context (logged-out default).
 * Auth.js SessionProvider wiring hit a Next 16 runtime issue; restore next-auth
 * session here once /api/auth is verified end-to-end.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useMemo<AuthCtx>(
    () => ({
      session: null,
      user: null,
      profile: null,
      roles: [],
      isAdmin: false,
      isSuperAdmin: false,
      isStaff: false,
      hasRole: () => false,
      loading: false,
      expired: false,
      clearExpired: () => {},
      refresh: async () => {},
      signOut: async () => {},
    }),
    [],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

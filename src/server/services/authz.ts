import { auth } from "@/server/auth/config";
import {
  allowedTabs,
  hasStaffAccess,
  type AppRole,
} from "@/server/auth/roles";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }
  return session.user;
}

export async function requireStaff() {
  const user = await requireUser();
  if (!hasStaffAccess(user.roles)) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export async function requireRoles(...roles: AppRole[]) {
  const user = await requireUser();
  if (!user.roles.some((r) => roles.includes(r))) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export { allowedTabs, hasStaffAccess };

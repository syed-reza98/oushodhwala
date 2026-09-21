import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth/config";
import { hasStaffAccess, type AppRole } from "@/server/auth/roles";

/**
 * Next.js 16 request proxy (replaces middleware.ts).
 * Soft-gates /admin for non-staff; client AdminShell still enforces UX.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const session = await auth();
  const roles = (session?.user?.roles ?? []) as AppRole[];
  if (!session?.user?.id || !hasStaffAccess(roles)) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};

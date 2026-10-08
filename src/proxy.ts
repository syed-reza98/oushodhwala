import { auth } from "@/server/auth/config";
import { NextResponse } from "next/server";
import { hasStaffAccess } from "@/server/auth/roles";

/**
 * Next.js 16 proxy convention (replaces legacy middleware).
 * Edge route protection for administrative routes before client bundles are served.
 */
export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const userRoles = req.auth?.user?.roles ?? [];

  if (pathname.startsWith("/admin")) {
    if (!isLoggedIn) {
      const url = new URL("/auth", req.url);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    if (!hasStaffAccess(userRoles)) {
      return NextResponse.redirect(new URL("/?error=unauthorized", req.url));
    }
  }

  return NextResponse.next();
});

export default proxy;

export const config = {
  matcher: ["/admin/:path*"],
};

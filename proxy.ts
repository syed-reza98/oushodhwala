import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16 proxy — placeholder for session refresh / auth redirects.
 * Expand when Auth.js cookie refresh needs request interception.
 */
export function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

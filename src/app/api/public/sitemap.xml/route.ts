import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Alias of `/sitemap.xml` for legacy clients. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  url.pathname = "/sitemap.xml";
  return NextResponse.redirect(url, 308);
}

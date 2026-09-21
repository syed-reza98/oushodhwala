import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "@/server/actions/catalog";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const result = await searchProducts({
    q: sp.get("q") ?? "",
    category: sp.get("category") ?? "all",
    sort: sp.get("sort") ?? "popular",
    rx: sp.get("rx") === "1",
    maxPrice: Number(sp.get("maxPrice") ?? 0) || undefined,
    offset: Number(sp.get("offset") ?? 0) || 0,
    limit: Number(sp.get("limit") ?? 40) || 40,
  });
  return NextResponse.json(result);
}

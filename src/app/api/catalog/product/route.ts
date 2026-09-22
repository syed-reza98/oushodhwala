import { NextRequest, NextResponse } from "next/server";
import { getProductPage } from "@/server/actions/catalog";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json(null, { status: 400 });
  const payload = await getProductPage(id);
  if (!payload) return NextResponse.json(null, { status: 404 });
  return NextResponse.json(payload);
}

import { NextRequest, NextResponse } from "next/server";
import { getProductById } from "@/server/actions/catalog";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json(null, { status: 400 });
  const row = await getProductById(id);
  if (!row) return NextResponse.json(null, { status: 404 });
  return NextResponse.json({
    row,
    related: [],
    variants: [],
    generic: null,
  });
}

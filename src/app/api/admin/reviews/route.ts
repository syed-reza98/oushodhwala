import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { productReviews, products } from "@/server/db/schema";
import { requireStaff } from "@/server/services/authz";
import { refreshProductReviewCount } from "@/server/services/reviews";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["pending", "approved", "rejected"]);

export async function GET(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const status = req.nextUrl.searchParams.get("status") ?? "pending";
  const rows =
    status && status !== "all"
      ? await db
          .select({
            id: productReviews.id,
            productId: productReviews.productId,
            productName: products.name,
            authorName: productReviews.authorName,
            rating: productReviews.rating,
            comment: productReviews.comment,
            verified: productReviews.verified,
            status: productReviews.status,
            createdAt: productReviews.createdAt,
          })
          .from(productReviews)
          .leftJoin(products, eq(products.id, productReviews.productId))
          .where(eq(productReviews.status, status))
          .orderBy(desc(productReviews.createdAt))
          .limit(200)
      : await db
          .select({
            id: productReviews.id,
            productId: productReviews.productId,
            productName: products.name,
            authorName: productReviews.authorName,
            rating: productReviews.rating,
            comment: productReviews.comment,
            verified: productReviews.verified,
            status: productReviews.status,
            createdAt: productReviews.createdAt,
          })
          .from(productReviews)
          .leftJoin(products, eq(products.id, productReviews.productId))
          .orderBy(desc(productReviews.createdAt))
          .limit(200);

  return NextResponse.json({
    items: rows.map((r) => ({
      id: r.id,
      productId: r.productId,
      productName: r.productName,
      authorName: r.authorName,
      rating: r.rating,
      comment: r.comment,
      verified: r.verified,
      status: r.status,
      createdAt: r.createdAt,
    })),
  });
}

export async function PATCH(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const body = (await req.json()) as { id?: string; status?: string };
  if (!body.id || !body.status || !ALLOWED.has(body.status)) {
    return NextResponse.json({ error: "id and valid status required" }, { status: 400 });
  }

  const [row] = await db
    .select()
    .from(productReviews)
    .where(eq(productReviews.id, body.id))
    .limit(1);
  if (!row) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  await db
    .update(productReviews)
    .set({ status: body.status })
    .where(eq(productReviews.id, body.id));
  await refreshProductReviewCount(row.productId);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const [row] = await db
    .select()
    .from(productReviews)
    .where(eq(productReviews.id, id))
    .limit(1);
  if (!row) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  await db.delete(productReviews).where(eq(productReviews.id, id));
  await refreshProductReviewCount(row.productId);
  return NextResponse.json({ ok: true });
}

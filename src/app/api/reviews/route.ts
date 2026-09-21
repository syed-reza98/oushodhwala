import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { and, desc, eq, or } from "drizzle-orm";
import { auth } from "@/server/auth/config";
import { db } from "@/server/db";
import { orderItems, orders, productReviews, products, profiles } from "@/server/db/schema";
import { refreshProductReviewCount } from "@/server/services/reviews";

export const dynamic = "force-dynamic";

/** Public list for a product (approved + caller's own) */
export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 });
  }

  const session = await auth();
  const userId = session?.user?.id;

  const rows = await db
    .select()
    .from(productReviews)
    .where(
      and(
        eq(productReviews.productId, productId),
        userId
          ? or(eq(productReviews.status, "approved"), eq(productReviews.userId, userId))
          : eq(productReviews.status, "approved"),
      ),
    )
    .orderBy(desc(productReviews.createdAt))
    .limit(50);

  return NextResponse.json({
    items: rows.map((r) => ({
      id: r.id,
      user_id: r.userId,
      author_name: r.authorName,
      rating: r.rating,
      comment: r.comment,
      verified: r.verified,
      status: r.status,
      created_at: r.createdAt,
    })),
  });
}

/** Upsert review for signed-in user */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await req.json()) as {
    productId?: string;
    rating?: number;
    comment?: string;
  };
  if (!body.productId || !body.rating || body.rating < 1 || body.rating > 5) {
    return NextResponse.json({ error: "productId and rating 1-5 required" }, { status: 400 });
  }

  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.id, body.productId))
    .limit(1);
  if (!product) {
    return NextResponse.json({ error: "PRODUCT_NOT_FOUND" }, { status: 404 });
  }

  const [profile] = await db
    .select({ fullName: profiles.fullName })
    .from(profiles)
    .where(eq(profiles.id, session.user.id))
    .limit(1);

  const purchased = await db
    .select({ id: orderItems.id })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(
      and(
        eq(orders.userId, session.user.id),
        eq(orderItems.productId, body.productId),
        eq(orders.status, "delivered"),
      ),
    )
    .limit(1);
  const verified = purchased.length > 0;

  const [existing] = await db
    .select()
    .from(productReviews)
    .where(
      and(
        eq(productReviews.productId, body.productId),
        eq(productReviews.userId, session.user.id),
      ),
    )
    .limit(1);

  const authorName = profile?.fullName || session.user.name || session.user.email || null;

  if (existing) {
    await db
      .update(productReviews)
      .set({
        rating: body.rating,
        comment: body.comment?.trim() || null,
        authorName,
        verified,
        status: "pending",
      })
      .where(eq(productReviews.id, existing.id));
    return NextResponse.json({ ok: true, id: existing.id });
  }

  const id = randomUUID();
  await db.insert(productReviews).values({
    id,
    productId: body.productId,
    userId: session.user.id,
    authorName,
    rating: body.rating,
    comment: body.comment?.trim() || null,
    verified,
    status: "pending",
  });
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const [row] = await db
    .select()
    .from(productReviews)
    .where(and(eq(productReviews.id, id), eq(productReviews.userId, session.user.id)))
    .limit(1);
  if (!row) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  await db.delete(productReviews).where(eq(productReviews.id, id));

  await refreshProductReviewCount(row.productId);
  return NextResponse.json({ ok: true });
}

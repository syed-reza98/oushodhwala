import { and, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { productReviews, products } from "@/server/db/schema";

export async function refreshProductReviewCount(productId: string) {
  const [agg] = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(productReviews)
    .where(
      and(eq(productReviews.productId, productId), eq(productReviews.status, "approved")),
    );
  await db
    .update(products)
    .set({ reviews: Number(agg?.count ?? 0) })
    .where(eq(products.id, productId));
}

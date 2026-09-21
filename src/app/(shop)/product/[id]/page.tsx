import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductById } from "@/server/actions/catalog";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  return (
    <div className="pt-4">
      <Link href="/products" className="text-xs font-semibold text-primary">
        ← Products
      </Link>
      <h1 className="mt-3 font-display text-xl font-extrabold text-navy">
        {product.name}
      </h1>
      <p className="mt-1 text-xs text-muted-foreground">
        {[product.generic, product.strength, product.form]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <p className="mt-4 text-lg font-bold text-primary">
        ৳{Number(product.price).toFixed(2)}
      </p>
      {product.description && (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          {product.description}
        </p>
      )}
      <p className="mt-4 text-xs text-muted-foreground">Stock: {product.stock}</p>
    </div>
  );
}

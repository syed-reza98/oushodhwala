import { Suspense } from "react";
import ProductsClient from "./ProductsClient";

export default function ProductsPage() {
  return (
    <Suspense fallback={<p className="pt-8 text-center text-sm text-muted-foreground">Loading…</p>}>
      <ProductsClient />
    </Suspense>
  );
}

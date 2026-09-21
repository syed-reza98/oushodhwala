"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function SharedProductRedirect() {
  const router = useRouter();
  const sp = useSearchParams();
  const id = sp.get("id") ?? sp.get("product") ?? "";

  useEffect(() => {
    if (id) router.replace(`/product/${encodeURIComponent(id)}`);
    else router.replace("/products");
  }, [id, router]);

  return <p className="pt-16 text-center text-sm text-muted-foreground">Redirecting…</p>;
}

export default function SharedProductPage() {
  return (
    <Suspense fallback={<p className="pt-16 text-center text-sm text-muted-foreground">Loading…</p>}>
      <SharedProductRedirect />
    </Suspense>
  );
}

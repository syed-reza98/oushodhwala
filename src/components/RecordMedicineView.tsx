"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

/** Records a medicine/product view for logged-in users (recent medicines list). */
export function RecordMedicineView({ productId }: { productId: string }) {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !productId) return;
    void fetch("/api/favorites", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "view", productId }),
    }).catch(() => {
      /* ignore — view tracking is best-effort */
    });
  }, [user, productId]);

  return null;
}

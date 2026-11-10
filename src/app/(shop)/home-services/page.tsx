import { Suspense } from "react";
import HomeServicesClient from "./HomeServicesClient";

export default function HomeServicesPage() {
  return (
    <Suspense fallback={<p className="pt-8 text-center text-sm text-muted-foreground">Loading…</p>}>
      <HomeServicesClient />
    </Suspense>
  );
}

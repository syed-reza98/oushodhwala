import Link from "next/link";
import { getCatalog } from "@/server/actions/catalog";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const rows = await getCatalog(60);
  return (
    <div className="pt-4">
      <h1 className="font-display text-lg font-extrabold text-navy">Products</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        Loaded from XAMPP MySQL via Drizzle ({rows.length} items)
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((p) => (
          <li
            key={p.id}
            className="rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-card)]"
          >
            <Link href={`/product/${p.id}`} className="block">
              <p className="text-sm font-bold text-foreground">{p.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {p.generic || p.brand || "—"}
              </p>
              <p className="mt-2 text-sm font-semibold text-primary">
                ৳{Number(p.price).toFixed(2)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

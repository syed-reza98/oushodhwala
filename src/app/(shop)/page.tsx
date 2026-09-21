import Link from "next/link";
import { getCatalog } from "@/server/actions/catalog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await getCatalog(8);
  return (
    <div className="pt-4">
      <h1 className="font-display text-2xl font-extrabold text-navy">ঔষধওয়ালা</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Next.js 16 + XAMPP MySQL — migration in progress. UI chrome preserved.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/products"
          className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
        >
          Browse products
        </Link>
        <Link
          href="/about"
          className="rounded-lg border border-border px-4 py-2 text-xs font-semibold"
        >
          About
        </Link>
      </div>
      <h2 className="mt-8 font-display text-lg font-extrabold text-navy">
        Featured
      </h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((p) => (
          <li
            key={p.id}
            className="rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-card)]"
          >
            <Link href={`/product/${p.id}`}>
              <p className="text-sm font-bold">{p.name}</p>
              <p className="mt-1 text-sm font-semibold text-primary">
                ৳{Number(p.price).toFixed(2)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

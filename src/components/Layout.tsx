"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";

/** Slim layout during migration debug — full Layout restored after auth/menu fixes. */
export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link href="/" className="flex items-center" aria-label="Oushodhwala">
            <BrandLogo size={36} eager />
          </Link>
          <nav className="ml-auto flex gap-3 text-xs font-semibold">
            <Link href="/products" className="text-primary">
              Products
            </Link>
            <Link href="/about">About</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-16">{children}</main>
    </div>
  );
}

export function SectionTitle({
  title,
  to,
  label,
}: {
  title: string;
  to?: string;
  label?: string;
}) {
  return (
    <div className="mb-4 flex items-end">
      <div className="min-w-0">
        <h2 className="truncate font-display text-lg font-extrabold text-navy">
          {title}
        </h2>
        <span className="mt-1 block h-1 w-10 rounded-full bg-primary" />
      </div>
      {to && (
        <Link
          href={to}
          className="ml-auto text-xs font-semibold text-primary"
        >
          {label ?? "See all"}
        </Link>
      )}
    </div>
  );
}

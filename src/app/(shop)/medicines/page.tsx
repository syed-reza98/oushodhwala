"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCatalog } from "@/lib/catalog-db";
import { useT } from "@/lib/i18n";
import { matchesQuery } from "@/lib/bn-search";

const PAGE = 50;

export default function MedicinesPage() {
  const t = useT();
  const { products } = useCatalog();
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("");
  const [company, setCompany] = useState("");
  const [page, setPage] = useState(0);

  const groups = useMemo(
    () =>
      Array.from(new Set(products.map((p) => p.therapeuticClass || p.category).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [products],
  );
  const companies = useMemo(
    () => Array.from(new Set(products.map((p) => p.manufacturer || p.brand).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [products],
  );

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (group && (p.therapeuticClass || p.category) !== group) return false;
      if (company && (p.manufacturer || p.brand) !== company) return false;
      return matchesQuery(q, p.name, p.en, p.generic, p.brand);
    });
  }, [products, q, group, company]);

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const rows = filtered.slice(page * PAGE, page * PAGE + PAGE);

  return (
    <div className="pt-4 pb-10">
      <h1 className="text-base font-bold">
        {t("ঔষধের তালিকা", "Medicine directory")}{" "}
        <span className="text-xs font-normal text-muted-foreground">
          ({t.n(total)} {t("টি", "items")})
        </span>
      </h1>
      <p className="mt-1 text-xs text-muted-foreground">
        {t(
          "গ্রুপ, কম্পোজিশন (জেনেরিক) ও উৎপাদনকারী কোম্পানিসহ সম্পূর্ণ তালিকা।",
          "Full list with drug group, composition (generic) and manufacturer.",
        )}
      </p>

      <div className="mt-3 grid gap-2 rounded-xl border border-border bg-card p-3 sm:grid-cols-2 lg:grid-cols-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(0);
          }}
          className="flex gap-2"
        >
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            placeholder={t("নাম / জেনেরিক দিয়ে খুঁজুন", "Search name / generic")}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
          />
        </form>
        <select
          value={group}
          onChange={(e) => {
            setGroup(e.target.value);
            setPage(0);
          }}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
        >
          <option value="">{t("সব গ্রুপ", "All groups")}</option>
          {groups.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <select
          value={company}
          onChange={(e) => {
            setCompany(e.target.value);
            setPage(0);
          }}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
        >
          <option value="">{t("সব কোম্পানি", "All companies")}</option>
          {companies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <Link
          href="/products"
          className="grid place-items-center rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-primary"
        >
          {t("শপে দেখুন", "Shop view")}
        </Link>
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[860px] text-left text-xs">
          <thead className="bg-muted/50 text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">{t("ঔষধের নাম", "Medicine")}</th>
              <th className="px-3 py-2">{t("কম্পোজিশন", "Composition")}</th>
              <th className="px-3 py-2">{t("গ্রুপ", "Group")}</th>
              <th className="px-3 py-2">{t("কোম্পানি", "Company")}</th>
              <th className="px-3 py-2 text-right">{t("দাম", "Price")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border align-top">
                <td className="px-3 py-2">
                  <Link href={`/medicine/${r.id}`} className="font-semibold text-primary">
                    {r.en || r.name}
                  </Link>
                  <div className="text-[11px] text-muted-foreground">
                    {[r.strength, r.form, r.pack].filter(Boolean).join(" · ")}
                    {r.rx ? " · Rx" : ""}
                  </div>
                </td>
                <td className="px-3 py-2">{r.generic || "—"}</td>
                <td className="px-3 py-2">{r.therapeuticClass || r.category || "—"}</td>
                <td className="px-3 py-2">{r.manufacturer || r.brand || "—"}</td>
                <td className="px-3 py-2 text-right font-semibold">{t.money(r.price)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                  {t("কোনো ঔষধ পাওয়া যায়নি", "No medicines found")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-center gap-3">
        <button
          type="button"
          disabled={page === 0}
          onClick={() => setPage((n) => Math.max(0, n - 1))}
          className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold disabled:opacity-40"
        >
          {t("আগের", "Previous")}
        </button>
        <span className="text-xs text-muted-foreground">
          {t("পৃষ্ঠা", "Page")} {t.n(page + 1)} / {t.n(pages)}
        </span>
        <button
          type="button"
          disabled={(page + 1) * PAGE >= total}
          onClick={() => setPage((n) => n + 1)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold disabled:opacity-40"
        >
          {t("পরের", "Next")}
        </button>
      </div>
    </div>
  );
}

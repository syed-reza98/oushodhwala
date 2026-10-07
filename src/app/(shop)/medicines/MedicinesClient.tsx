"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { searchProducts, getMedicineFilters } from "@/server/actions/catalog";
import { mapProduct } from "@/lib/catalog-db";
import { useT } from "@/lib/i18n";

const PAGE = 50;

export default function MedicinesClient() {
  const t = useT();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState("");
  const [inputQ, setInputQ] = useState("");
  const [group, setGroup] = useState("");
  const [company, setCompany] = useState("");
  const [page, setPage] = useState(0);

  const { data: filtersData } = useQuery({
    queryKey: ["medicine-filters"],
    queryFn: () => getMedicineFilters(),
    staleTime: 600_000,
  });

  const { data: searchResult, isFetching } = useQuery({
    queryKey: ["medicines-directory", q, company, group, page],
    queryFn: () =>
      searchProducts({
        q,
        company,
        group,
        offset: page * PAGE,
        limit: PAGE,
      }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const rows = (searchResult?.rows ?? []).map(
    (r) => mapProduct(r as unknown as Parameters<typeof mapProduct>[0]),
  );
  const total = searchResult?.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));

  const companies = filtersData?.companies ?? [];
  const groups = filtersData?.groups ?? [];

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
            startTransition(() => {
              setQ(inputQ);
              setPage(0);
            });
          }}
          className="flex gap-2"
        >
          <input
            value={inputQ}
            onChange={(e) => setInputQ(e.target.value)}
            placeholder={t("নাম / জেনেরিক দিয়ে খুঁজুন", "Search name / generic")}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
          />
          <button
            type="submit"
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            {t("খুঁজুন", "Search")}
          </button>
        </form>

        <select
          value={group}
          onChange={(e) => {
            setGroup(e.target.value);
            setPage(0);
          }}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-xs truncate"
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
          className="rounded-md border border-border bg-background px-2 py-1.5 text-xs truncate"
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
          className="grid place-items-center rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-primary hover:bg-muted/30 transition"
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
              <tr key={r.id} className="border-t border-border align-top hover:bg-muted/20 transition">
                <td className="px-3 py-2">
                  <Link href={`/medicine/${r.id}`} className="font-semibold text-primary hover:underline">
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
            {!isFetching && rows.length === 0 && (
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
          disabled={page === 0 || isFetching}
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
          disabled={(page + 1) * PAGE >= total || isFetching}
          onClick={() => setPage((n) => n + 1)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold disabled:opacity-40"
        >
          {t("পরের", "Next")}
        </button>
      </div>
    </div>
  );
}

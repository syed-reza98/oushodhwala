"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

export function StockCountPanel() {
  const t = useT();
  const qc = useQueryClient();
  const [productId, setProductId] = useState("");
  const [countedQty, setCountedQty] = useState("");
  const [note, setNote] = useState("");

  const productsQ = useQuery({
    queryKey: ["admin-stock-for-count"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stock", { cache: "no-store" });
      if (!res.ok) throw new Error("stock failed");
      return res.json() as Promise<{ products: { id: string; name: string; stock: number }[] }>;
    },
  });

  const countsQ = useQuery({
    queryKey: ["admin-stock-counts"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stock-counts", { cache: "no-store" });
      if (!res.ok) throw new Error("counts failed");
      return res.json() as Promise<{
        items: {
          id: string;
          countNo: string;
          status: string;
          note: string;
          createdAt: string;
          items: { productName: string; systemQty: number; countedQty: number }[];
        }[];
      }>;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/stock-counts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          note,
          items: [{ productId, countedQty: Number(countedQty) }],
        }),
      });
      if (!res.ok) throw new Error("create failed");
    },
    onSuccess: () => {
      setProductId("");
      setCountedQty("");
      setNote("");
      void qc.invalidateQueries({ queryKey: ["admin-stock-counts"] });
      toast.success(t("কাউন্ট তৈরি", "Count created"));
    },
    onError: () => toast.error(t("ব্যর্থ", "Failed")),
  });

  const apply = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/admin/stock-counts", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "apply", id }),
      });
      if (!res.ok) throw new Error("apply failed");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-stock-counts"] });
      void qc.invalidateQueries({ queryKey: ["admin-stock"] });
      toast.success(t("কাউন্ট প্রয়োগ", "Count applied"));
    },
    onError: () => toast.error(t("প্রয়োগ ব্যর্থ", "Apply failed")),
  });

  return (
    <div className="space-y-3">
      <div className="grid gap-2 rounded-2xl border border-border bg-card p-4 sm:grid-cols-4">
        <select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm"
        >
          <option value="">{t("প্রোডাক্ট", "Product")}</option>
          {(productsQ.data?.products ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.stock})
            </option>
          ))}
        </select>
        <input
          value={countedQty}
          onChange={(e) => setCountedQty(e.target.value)}
          placeholder={t("গণনা", "Counted")}
          className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("নোট", "Note")}
          className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm"
        />
        <button
          type="button"
          disabled={!productId || countedQty === "" || create.isPending}
          onClick={() => create.mutate()}
          className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {t("ড্রাফট কাউন্ট", "Draft count")}
        </button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">{t("নম্বর", "No")}</th>
              <th className="px-3 py-2">{t("স্ট্যাটাস", "Status")}</th>
              <th className="px-3 py-2">{t("আইটেম", "Items")}</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {(countsQ.data?.items ?? []).map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-[10px]">{c.countNo}</td>
                <td className="px-3 py-2">{c.status}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {c.items.map((i) => `${i.productName}: ${i.systemQty}→${i.countedQty}`).join(", ")}
                </td>
                <td className="px-3 py-2">
                  {c.status === "draft" && (
                    <button
                      type="button"
                      onClick={() => apply.mutate(c.id)}
                      className="rounded-md border border-border px-2 py-1 text-[10px]"
                    >
                      {t("প্রয়োগ", "Apply")}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ApiHubPanel() {
  const t = useT();
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", url: "", method: "GET", grp: "internal" });

  const q = useQuery({
    queryKey: ["admin-api-hub"],
    queryFn: async () => {
      const res = await fetch("/api/admin/api-hub", { cache: "no-store" });
      if (!res.ok) throw new Error("hub failed");
      return res.json() as Promise<{
        endpoints: {
          id: string;
          name: string;
          method: string;
          url: string;
          lastOk: boolean | null;
          lastStatus: number | null;
          lastMs: number | null;
        }[];
        logs: { id: string; name: string; ok: boolean; statusCode: number | null; durationMs: number; createdAt: string }[];
        integrations: { id: string; provider: string; name: string; active: boolean }[];
      }>;
    },
  });

  const upsert = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/api-hub", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "upsert_endpoint", ...form }),
      });
      if (!res.ok) throw new Error("upsert failed");
    },
    onSuccess: () => {
      setForm({ name: "", url: "", method: "GET", grp: "internal" });
      void qc.invalidateQueries({ queryKey: ["admin-api-hub"] });
      toast.success(t("এন্ডপয়েন্ট সেভ", "Endpoint saved"));
    },
  });

  const run = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/admin/api-hub", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "run_test", id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "test failed");
      return data;
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["admin-api-hub"] });
      toast.success(t(`টেস্ট ${data.ok ? "OK" : "FAIL"} ${data.statusCode ?? ""}`, `Test ${data.ok ? "OK" : "FAIL"} ${data.statusCode ?? ""}`));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="grid gap-2 rounded-2xl border border-border bg-card p-4 sm:grid-cols-5">
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder={t("নাম", "Name")}
          className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm"
        />
        <input
          value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
          placeholder="URL"
          className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm sm:col-span-2"
        />
        <select
          value={form.method}
          onChange={(e) => setForm({ ...form, method: e.target.value })}
          className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm"
        >
          {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!form.name || !form.url || upsert.isPending}
          onClick={() => upsert.mutate()}
          className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {t("সেভ", "Save")}
        </button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">{t("নাম", "Name")}</th>
              <th className="px-3 py-2">URL</th>
              <th className="px-3 py-2">{t("শেষ", "Last")}</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {(q.data?.endpoints ?? []).map((e) => (
              <tr key={e.id} className="border-t border-border">
                <td className="px-3 py-2 font-semibold">
                  {e.method} {e.name}
                </td>
                <td className="max-w-[280px] truncate px-3 py-2 font-mono text-[10px]">{e.url}</td>
                <td className="px-3 py-2 text-[10px]">
                  {e.lastStatus ?? "—"} {e.lastMs != null ? `${e.lastMs}ms` : ""}
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => run.mutate(e.id)}
                    className="rounded-md border border-border px-2 py-1 text-[10px]"
                  >
                    {t("টেস্ট", "Test")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-2xl border border-border bg-card p-3">
        <p className="mb-2 text-[11px] font-bold">{t("সাম্প্রতিক লগ", "Recent logs")}</p>
        <ul className="max-h-40 space-y-1 overflow-y-auto text-[11px]">
          {(q.data?.logs ?? []).map((l) => (
            <li key={l.id} className="flex justify-between border-b border-border/50 py-1">
              <span>
                {l.name} {l.ok ? "✓" : "✗"} {l.statusCode}
              </span>
              <span className="text-muted-foreground">{l.durationMs}ms</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function ErpAuditPanel() {
  const t = useT();
  const [q, setQ] = useState("");
  const listQ = useQuery({
    queryKey: ["admin-audit", q],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/admin/audit?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error("audit failed");
      return res.json() as Promise<{
        items: { id: string; tableName: string; action: string; label: string; recordId: string; createdAt: string }[];
      }>;
    },
  });

  return (
    <div className="space-y-3">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("সার্চ…", "Search…")}
        className="min-h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
      />
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">{t("টেবিল", "Table")}</th>
              <th className="px-3 py-2">{t("অ্যাকশন", "Action")}</th>
              <th className="px-3 py-2">{t("লেবেল", "Label")}</th>
              <th className="px-3 py-2">{t("সময়", "When")}</th>
            </tr>
          </thead>
          <tbody>
            {(listQ.data?.items ?? []).map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-[10px]">{r.tableName}</td>
                <td className="px-3 py-2">{r.action}</td>
                <td className="px-3 py-2">{r.label || r.recordId || "—"}</td>
                <td className="px-3 py-2 text-[10px]">{r.createdAt?.slice(0, 19)}</td>
              </tr>
            ))}
            {!listQ.isLoading && (listQ.data?.items?.length ?? 0) === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                  {t("কোনো অডিট লগ নেই", "No audit logs yet")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AccountsReceivablePanel() {
  const t = useT();
  const q = useQuery({
    queryKey: ["admin-accounts"],
    queryFn: async () => {
      const res = await fetch("/api/admin/accounts", { cache: "no-store" });
      if (!res.ok) throw new Error("accounts failed");
      return res.json() as Promise<{
        summary: { orders: number; appointments: number; diagnostics: number; totalDue: number };
        orders: { id: string; orderNo: string; customerName: string | null; total: number; paymentStatus: string | null }[];
        appointments: { id: string; invoiceNo: string; patientName: string; fee: number; paymentStatus: string }[];
        diagnostics: { id: string; bookingNo?: string; customerName?: string; total: number; paymentStatus: string }[];
      }>;
    },
  });

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { k: t("অর্ডার", "Orders"), v: q.data?.summary.orders },
          { k: t("অ্যাপয়েন্টমেন্ট", "Appointments"), v: q.data?.summary.appointments },
          { k: t("ডায়াগনস্টিক", "Diagnostics"), v: q.data?.summary.diagnostics },
          { k: t("মোট বাকি", "Total due"), v: q.data?.summary.totalDue },
        ].map((x) => (
          <div key={x.k} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-[11px] uppercase text-muted-foreground">{x.k}</p>
            <p className="mt-1 text-lg font-bold text-navy">
              {typeof x.v === "number" && x.k.includes("বাকি") || x.k.includes("due")
                ? `৳${Number(x.v ?? 0).toLocaleString()}`
                : Number(x.v ?? 0)}
            </p>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">{t("অর্ডার", "Order")}</th>
              <th className="px-3 py-2">{t("গ্রাহক", "Customer")}</th>
              <th className="px-3 py-2 text-right">{t("টাকা", "Amount")}</th>
              <th className="px-3 py-2">{t("পেমেন্ট", "Payment")}</th>
            </tr>
          </thead>
          <tbody>
            {(q.data?.orders ?? []).map((o) => (
              <tr key={o.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-[10px]">{o.orderNo}</td>
                <td className="px-3 py-2">{o.customerName || "—"}</td>
                <td className="px-3 py-2 text-right">৳{o.total}</td>
                <td className="px-3 py-2">{o.paymentStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function LabelsPanel() {
  const t = useT();
  const [q, setQ] = useState("");
  const listQ = useQuery({
    queryKey: ["admin-labels", q],
    enabled: q.trim().length > 1,
    queryFn: async () => {
      const res = await fetch(`/api/admin/labels?q=${encodeURIComponent(q)}`, { cache: "no-store" });
      if (!res.ok) throw new Error("labels failed");
      return res.json() as Promise<{
        items: { id: string; name: string; price: number; pack: string; brand: string; stock: number }[];
      }>;
    },
  });

  return (
    <div className="space-y-3">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("প্রোডাক্ট সার্চ…", "Search products…")}
        className="min-h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
      />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {(listQ.data?.items ?? []).map((p) => (
          <div key={p.id} className="rounded-xl border border-border bg-card p-3 print:border-black">
            <p className="text-sm font-bold text-navy">{p.name}</p>
            <p className="text-[10px] text-muted-foreground">
              {p.brand} · {p.pack}
            </p>
            <p className="mt-2 text-base font-extrabold">৳{p.price}</p>
            <button
              type="button"
              onClick={() => window.print()}
              className="mt-2 rounded-md border border-border px-2 py-1 text-[10px] font-semibold"
            >
              {t("প্রিন্ট লেবেল", "Print label")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FinanceExtraPanel({ kind }: { kind: "daybook" | "financials" | "party" }) {
  const t = useT();
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [partyType, setPartyType] = useState<"customer" | "supplier">("customer");
  const [partyId, setPartyId] = useState("");

  const q = useQuery({
    queryKey: ["admin-finance-extra", kind, from, to, partyType, partyId],
    queryFn: async () => {
      const params = new URLSearchParams({ kind, from, to });
      if (kind === "party") {
        params.set("partyType", partyType);
        if (partyId) params.set("id", partyId);
      }
      const res = await fetch(`/api/admin/finance-extra?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error("finance-extra failed");
      return res.json();
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded-lg border border-border px-2 text-sm" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 rounded-lg border border-border px-2 text-sm" />
        {kind === "party" && (
          <>
            <select
              value={partyType}
              onChange={(e) => setPartyType(e.target.value as "customer" | "supplier")}
              className="h-10 rounded-lg border border-border px-2 text-sm"
            >
              <option value="customer">{t("গ্রাহক", "Customer")}</option>
              <option value="supplier">{t("সাপ্লায়ার", "Supplier")}</option>
            </select>
            <input
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
              placeholder="id"
              className="h-10 rounded-lg border border-border px-2 text-sm"
            />
          </>
        )}
      </div>
      <pre className="max-h-[480px] overflow-auto rounded-2xl border border-border bg-card p-4 text-[11px]">
        {JSON.stringify(q.data ?? { loading: q.isLoading }, null, 2)}
      </pre>
    </div>
  );
}

export function ErpRolesPanel() {
  const t = useT();
  const qc = useQueryClient();
  const staffQ = useQuery({
    queryKey: ["admin-staff-erproles"],
    queryFn: async () => {
      const res = await fetch("/api/admin/staff?kind=staff", { cache: "no-store" });
      if (!res.ok) throw new Error("staff failed");
      return res.json() as Promise<{
        items: { userId: string; email: string; name: string; roles: string[] }[];
      }>;
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role, grant }: { userId: string; role: string; grant: boolean }) => {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, role, grant }),
      });
      if (!res.ok) throw new Error("role failed");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-staff-erproles"] });
      toast.success(t("ভূমিকা আপডেট", "Role updated"));
    },
    onError: () => toast.error(t("ব্যর্থ", "Failed")),
  });

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[560px] text-left text-xs">
        <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2">{t("ইউজার", "User")}</th>
            <th className="px-3 py-2">{t("ভূমিকা", "Roles")}</th>
            <th className="px-3 py-2">{t("ERP ম্যানেজার", "Set ERP manager")}</th>
          </tr>
        </thead>
        <tbody>
          {(staffQ.data?.items ?? []).map((u) => (
            <tr key={u.userId} className="border-t border-border">
              <td className="px-3 py-2">
                <p className="font-semibold">{u.name || u.email}</p>
                <p className="text-[10px] text-muted-foreground">{u.email}</p>
              </td>
              <td className="px-3 py-2 font-mono text-[10px]">{u.roles.join(", ")}</td>
              <td className="px-3 py-2">
                <button
                  type="button"
                  onClick={() =>
                    setRole.mutate({
                      userId: u.userId,
                      role: "erp_manager",
                      grant: !u.roles.includes("erp_manager"),
                    })
                  }
                  className="rounded-md border border-border px-2 py-1 text-[10px]"
                >
                  {u.roles.includes("erp_manager") ? t("সরান", "Revoke") : "erp_manager"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TestsPanel() {
  const t = useT();
  const suites = [
    { id: "browse", name: "Browse catalog", status: "ready" },
    { id: "cart", name: "Cart checkout", status: "ready" },
    { id: "authz", name: "Admin authz", status: "ready" },
    { id: "account", name: "Account appointment", status: "ready" },
  ];
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {t(
          "Playwright স্যুট — লোকালে npm run test:e2e চালান।",
          "Playwright suites — run npm run test:e2e locally.",
        )}
      </p>
      <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
        {suites.map((s) => (
          <li key={s.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="font-semibold">{s.name}</span>
            <span className="text-[11px] text-muted-foreground">{s.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

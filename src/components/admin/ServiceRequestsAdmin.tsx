"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { HomeIcon, Search, CheckCircle2, Clock, Calendar, Phone, User, Check, X } from "lucide-react";
import { useT } from "@/lib/i18n";

const STATUSES = ["all", "requested", "confirmed", "assigned", "in_progress", "completed", "cancelled"] as const;

const STATUS_LABELS: Record<string, { bn: string; en: string; cls: string }> = {
  requested: { bn: "অনুরোধ গৃহীত", en: "Requested", cls: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  confirmed: { bn: "নিশ্চিত", en: "Confirmed", cls: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  assigned: { bn: "নিয়োগ হয়েছে", en: "Assigned", cls: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
  in_progress: { bn: "সেবা চলছে", en: "In Progress", cls: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30" },
  completed: { bn: "সম্পন্ন", en: "Completed", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  cancelled: { bn: "বাতিল", en: "Cancelled", cls: "bg-rose-500/10 text-rose-600 border-rose-500/30" },
};

type ServiceReq = {
  id: string;
  requestNo: string;
  serviceName: string;
  serviceSlug: string;
  patientName: string;
  phone: string;
  fee: number;
  status: string;
  scheduledDate: string;
  slot: string;
  createdAt: string;
};

export function ServiceRequestsAdmin() {
  const t = useT();
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-service-requests"],
    queryFn: async () => {
      const res = await fetch("/api/admin/bookings", { cache: "no-store" });
      if (!res.ok) throw new Error("Load failed");
      const json = await res.json();
      return (json.services || []) as ServiceReq[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "service", id, status }),
      });
      if (!res.ok) throw new Error("Update failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-service-requests"] });
      toast.success(t("স্ট্যাটাস আপডেট সম্পন্ন", "Status updated successfully"));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const filtered = (data || []).filter((r) => {
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        r.requestNo.toLowerCase().includes(q) ||
        r.patientName.toLowerCase().includes(q) ||
        r.serviceName.toLowerCase().includes(q) ||
        r.phone.includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <HomeIcon className="h-5 w-5 text-primary" />
            {t("হোম হেলথকেয়ার সেবা অনুরোধ", "Home Healthcare Service Requests")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {t("নার্সিং, ফিজিওথেরাপি ও হোম কেয়ার বুকিং ব্যবস্থাপনা", "Manage in-home nursing, physio, and caregiver bookings")}
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t("অনুরোধ নং, রোগী বা ফোন...", "Search request no, patient, phone...")}
            className="w-full rounded-xl border border-border bg-card pl-8 pr-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-border pb-3">
        {STATUSES.map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setFilterStatus(st)}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
              filterStatus === st
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            {st === "all" ? t("সব অনুরোধ", "All") : t(STATUS_LABELS[st]?.bn || st, STATUS_LABELS[st]?.en || st)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-xs text-muted-foreground">{t("লোড হচ্ছে...", "Loading...")}</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-xs text-muted-foreground">{t("কোনো সেবার অনুরোধ পাওয়া যায়নি।", "No service requests found.")}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((req) => {
            const badge = STATUS_LABELS[req.status] || { bn: req.status, en: req.status, cls: "bg-secondary text-foreground" };
            return (
              <div
                key={req.id}
                className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-2xs hover:border-primary/40 transition"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <span className="font-mono text-xs font-bold text-foreground">
                      #{req.requestNo}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge.cls}`}>
                      {t(badge.bn, badge.en)}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs">
                    <p className="font-bold text-foreground text-sm">{req.serviceName}</p>
                    <p className="text-muted-foreground flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-primary" />
                      <span>{req.patientName}</span>
                    </p>
                    <p className="text-muted-foreground flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-primary" />
                      <a href={`tel:${req.phone}`} className="hover:underline">{req.phone}</a>
                    </p>
                    <p className="text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      <span>{req.scheduledDate} · {req.slot}</span>
                    </p>
                    <p className="font-bold text-primary mt-2">
                      {t("ফি:", "Fee:")} {t.money(req.fee)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/50">
                  <label className="text-[10px] font-bold text-muted-foreground block mb-1">
                    {t("স্ট্যাটাস পরিবর্তন:", "Change Status:")}
                  </label>
                  <select
                    value={req.status}
                    disabled={updateStatus.isPending}
                    onChange={(e) => updateStatus.mutate({ id: req.id, status: e.target.value })}
                    className="w-full rounded-lg border border-border bg-secondary/50 px-2.5 py-1 text-xs font-semibold text-foreground focus:border-primary focus:outline-hidden"
                  >
                    <option value="requested">{t("অনুরোধ গৃহীত", "Requested")}</option>
                    <option value="confirmed">{t("নিশ্চিত", "Confirmed")}</option>
                    <option value="assigned">{t("নিয়োগ হয়েছে", "Assigned")}</option>
                    <option value="in_progress">{t("সেবা চলছে", "In Progress")}</option>
                    <option value="completed">{t("সম্পন্ন", "Completed")}</option>
                    <option value="cancelled">{t("বাতিল", "Cancelled")}</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

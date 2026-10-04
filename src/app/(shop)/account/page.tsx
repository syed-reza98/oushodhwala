"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LogOut,
  MapPin,
  FileText,
  Heart,
  Bell,
  HelpCircle,
  FlaskConical,
  ShieldCheck,
  CalendarDays,
  Pill,
  Activity,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/hooks/useAuth";
import { countMyOrders } from "@/server/actions/orders";
import { countMyPrescriptions, listMyPrescriptions } from "@/server/actions/prescriptions";
import { listMyAppointments } from "@/server/actions/appointments";
import { useT } from "@/lib/i18n";

export default function AccountPage() {
  const t = useT();
  const { addresses, addAddress, removeAddress, activeAddress, setActiveAddress, wishlist } =
    useStore();
  const { user, profile, isAdmin, loading, signOut } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [addr, setAddr] = useState({ label: "", area: "", details: "", phone: "" });

  const { data: orderCount } = useQuery({
    queryKey: ["my-order-count"],
    enabled: !!user,
    queryFn: () => countMyOrders(),
  });

  const { data: rxCount } = useQuery({
    queryKey: ["my-prescription-count"],
    enabled: !!user,
    queryFn: () => countMyPrescriptions(),
  });

  const { data: myPrescriptions } = useQuery({
    queryKey: ["my-prescriptions-list"],
    enabled: !!user,
    queryFn: () => listMyPrescriptions(),
  });

  const { data: myAppointments } = useQuery({
    queryKey: ["my-appointments-list"],
    enabled: !!user,
    queryFn: () => listMyAppointments(),
  });

  if (loading) {
    return <p className="pt-16 text-center text-sm text-muted-foreground">{t("লোড হচ্ছে...", "Loading...")}</p>;
  }

  if (!user) {
    return (
      <div className="pt-16 text-center">
        <p className="text-4xl">👤</p>
        <h1 className="mt-3 text-base font-bold">{t("একাউন্টে প্রবেশ করুন", "Sign in to your account")}</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {t(
            "অর্ডার, প্রেসক্রিপশন ও নোটিফিকেশন দেখতে লগইন করুন।",
            "Log in to view orders, prescriptions and notifications.",
          )}
        </p>
        <Link
          href="/auth"
          className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
        >
          {t("লগইন / রেজিস্ট্রেশন", "Login / Register")}
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-4">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-secondary text-xl">👤</span>
        <div>
          <p className="text-sm font-bold">{profile?.name || user.email}</p>
          <p className="text-xs text-muted-foreground">{profile?.phone || user.email}</p>
        </div>
        <button
          onClick={() => {
            void (async () => {
              qc.clear();
              await signOut();
              router.push("/");
            })();
          }}
          className="ml-auto flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold"
        >
          <LogOut className="h-3.5 w-3.5" /> {t("লগআউট", "Log out")}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat icon={FileText} label={t("অর্ডার", "Orders")} v={t.n(orderCount ?? 0)} href="/orders" />
        <Stat icon={Heart} label={t("উইশলিস্ট", "Wishlist")} v={t.n(wishlist.length)} href="/wishlist" />
        <Stat
          icon={FlaskConical}
          label={t("প্রেসক্রিপশন", "Prescriptions")}
          v={t.n(rxCount ?? 0)}
          href="/prescription"
        />
        <Stat
          icon={CalendarDays}
          label={t("অ্যাপয়েন্টমেন্ট", "Appointments")}
          v={t.n(myAppointments?.length ?? 0)}
          href="/appointments"
        />
      </div>

      {isAdmin && (
        <Link
          href="/admin"
          className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-navy px-4 py-3 text-xs font-bold text-navy-foreground"
        >
          <ShieldCheck className="h-4 w-4" /> {t("অ্যাডমিন ড্যাশবোর্ড", "Admin dashboard")}
        </Link>
      )}

      {/* My Prescriptions Section */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold flex items-center gap-1.5">
            <FlaskConical className="h-4 w-4 text-primary" />
            {t("আমার প্রেসক্রিপশনসমূহ", "My Prescriptions")}
          </h2>
          <Link
            href="/prescription"
            className="text-xs font-semibold text-primary hover:underline"
          >
            + {t("নতুন আপলোড করুন", "Upload new")}
          </Link>
        </div>

        {myPrescriptions && myPrescriptions.length > 0 ? (
          <div className="space-y-2">
            {myPrescriptions.slice(0, 3).map((p) => {
              const statusBadge: Record<string, { cls: string; labelBn: string; labelEn: string }> = {
                pending: { cls: "bg-amber-500/10 text-amber-600 border-amber-500/30", labelBn: "অপেক্ষমান", labelEn: "Pending" },
                reviewing: { cls: "bg-blue-500/10 text-blue-600 border-blue-500/30", labelBn: "যাচাই চলছে", labelEn: "Reviewing" },
                approved: { cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", labelBn: "অনুমোদিত", labelEn: "Approved" },
                fulfilled: { cls: "bg-purple-500/10 text-purple-600 border-purple-500/30", labelBn: "অর্ডার সম্পন্ন", labelEn: "Fulfilled" },
              };
              const badge = statusBadge[p.status] || { cls: "bg-secondary text-foreground", labelBn: p.status, labelEn: p.status };

              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 transition hover:border-primary/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-foreground">
                        #{p.id.slice(0, 8)}
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge.cls}`}>
                        {t(badge.labelBn, badge.labelEn)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {p.note || t("সংযুক্ত ফাইল:", "Attached files:")} {p.filePaths.length} {t("টি", "files")}
                    </p>
                    <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                      {new Date(p.createdAt).toLocaleDateString("bn-BD", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>

                  <Link
                    href={`/prescription/${p.id}`}
                    className="shrink-0 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition"
                  >
                    {t("দেখুন ও অর্ডার", "View & Order")}
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card p-5 text-center text-xs text-muted-foreground">
            <p>{t("এখনও কোনো প্রেসক্রিপশন আপলোড করা হয়নি।", "No prescriptions uploaded yet.")}</p>
            <Link
              href="/prescription"
              className="mt-2 inline-block rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              {t("প্রেসক্রিপশন আপলোড করুন", "Upload prescription")}
            </Link>
          </div>
        )}
      </div>

      <h2 className="mt-5 text-sm font-bold">{t("সংরক্ষিত ঠিকানা", "Saved addresses")}</h2>
      <div className="mt-2 space-y-2">
        {addresses.map((a) => (
          <div
            key={a.id}
            className={`flex items-start gap-2 rounded-xl border p-3 ${
              a.id === activeAddress ? "border-primary bg-primary/5" : "border-border bg-card"
            }`}
          >
            <MapPin className="mt-0.5 h-4 w-4 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold">
                {a.label} · {a.area}
              </p>
              <p className="text-[11px] text-muted-foreground">{a.details}</p>
              <p className="text-[11px] text-muted-foreground">{a.phone}</p>
            </div>
            <button onClick={() => setActiveAddress(a.id)} className="text-[10px] font-semibold text-primary">
              {t("সক্রিয়", "Use")}
            </button>
            <button onClick={() => removeAddress(a.id)} className="text-[10px] font-semibold text-sale">
              {t("মুছুন", "Delete")}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-2 rounded-xl border border-border bg-card p-3 sm:grid-cols-2">
        {(
          [
            ["label", t("লেবেল (বাড়ি/অফিস)", "Label (Home/Office)")],
            ["area", t("এলাকা", "Area")],
            ["details", t("বিস্তারিত ঠিকানা", "Full address")],
            ["phone", t("ফোন", "Phone")],
          ] as const
        ).map(([k, ph]) => (
          <input
            key={k}
            value={addr[k]}
            onChange={(e) => setAddr({ ...addr, [k]: e.target.value })}
            placeholder={ph}
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs"
          />
        ))}
        <button
          onClick={() => {
            if (!addr.area || !addr.details || !addr.phone) return;
            addAddress({
              label: addr.label || t("বাড়ি", "Home"),
              area: addr.area,
              details: addr.details,
              phone: addr.phone,
            });
            setAddr({ label: "", area: "", details: "", phone: "" });
          }}
          className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground sm:col-span-2"
        >
          {t("ঠিকানা যোগ করুন", "Add address")}
        </button>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Link
          href="/account/loyalty"
          className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-3 text-xs font-semibold"
        >
          <span className="text-base">🎁</span> {t("লয়্যালটি পয়েন্ট", "Loyalty points")}
        </Link>
        <Link
          href="/account/medicines"
          className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-3 text-xs font-semibold"
        >
          <Pill className="h-4 w-4 text-primary" /> {t("আমার ঔষধ", "My medicines")}
        </Link>
        <Link
          href="/account/notifications"
          className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-3 text-xs font-semibold"
        >
          <Bell className="h-4 w-4 text-primary" /> {t("নোটিফিকেশন", "Notifications")}
        </Link>
        <Link
          href="/account/audit-logs"
          className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-3 text-xs font-semibold"
        >
          <Activity className="h-4 w-4 text-primary" /> {t("কার্যক্রম লগ", "Activity log")}
        </Link>
        <Link href="/help" className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-3 text-xs font-semibold">
          <HelpCircle className="h-4 w-4 text-primary" /> {t("সহায়তা", "Help")}
        </Link>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  v,
  href,
}: {
  icon: typeof FileText;
  label: string;
  v: string;
  href: string;
}) {
  return (
    <Link href={href} className="rounded-xl border border-border bg-card p-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-primary" />
      <p className="mt-1 text-sm font-bold">{v}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </Link>
  );
}

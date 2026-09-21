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
import { useT } from "@/lib/i18n";

export default function AccountPage() {
  const t = useT();
  const { addresses, addAddress, removeAddress, activeAddress, setActiveAddress, prescriptions, wishlist } =
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
          v={t.n(prescriptions.length)}
          href="/prescription"
        />
        <Stat icon={CalendarDays} label={t("অ্যাপয়েন্টমেন্ট", "Appointments")} v={t.n(0)} href="/appointments" />
      </div>

      {isAdmin && (
        <Link
          href="/admin"
          className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-navy px-4 py-3 text-xs font-bold text-navy-foreground"
        >
          <ShieldCheck className="h-4 w-4" /> {t("অ্যাডমিন ড্যাশবোর্ড", "Admin dashboard")}
        </Link>
      )}

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

"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bell,
  Calendar,
  Clock,
  Heart,
  History,
  Star,
  Trash2,
  GripVertical,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  CheckSquare,
  Square,
  RotateCcw,
  Pill,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";

type MedItem = {
  id: string;
  name: string;
  en?: string | null;
  generic?: string | null;
  form?: string | null;
  strength?: string | null;
  price: string;
  emoji?: string | null;
  lastViewedAt?: string;
};

type ReminderItem = {
  id: string;
  productId: string;
  productName: string;
  everyDays: number;
  nextAt: string;
  active: boolean;
};

type DrugInteractionRule = {
  drugsA: string[];
  drugsB: string[];
  severity: "major" | "moderate";
  titleBn: string;
  titleEn: string;
  descBn: string;
  descEn: string;
};

const KNOWN_INTERACTIONS: DrugInteractionRule[] = [
  {
    drugsA: ["aspirin", "ibuprofen", "naproxen", "ketorolac", "diclofenac", "aceclofenac"],
    drugsB: ["warfarin", "clopidogrel", "rivaroxaban", "apixaban", "dabigatran"],
    severity: "major",
    titleBn: "রক্তক্ষরণের ঝুঁকি বৃদ্ধি (NSAID + Antiplatelet/Anticoagulant)",
    titleEn: "Increased Bleeding Risk (NSAID + Antiplatelet/Anticoagulant)",
    descBn: "ব্যথানাশক ঔষধের সাথে রক্ত পাতলাকারী ঔষধ গ্রহণ করলে পাকস্থলী ও অন্ত্রে রক্তক্ষরণের ঝুঁকি উল্লেখযোগ্যভাবে বৃদ্ধি পায়। চিকিৎসকের পরামর্শ ব্যতীত একসঙ্গে সেবন করবেন না।",
    descEn: "Combining NSAID painkillers with blood thinners significantly increases gastrointestinal bleeding risks. Do not take together without physician supervision.",
  },
  {
    drugsA: ["omeprazole", "esomeprazole"],
    drugsB: ["clopidogrel"],
    severity: "moderate",
    titleBn: "কার্যকারিতা হ্রাস (PPI + Clopidogrel)",
    titleEn: "Reduced Efficacy (PPI + Clopidogrel)",
    descBn: "ওমিপ্রাজল বা ইসোমিপ্রাজল ক্লোপিডোগ্রেলের অ্যান্টিপ্লেটলেট কার্যকারিতা হ্রাস করতে পারে। প্যান্টোপ্রাজল বিকল্প হিসেবে নিরাপদ হতে পারে।",
    descEn: "Omeprazole or Esomeprazole may reduce antiplatelet efficacy of Clopidogrel. Pantoprazole may be considered as a safer alternative.",
  },
  {
    drugsA: ["azithromycin", "clarithromycin", "erythromycin"],
    drugsB: ["atorvastatin", "simvastatin", "rosuvastatin"],
    severity: "major",
    titleBn: "মাংসপেশির ক্ষতির ঝুঁকি (Macrolide + Statin)",
    titleEn: "Muscle Toxicity / Rhabdomyolysis Risk (Macrolide + Statin)",
    descBn: "ম্যাক্রোলাইড অ্যান্টিবায়োটিকের সাথে স্ট্যাটিন জাতীয় কোলেস্টেরল ঔষধ গ্রহণ করলে মাংসপেশি দুর্বলতা বা মায়োপ্যাথির ঝুঁকি বাড়ে।",
    descEn: "Macrolide antibiotics may increase serum statin concentrations, raising the risk of muscle toxicity and rhabdomyolysis.",
  },
  {
    drugsA: ["metformin"],
    drugsB: ["contrast", "alcohol"],
    severity: "major",
    titleBn: "ল্যাকটিক অ্যাসিডোসিস ঝুঁকি (Metformin Interaction)",
    titleEn: "Lactic Acidosis Risk (Metformin Interaction)",
    descBn: "মেটফরমিনের সাথে অ্যালকোহল বা রেডিওলজিক্যাল কন্ট্রাস্ট এজেন্ট ব্যবহারে ল্যাকটিক অ্যাসিডোসিসের মারাত্মক ঝুঁকি হতে পারে।",
    descEn: "Metformin combined with alcohol or iodinated contrast media can trigger severe lactic acidosis.",
  },
  {
    drugsA: ["bisoprolol", "atenolol", "metoprolol", "carvedilol"],
    drugsB: ["verapamil", "diltiazem"],
    severity: "major",
    titleBn: "হার্ট রেট অতিরিক্ত কমার ঝুঁকি (Beta-Blocker + Calcium Channel Blocker)",
    titleEn: "Severe Bradycardia Risk (Beta-Blocker + Non-DHP CCB)",
    descBn: "উভয় ঔষধ হৃদস্পন্দন ও রক্তচাপ কমায়। একসাথে ব্যবহারে মারাত্মক ব্র্যাডিকার্ডিয়া বা হার্ট ব্লক হতে পারে।",
    descEn: "Both classes decrease heart rate and cardiac conduction, increasing risks of profound bradycardia and heart failure.",
  },
  {
    drugsA: ["ramipril", "enalapril", "losartan", "valsartan", "telmisartan"],
    drugsB: ["spironolactone", "potassium"],
    severity: "moderate",
    titleBn: "হাইপারক্যালেমিয়া ঝুঁকি (ACEi/ARB + Potassium Sparing Agent)",
    titleEn: "Hyperkalemia Risk (ACEi/ARB + Potassium Sparing Agent)",
    descBn: "রক্তে পটাশিয়ামের মাত্রা বিপজ্জনক হারে বৃদ্ধি পেতে পারে। নিয়মিত সিরাম পটাশিয়াম পর্যবেক্ষণ জরুরি।",
    descEn: "Elevated risk of hyperkalemia (high blood potassium). Routine serum potassium monitoring is recommended.",
  },
  {
    drugsA: ["ciprofloxacin", "levofloxacin"],
    drugsB: ["antacid", "calcium", "iron", "zinc"],
    severity: "moderate",
    titleBn: "শোষণ ব্যাহত হওয়া (Fluoroquinolone + Mineral Supplement)",
    titleEn: "Impaired Antibiotic Absorption (Fluoroquinolone + Multivalent Minerals)",
    descBn: "অ্যান্টাসিড বা ক্যালসিয়াম/আয়রন সাপ্লিমেন্ট অ্যান্টিবায়োটিকের শোষণ বাধাগ্রস্ত করে। কমপক্ষে ২ ঘণ্টা ব্যবধানে সেবন করুন।",
    descEn: "Antacids or mineral supplements chelate fluoroquinolones, drastically reducing absorption. Separate doses by at least 2 hours.",
  },
];

export default function AccountMedicinesPage() {
  const t = useT();
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<"favorites" | "recent" | "reminders" | "calendar" | "interactions">("favorites");
  const [reminderModal, setReminderModal] = useState<{ productId: string; productName: string } | null>(null);
  const [everyDaysInput, setEveryDaysInput] = useState(30);

  // Multi-select & Bulk operations state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastDeleted, setLastDeleted] = useState<{ items: MedItem[]; type: "favorites" | "recent" } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const listQ = useQuery({
    queryKey: ["account-medicines"],
    enabled: !!user,
    queryFn: async () => {
      const res = await fetch("/api/account/medicines", { cache: "no-store" });
      if (!res.ok) throw new Error("medicines fetch failed");
      return res.json() as Promise<{ favorites: MedItem[]; recent: MedItem[] }>;
    },
  });

  const remindersQ = useQuery({
    queryKey: ["refill-reminders"],
    enabled: !!user,
    queryFn: async () => {
      const res = await fetch("/api/refill-reminders", { cache: "no-store" });
      if (!res.ok) return { items: [] };
      return res.json() as Promise<{ items: ReminderItem[] }>;
    },
  });

  const saveReminder = useMutation({
    mutationFn: async ({
      productId,
      productName,
      everyDays,
    }: {
      productId: string;
      productName: string;
      everyDays: number;
    }) => {
      const res = await fetch("/api/refill-reminders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId, productName, everyDays }),
      });
      if (!res.ok) throw new Error("Save reminder failed");
      return res.json();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["refill-reminders"] });
      toast.success(t("রিমাইন্ডার সংরক্ষিত হয়েছে", "Reminder saved"));
      setReminderModal(null);
    },
    onError: () => toast.error(t("রিমাইন্ডার সংরক্ষণ ব্যর্থ", "Failed to save reminder")),
  });

  const deleteReminder = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/refill-reminders", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Delete reminder failed");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["refill-reminders"] });
      toast.success(t("রিমাইন্ডার মুছে ফেলা হয়েছে", "Reminder removed"));
    },
  });

  const toggleFav = useMutation({
    mutationFn: async (productId: string) => {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "toggle", productId }),
      });
      if (!res.ok) throw new Error("toggle failed");
      return res.json() as Promise<{ favorite: boolean }>;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["account-medicines"] }),
  });

  const reorderFavs = useMutation({
    mutationFn: async (productIds: string[]) => {
      const res = await fetch("/api/account/medicines", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productIds }),
      });
      if (!res.ok) throw new Error("Reorder failed");
      return res.json();
    },
    onSuccess: () => {
      toast.success(t("ঔষধের ক্রম সংরক্ষিত হয়েছে", "Medicine order updated"));
    },
    onError: () => {
      toast.error(t("ক্রম সংরক্ষণ করা যায়নি", "Failed to save order"));
      void qc.invalidateQueries({ queryKey: ["account-medicines"] });
    },
  });

  const bulkRemoveFavs = useMutation({
    mutationFn: async (productIds: string[]) => {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "bulk_remove", productIds }),
      });
      if (!res.ok) throw new Error("Bulk delete failed");
      return res.json();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["account-medicines"] });
    },
  });

  const bulkRestoreFavs = useMutation({
    mutationFn: async (productIds: string[]) => {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "bulk_add", productIds }),
      });
      if (!res.ok) throw new Error("Bulk restore failed");
      return res.json();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["account-medicines"] });
      toast.success(t("ঔষধগুলো পুনরায় যোগ করা হয়েছে", "Medicines restored successfully"));
    },
  });

  const onDragEnd = (result: DropResult) => {
    if (!result.destination || tab !== "favorites" || !listQ.data?.favorites) return;
    if (result.destination.index === result.source.index) return;

    const reordered = Array.from(listQ.data.favorites);
    const [moved] = reordered.splice(result.source.index, 1);
    if (!moved) return;
    reordered.splice(result.destination.index, 0, moved);

    qc.setQueryData(["account-medicines"], {
      ...listQ.data,
      favorites: reordered,
    });

    reorderFavs.mutate(reordered.map((m) => m.id));
  };

  const favorites = listQ.data?.favorites ?? [];
  const recent = listQ.data?.recent ?? [];
  const reminders = remindersQ.data?.items ?? [];
  const items = tab === "favorites" ? favorites : recent;
  const favIds = new Set(favorites.map((m) => m.id));

  // Selection handlers
  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    const deletedItems = items.filter((i) => selectedIds.has(i.id));
    const pids = Array.from(selectedIds);

    setLastDeleted({ items: deletedItems, type: tab === "favorites" ? "favorites" : "recent" });
    bulkRemoveFavs.mutate(pids);

    setSelectedIds(new Set());
    setSelectMode(false);

    toast.success(t(`${pids.length}টি ঔষধ মুছে ফেলা হয়েছে`, `${pids.length} items removed`), {
      action: {
        label: t("ফিরে আনুন (Undo)", "Undo"),
        onClick: () => {
          bulkRestoreFavs.mutate(pids);
        },
      },
    });
  };

  // Compute Drug Interactions across active favorite medicines
  const detectedInteractions = useMemo(() => {
    const results: Array<{
      rule: DrugInteractionRule;
      medA: MedItem;
      medB: MedItem;
    }> = [];

    const cleanStr = (s?: string | null) => (s || "").toLowerCase();

    for (let i = 0; i < favorites.length; i++) {
      for (let j = i + 1; j < favorites.length; j++) {
        const a = favorites[i]!;
        const b = favorites[j]!;
        const textA = `${cleanStr(a.generic)} ${cleanStr(a.name)} ${cleanStr(a.en)}`;
        const textB = `${cleanStr(b.generic)} ${cleanStr(b.name)} ${cleanStr(b.en)}`;

        for (const rule of KNOWN_INTERACTIONS) {
          const matchA1 = rule.drugsA.some((d) => textA.includes(d));
          const matchB1 = rule.drugsB.some((d) => textB.includes(d));

          const matchA2 = rule.drugsA.some((d) => textB.includes(d));
          const matchB2 = rule.drugsB.some((d) => textA.includes(d));

          if ((matchA1 && matchB1) || (matchA2 && matchB2)) {
            results.push({
              rule,
              medA: a,
              medB: b,
            });
          }
        }
      }
    }

    return results;
  }, [favorites]);

  // Compute 7-day schedule for calendar
  const today = new Date();
  const scheduleDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(today.getDate() + i);
    return d;
  });

  if (loading) {
    return (
      <p className="pt-16 text-center text-sm text-muted-foreground">
        {t("লোড হচ্ছে...", "Loading...")}
      </p>
    );
  }

  if (!user) {
    return (
      <div className="pt-16 text-center">
        <p className="text-4xl">💊</p>
        <h1 className="mt-3 text-base font-bold">
          {t("ঔষধ তালিকা দেখতে লগইন করুন", "Log in to view your medicines")}
        </h1>
        <Link
          href="/auth"
          className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
        >
          {t("লগইন করুন", "Log in")}
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-4 pb-12 max-w-3xl mx-auto px-2 sm:px-4">
      <Link href="/account" className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
        <ArrowLeft className="h-3.5 w-3.5" /> {t("একাউন্ট", "Account")}
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold">{t("আমার ঔষধ ও স্বাস্থ্য সহকারী", "My Medicines & Health Assistant")}</h1>
          <p className="text-xs text-muted-foreground">
            {t(
              "প্রিয় ঔষধ, ড্রাগ ইন্টারেকশন চেক, রিফিল রিমাইন্ডার এবং সেবন ক্যালেন্ডার।",
              "Favorite medicines, drug interaction analysis, refill reminders and daily schedule."
            )}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setTab("favorites");
            setSelectMode(false);
          }}
          className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
            tab === "favorites"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:bg-secondary"
          }`}
        >
          <Heart className="h-3.5 w-3.5" /> {t("প্রিয়", "Favorites")} ({t.n(favorites.length)})
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("recent");
            setSelectMode(false);
          }}
          className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
            tab === "recent"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:bg-secondary"
          }`}
        >
          <History className="h-3.5 w-3.5" /> {t("সাম্প্রতিক", "Recent")} ({t.n(recent.length)})
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("reminders");
            setSelectMode(false);
          }}
          className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
            tab === "reminders"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:bg-secondary"
          }`}
        >
          <Bell className="h-3.5 w-3.5" /> {t("রিফিল রিমাইন্ডার", "Refill Reminders")} ({t.n(reminders.length)})
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("calendar");
            setSelectMode(false);
          }}
          className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
            tab === "calendar"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:bg-secondary"
          }`}
        >
          <Calendar className="h-3.5 w-3.5" /> {t("সেবন শিডিউল", "Schedule")}
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("interactions");
            setSelectMode(false);
          }}
          className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
            tab === "interactions"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:bg-secondary"
          }`}
        >
          <ShieldAlert className="h-3.5 w-3.5" />
          {t("ইন্টারেকশন বিশ্লেষণ", "Drug Interactions")}
          {detectedInteractions.length > 0 && (
            <span className="rounded-full bg-destructive px-1.5 py-0.2 text-[9px] font-bold text-destructive-foreground">
              {detectedInteractions.length}
            </span>
          )}
        </button>
      </div>

      {/* Multi-Select Toolbar for Favorites & Recent */}
      {(tab === "favorites" || tab === "recent") && items.length > 0 && (
        <div className="mt-3 flex items-center justify-between border-b border-border pb-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectMode(!selectMode);
                setSelectedIds(new Set());
              }}
              className="flex items-center gap-1 font-semibold text-primary hover:underline"
            >
              {selectMode ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
              {selectMode ? t("সিলেক্ট বাতিল", "Cancel select") : t("সিলেক্ট মোড", "Select multiple")}
            </button>
            {selectMode && (
              <button
                type="button"
                onClick={selectAll}
                className="text-muted-foreground hover:text-foreground underline ml-2 text-[11px]"
              >
                {selectedIds.size === items.length ? t("আনসিলেক্ট", "Deselect all") : t("সব সিলেক্ট", "Select all")}
              </button>
            )}
          </div>

          {selectMode && selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">
                {t(`${selectedIds.size}টি নির্বাচিত`, `${selectedIds.size} selected`)}
              </span>
              <button
                type="button"
                onClick={handleBulkDelete}
                className="flex items-center gap-1 rounded bg-destructive px-2 py-1 text-[11px] font-bold text-destructive-foreground hover:bg-destructive/90"
              >
                <Trash2 className="h-3 w-3" /> {t("মুছুন", "Delete selected")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Drug Interactions Tab */}
      {tab === "interactions" && (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold flex items-center gap-2 text-navy">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  {t("ঔষধের ড্রাগ-ড্রাগ ইন্টারেকশন বিশ্লেষণ", "Drug-Drug Interaction Analysis")}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {t(
                    "আপনার সংরক্ষিত প্রিয় ঔষধগুলোর মধ্যে কোনো বিপজ্জনক পারস্পরিক মিথস্ক্রিয়া (Contraindication) বা পার্শ্বপ্রতিক্রিয়ার ঝুঁকি আছে কিনা তা স্বয়ংক্রিয়ভাবে বিশ্লেষণ করা হয়েছে।",
                    "Automated safety analysis checking for potential contraindications, efficacy reduction, and toxicity risks among your saved medications."
                  )}
                </p>
              </div>
            </div>

            {favorites.length < 2 && (
              <div className="mt-6 text-center py-6 border border-dashed border-border rounded-xl">
                <Pill className="mx-auto h-7 w-7 text-muted-foreground" />
                <p className="mt-2 text-xs text-muted-foreground">
                  {t(
                    "ইন্টারেকশন বিশ্লেষণ করতে আপনার প্রিয় তালিকায় কমপক্ষে ২টি ঔষধ যোগ করুন।",
                    "Add at least 2 medicines to your favorites to analyze potential drug interactions."
                  )}
                </p>
              </div>
            )}

            {favorites.length >= 2 && detectedInteractions.length === 0 && (
              <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
                <p className="mt-2 text-sm font-bold text-emerald-700">
                  {t("কোনো ক্ষতিকর ড্রাগ ইন্টারেকশন পাওয়া যায়নি", "No Harmful Drug Interactions Detected")}
                </p>
                <p className="mt-1 text-xs text-emerald-600">
                  {t(
                    "আপনার নির্বাচিত ঔষধগুলোর মধ্যে কোনো পরিচিত প্রধান বৈপরীত্য নেই। সবসময় চিকিৎসকের প্রেসক্রিপশন মেনে চলুন।",
                    "No major contraindications found between your active medications. Always adhere to physician advice."
                  )}
                </p>
              </div>
            )}

            {detectedInteractions.length > 0 && (
              <div className="mt-4 space-y-3">
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <p className="font-semibold">
                    {t(
                      `সতর্কতা: ${detectedInteractions.length}টি সম্ভাব্য ঔষধ মিথস্ক্রিয়া ঝুঁকি শনাক্ত হয়েছে!`,
                      `Warning: ${detectedInteractions.length} potential drug interaction risk(s) identified!`
                    )}
                  </p>
                </div>

                {detectedInteractions.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-destructive/40 bg-card p-4 shadow-xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold uppercase text-destructive-foreground">
                        {item.rule.severity === "major" ? t("উচ্চ ঝুঁকি (Major)", "Major Risk") : t("মাঝারি ঝুঁকি (Moderate)", "Moderate Risk")}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {item.medA.name} ↔ {item.medB.name}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-foreground">
                      {t(item.rule.titleBn, item.rule.titleEn)}
                    </p>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t(item.rule.descBn, item.rule.descEn)}
                    </p>

                    <div className="rounded-lg bg-secondary/60 p-2 text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>
                        {t(
                          "পরামর্শ: এই ঔষধ দুটি একসাথে সেবন করার পূর্বে আপনার রেজিস্টার্ড চিকিৎসকের মতামত নিন।",
                          "Recommendation: Consult your treating physician before taking these medications concurrently."
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Calendar Tab */}
      {tab === "calendar" && (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-navy flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                {t("আগামী ৭ দিনের ঔষধ গ্রহণ শিডিউল", "Next 7 Days Intake Schedule")}
              </h2>
              <span className="text-[11px] text-muted-foreground">
                {t("সকাল · দুপুর · রাত", "Morning · Noon · Night")}
              </span>
            </div>

            {favorites.length === 0 ? (
              <div className="text-center py-8">
                <Pill className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-xs text-muted-foreground">
                  {t(
                    "শিডিউলে ঔষধ যোগ করতে আপনার নিয়মিত ঔষধগুলোতে স্টার বা প্রিয় হিসেবে চিহ্নিত করুন।",
                    "Add medicines to favorites to view them in your daily schedule calendar."
                  )}
                </p>
                <Link
                  href="/products"
                  className="mt-3 inline-block rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                >
                  {t("ঔষধ খুঁজুন", "Browse medicines")}
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {scheduleDays.map((date, idx) => {
                  const dayName = date.toLocaleDateString("bn-BD", { weekday: "short", day: "numeric", month: "short" });
                  const dayNameEn = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                  const isToday = idx === 0;

                  return (
                    <div
                      key={date.toISOString()}
                      className={`rounded-xl border p-3 transition ${
                        isToday ? "border-primary/60 bg-primary/5" : "border-border bg-secondary/30"
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-border/50">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${isToday ? "text-primary" : "text-foreground"}`}>
                            {t(dayName, dayNameEn)}
                          </span>
                          {isToday && (
                            <span className="rounded-full bg-primary px-2 py-0.2 text-[9px] font-bold text-primary-foreground">
                              {t("আজ", "Today")}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {favorites.length} {t("টি ঔষধ", "medicines")}
                        </span>
                      </div>

                      <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {/* Morning */}
                        <div className="rounded-lg border border-border/60 bg-background/80 p-2">
                          <p className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                            🌅 {t("সকাল (০৮:০০)", "Morning (08:00 AM)")}
                          </p>
                          <div className="mt-1 space-y-1">
                            {favorites.slice(0, 2).map((med) => (
                              <p key={med.id} className="text-[11px] font-medium text-foreground truncate">
                                • {med.name}
                              </p>
                            ))}
                          </div>
                        </div>

                        {/* Noon */}
                        <div className="rounded-lg border border-border/60 bg-background/80 p-2">
                          <p className="text-[10px] font-bold text-sky-600 flex items-center gap-1">
                            ☀️ {t("দুপুর (০১:৩০)", "Noon (01:30 PM)")}
                          </p>
                          <div className="mt-1 space-y-1">
                            {favorites.length > 2 ? (
                              <p key={favorites[2]?.id} className="text-[11px] font-medium text-foreground truncate">
                                • {favorites[2]?.name}
                              </p>
                            ) : (
                              <p className="text-[10px] text-muted-foreground italic">
                                {t("কোনো ঔষধ নেই", "No intake scheduled")}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Night */}
                        <div className="rounded-lg border border-border/60 bg-background/80 p-2">
                          <p className="text-[10px] font-bold text-indigo-600 flex items-center gap-1">
                            🌙 {t("রাত (০৯:৩০)", "Night (09:30 PM)")}
                          </p>
                          <div className="mt-1 space-y-1">
                            {favorites.map((med) => (
                              <p key={med.id} className="text-[11px] font-medium text-foreground truncate">
                                • {med.name}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Refill Reminders Tab */}
      {tab === "reminders" && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {t("নিয়মিত ঔষধ সেবন ও রিফিলের সময়মত সতর্কতা।", "Regular medication & refill reminders.")}
            </p>
          </div>

          {remindersQ.isLoading && (
            <p className="mt-3 text-xs text-muted-foreground">{t("লোড হচ্ছে...", "Loading...")}</p>
          )}

          {!remindersQ.isLoading && reminders.length === 0 && (
            <div className="mt-8 text-center rounded-2xl border border-dashed border-border bg-card p-8">
              <Bell className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-xs text-muted-foreground">
                {t(
                  "কোনো রিমাইন্ডার সেট করা নেই। প্রিয় বা যেকোনো ঔষধ থেকে রিমাইন্ডার যোগ করুন।",
                  "No reminders set yet. Add a reminder from your medicines."
                )}
              </p>
            </div>
          )}

          <div className="space-y-2">
            {reminders.map((rem) => (
              <div
                key={rem.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold text-navy">{rem.productName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {t(`প্রতি ${rem.everyDays} দিন পর পর`, `Every ${rem.everyDays} days`)} · {t("পরবর্তী রিফিল:", "Next:")} {rem.nextAt}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={deleteReminder.isPending}
                  onClick={() => deleteReminder.mutate(rem.id)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                  title={t("মুছে ফেলুন", "Delete")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Favorites or Recent Tabs */}
      {(tab === "favorites" || tab === "recent") && listQ.isLoading && (
        <p className="mt-6 text-xs text-muted-foreground text-center">{t("লোড হচ্ছে...", "Loading...")}</p>
      )}

      {(tab === "favorites" || tab === "recent") && !listQ.isLoading && items.length === 0 && (
        <div className="mt-8 text-center">
          <p className="text-3xl">{tab === "favorites" ? "🤍" : "🕐"}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {tab === "favorites"
              ? t("এখনো কোনো প্রিয় ঔষধ নেই।", "No favorite medicines yet.")
              : t("এখনো কোনো সাম্প্রতিক ঔষধ নেই।", "No recently viewed medicines yet.")}
          </p>
          <Link
            href="/products"
            className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
          >
            {t("পণ্য দেখুন", "Browse products")}
          </Link>
        </div>
      )}

      {/* Favorites list with Drag-and-Drop */}
      {tab === "favorites" && !listQ.isLoading && items.length > 0 && mounted && (
        <div className="mt-3">
          {!selectMode && (
            <p className="text-[11px] text-muted-foreground mb-2 flex items-center gap-1">
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
              {t(
                "ক্রম পরিবর্তন করতে টেনে নিয়ে যান (Drag & drop to reorder favorites)",
                "Drag and drop medicines to reorder your favorites"
              )}
            </p>
          )}
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="fav-medicines-list">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                  {items.map((m, index) => (
                    <Draggable key={m.id} draggableId={m.id} index={index} isDragDisabled={selectMode}>
                      {(dragProvided, snapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          className={`flex items-center gap-2.5 rounded-xl border p-3 transition ${
                            snapshot.isDragging
                              ? "border-primary shadow-xl bg-card scale-[1.01] z-50 ring-2 ring-primary/40"
                              : selectedIds.has(m.id)
                              ? "border-primary bg-primary/5"
                              : "border-border bg-card hover:border-primary/40"
                          }`}
                        >
                          {selectMode ? (
                            <button
                              type="button"
                              onClick={() => toggleSelect(m.id)}
                              className="p-1 text-primary"
                            >
                              {selectedIds.has(m.id) ? (
                                <CheckSquare className="h-4 w-4" />
                              ) : (
                                <Square className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          ) : (
                            <div
                              {...dragProvided.dragHandleProps}
                              className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-foreground px-1"
                              title={t("টেনে স্থানান্তর করুন", "Drag to reorder")}
                            >
                              <GripVertical className="h-4 w-4" />
                            </div>
                          )}

                          <span className="text-xl shrink-0">{m.emoji || "💊"}</span>

                          <div className="min-w-0 flex-1">
                            <Link href={`/product/${m.id}`} className="text-xs font-bold hover:text-primary transition">
                              {t(m.name, m.en || m.name)}
                            </Link>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {[m.generic, m.strength, m.form].filter(Boolean).join(" · ")}
                            </p>
                            <p className="text-[11px] font-semibold text-primary">৳{Number(m.price).toFixed(2)}</p>
                          </div>

                          {!selectMode && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setReminderModal({ productId: m.id, productName: m.name });
                                  setEveryDaysInput(30);
                                }}
                                className="rounded-lg border border-border p-2 text-muted-foreground hover:text-primary transition"
                                title={t("রিমাইন্ডার সেট করুন", "Set dosage reminder")}
                              >
                                <Bell className="h-4 w-4" />
                              </button>

                              <button
                                type="button"
                                disabled={toggleFav.isPending}
                                onClick={() => toggleFav.mutate(m.id)}
                                className="rounded-lg border border-border p-2 disabled:opacity-60 transition"
                                aria-label={favIds.has(m.id) ? "Remove favorite" : "Add favorite"}
                              >
                                <Star
                                  className={`h-4 w-4 ${
                                    favIds.has(m.id) ? "fill-primary text-primary" : "text-muted-foreground"
                                  }`}
                                />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      )}

      {/* Recent medicines list */}
      {tab === "recent" && !listQ.isLoading && items.length > 0 && (
        <div className="mt-3 space-y-2">
          {items.map((m) => (
            <div
              key={m.id}
              className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                selectedIds.has(m.id) ? "border-primary bg-primary/5" : "border-border bg-card"
              }`}
            >
              {selectMode && (
                <button type="button" onClick={() => toggleSelect(m.id)} className="p-1 text-primary">
                  {selectedIds.has(m.id) ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              )}
              <span className="text-xl shrink-0">{m.emoji || "💊"}</span>
              <div className="min-w-0 flex-1">
                <Link href={`/product/${m.id}`} className="text-xs font-bold hover:text-primary transition">
                  {t(m.name, m.en || m.name)}
                </Link>
                <p className="text-[11px] text-muted-foreground truncate">
                  {[m.generic, m.strength, m.form].filter(Boolean).join(" · ")}
                </p>
                <p className="text-[11px] font-semibold text-primary">৳{Number(m.price).toFixed(2)}</p>
              </div>
              {!selectMode && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setReminderModal({ productId: m.id, productName: m.name });
                      setEveryDaysInput(30);
                    }}
                    className="rounded-lg border border-border p-2 text-muted-foreground hover:text-primary transition"
                    title={t("রিমাইন্ডার সেট করুন", "Set dosage reminder")}
                  >
                    <Bell className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={toggleFav.isPending}
                    onClick={() => toggleFav.mutate(m.id)}
                    className="rounded-lg border border-border p-2 disabled:opacity-60 transition"
                    aria-label={favIds.has(m.id) ? "Remove favorite" : "Add favorite"}
                  >
                    <Star
                      className={`h-4 w-4 ${
                        favIds.has(m.id) ? "fill-primary text-primary" : "text-muted-foreground"
                      }`}
                    />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Refill Reminder Modal */}
      {reminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 space-y-4 shadow-xl">
            <div>
              <p className="text-sm font-bold text-navy">{t("ডোজ ও রিফিল রিমাইন্ডার", "Dosage & Refill Reminder")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{reminderModal.productName}</p>
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1">
                {t("কত দিন পর পর রিফিল স্মরণ করাবে?", "Remind refill every how many days?")}
              </label>
              <div className="flex gap-2">
                {[15, 30, 60].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setEveryDaysInput(days)}
                    className={`rounded-lg border px-3 py-1 text-xs font-semibold transition ${
                      everyDaysInput === days
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {days} {t("দিন", "days")}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={1}
                max={365}
                value={everyDaysInput}
                onChange={(e) => setEveryDaysInput(Number(e.target.value) || 30)}
                className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReminderModal(null)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary transition"
              >
                {t("বাতিল", "Cancel")}
              </button>
              <button
                type="button"
                disabled={saveReminder.isPending}
                onClick={() =>
                  saveReminder.mutate({
                    productId: reminderModal.productId,
                    productName: reminderModal.productName,
                    everyDays: everyDaysInput,
                  })
                }
                className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50 transition"
              >
                {saveReminder.isPending ? t("সংরক্ষণ হচ্ছে...", "Saving...") : t("সংরক্ষণ", "Save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

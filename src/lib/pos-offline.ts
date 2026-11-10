/**
 * POS অফলাইন সিংক কিউ — Next.js 16 + MySQL API
 *
 * নিয়ম (কনফ্লিক্ট মার্জ পলিসি):
 * 1. প্রতিটি বিক্রয়ে একটি ইউনিক `ref` থাকে যা নোটে `#ref:<id>` আকারে সার্ভারে যায়।
 *    সিংকের সময় ওই ref সার্ভারে মিলিয়ে ডুপ্লিকেট ইনভয়েস তৈরি রোধ করা হয় (idempotent)।
 * 2. সিংক না হওয়া পর্যন্ত কিউ লোকাল স্টোরেজে থাকে; ব্রাউজার বন্ধ করলেও হারায় না।
 */

export type PosLine = {
  productId: string;
  productName: string;
  price: number;
  qty: number;
};

export type QueuedSale = {
  ref: string;
  at: string;
  items: PosLine[];
  customerName: string;
  phone: string;
  discount: number;
  paid: number;
  method: string;
  note: string;
  status: "pending" | "synced" | "failed";
  invoiceNo?: string;
  error?: string;
  conflicts?: string[];
};

const KEY = "ow.pos.queue.v1";

export const isOnline = () => (typeof navigator === "undefined" ? true : navigator.onLine);

export function loadQueue(): QueuedSale[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QueuedSale[]) : [];
  } catch {
    return [];
  }
}

export function saveQueue(q: QueuedSale[]) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(q.slice(-200)));
}

export function newRef() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function enqueue(sale: Omit<QueuedSale, "ref" | "at" | "status">): QueuedSale {
  const item: QueuedSale = {
    ...sale,
    ref: newRef(),
    at: new Date().toISOString(),
    status: "pending",
  };
  saveQueue([...loadQueue(), item]);
  return item;
}

export function removeRef(ref: string) {
  saveQueue(loadQueue().filter((s) => s.ref !== ref));
}

export function clearSynced() {
  saveQueue(loadQueue().filter((s) => s.status !== "synced"));
}

export type SyncResult = {
  synced: number;
  duplicate: number;
  failed: number;
  conflicts: number;
};

/** কিউয়ের সব পেন্ডিং বিক্রয় সার্ভারে পাঠায় (idempotent) */
export async function syncQueue(): Promise<SyncResult> {
  const res: SyncResult = { synced: 0, duplicate: 0, failed: 0, conflicts: 0 };
  if (!isOnline()) return res;

  const queue = loadQueue();
  for (const sale of queue) {
    if (sale.status === "synced") continue;

    const note = [sale.note, `#ref:${sale.ref}`]
      .filter(Boolean)
      .join(" | ");

    try {
      const response = await fetch("/api/admin/pos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: sale.items,
          customerName: sale.customerName,
          phone: sale.phone,
          discount: sale.discount,
          paid: sale.paid,
          method: sale.method,
          note,
        }),
      });

      if (!response.ok) {
        const j = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Sale creation failed");
      }

      const data = (await response.json()) as { invoiceNo?: string; duplicate?: boolean };
      sale.status = "synced";
      sale.invoiceNo = data.invoiceNo || "";
      sale.error = "";

      if (data.duplicate) {
        res.duplicate += 1;
      } else {
        res.synced += 1;
      }
    } catch (err) {
      sale.status = "failed";
      sale.error = err instanceof Error ? err.message : "Sync error";
      res.failed += 1;
    }
  }

  saveQueue(queue);
  return res;
}

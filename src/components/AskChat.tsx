"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  MessageCircle,
  X,
  Send,
  Headset,
  Bot,
  Loader2,
  Languages,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/lib/i18n";
import { useLang } from "@/lib/lang";
import { askSupportGuest } from "@/server/actions/support";
import { BrandLogo } from "@/components/BrandLogo";

type Msg = {
  id: string;
  sender: "user" | "ai" | "agent";
  body: string;
  agent_name: string;
  created_at: string;
};
type Conv = {
  id: string;
  agentActive: boolean;
  agentName: string;
  agentLastSeen: string | null;
};

const AGENT_WINDOW_MS = 5 * 60 * 1000;
const CHAT_LANG_KEY = "ow-chat-lang";

type ChatLangPref = "auto" | "bn" | "en";

function detectLang(text: string): "bn" | "en" | null {
  const bn = (text.match(/[\u0980-\u09FF]/g) ?? []).length;
  const en = (text.match(/[A-Za-z]/g) ?? []).length;
  if (!bn && !en) return null;
  return bn >= en ? "bn" : "en";
}

function agentLive(c: Conv | null) {
  if (!c?.agentActive) return false;
  const seen = c.agentLastSeen ? new Date(c.agentLastSeen).getTime() : 0;
  if (!seen) return true;
  return Date.now() - seen < AGENT_WINDOW_MS;
}

function RichText({ text }: { text: string }) {
  return (
    <div className="space-y-1">
      {text.split("\n").map((line, i) => {
        const bullet = /^\s*[-*•]\s+/.test(line);
        const clean = line.replace(/^\s*[-*•]\s+/, "");
        const parts = clean.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
        if (!clean.trim()) return <div key={i} className="h-1" />;
        return (
          <p
            key={i}
            className={
              bullet ? "flex gap-1.5 text-[13px] leading-relaxed" : "text-[13px] leading-relaxed"
            }
          >
            {bullet && <span className="text-primary">•</span>}
            <span>
              {parts.map((p, j) =>
                p.startsWith("**") && p.endsWith("**") ? (
                  <strong key={j} className="font-semibold">
                    {p.slice(2, -2)}
                  </strong>
                ) : (
                  <span key={j}>{p}</span>
                ),
              )}
            </span>
          </p>
        );
      })}
    </div>
  );
}

export function AskChat() {
  const t = useT();
  const { lang } = useLang();
  const { user } = useAuth();

  const [open, setOpen] = useState(false);
  const [conv, setConv] = useState<Conv | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [langPref, setLangPref] = useState<ChatLangPref>("auto");
  const [detected, setDetected] = useState<"bn" | "en" | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CHAT_LANG_KEY);
      if (saved === "bn" || saved === "en" || saved === "auto") setLangPref(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const chooseLang = (p: ChatLangPref) => {
    setLangPref(p);
    try {
      localStorage.setItem(CHAT_LANG_KEY, p);
    } catch {
      /* ignore */
    }
  };

  const chatLang: "bn" | "en" = langPref !== "auto" ? langPref : (detected ?? lang);

  const loadConversation = useCallback(async () => {
    const res = await fetch("/api/support", { cache: "no-store" });
    if (!res.ok) throw new Error("support load failed");
    const data = (await res.json()) as {
      conversation: Conv;
      messages: Msg[];
    };
    setConv(data.conversation);
    setMsgs(data.messages);
  }, []);

  useEffect(() => {
    if (!open || !user) return;
    let alive = true;
    void (async () => {
      try {
        await loadConversation();
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, user, loadConversation]);

  useEffect(() => {
    if (!open || !user || !conv) return;
    const id = window.setInterval(() => {
      void loadConversation().catch(() => undefined);
    }, 8000);
    return () => window.clearInterval(id);
  }, [open, user, conv, loadConversation]);

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open, busy]);

  const live = agentLive(conv);

  const send = async () => {
    const body = input.trim();
    if (!body || busy) return;
    const d = detectLang(body);
    if (langPref === "auto" && d) setDetected(d);
    const useLang: "bn" | "en" = langPref !== "auto" ? langPref : (d ?? detected ?? lang);
    setInput("");
    setErr("");
    setBusy(true);
    try {
      if (!user) {
        const now = new Date().toISOString();
        const mine: Msg = {
          id: `u-${Date.now()}`,
          sender: "user",
          body,
          agent_name: "",
          created_at: now,
        };
        const history = [...msgs, mine].slice(-15).map((m) => ({
          role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
          content: m.body,
        }));
        setMsgs((prev) => [...prev, mine]);
        const res = await askSupportGuest({ lang: useLang, messages: history });
        setMsgs((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            sender: "ai",
            body: res.text,
            agent_name: "",
            created_at: new Date().toISOString(),
          },
        ]);
        return;
      }
      if (!conv) return;
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          conversationId: conv.id,
          body,
          lang: useLang,
          askAi: !live,
        }),
      });
      if (!res.ok) throw new Error("send failed");
      const data = (await res.json()) as { messages: Msg[] };
      setMsgs(data.messages);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      if (user && conv) void loadConversation().catch(() => undefined);
    }
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("ঔষধওয়ালাকে বলুন", "Ask Oushodhwala")}
          className="fixed bottom-40 right-4 z-30 flex items-center gap-2 rounded-full brand-gradient px-4 py-3 text-xs font-bold text-primary-foreground shadow-[var(--shadow-elevated)] lg:bottom-24"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="hidden sm:inline">{t("ঔষধওয়ালাকে বলুন", "Ask Oushodhwala")}</span>
        </button>
      )}

      {open && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex h-[85vh] flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-[var(--shadow-elevated)] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[560px] sm:w-[380px] sm:rounded-2xl">
          <div className="flex items-center gap-2 border-b border-border bg-navy px-3 py-2.5 text-navy-foreground">
            <BrandLogo size={32} showWordmark={false} />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-bold">{t("ঔষধওয়ালাকে বলুন", "Ask Oushodhwala")}</p>
              <p className="flex items-center gap-1 text-[10px] opacity-80">
                {live ? (
                  <>
                    <Headset className="h-3 w-3" />
                    {t(
                      `কাস্টমার কেয়ার${conv?.agentName ? " — " + conv.agentName : ""} যুক্ত আছেন`,
                      `Customer care${conv?.agentName ? " — " + conv.agentName : ""} is live`,
                    )}
                  </>
                ) : (
                  <>
                    <Bot className="h-3 w-3" /> {t("AI সহকারী · ২৪/৭", "AI assistant · 24/7")}
                  </>
                )}
              </p>
            </div>
            <div className="flex shrink-0 items-center overflow-hidden rounded-full border border-navy-foreground/25">
              {(["bn", "en", "auto"] as ChatLangPref[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => chooseLang(p)}
                  aria-pressed={langPref === p}
                  className={`px-2 py-1 text-[10px] font-bold ${
                    langPref === p ? "bg-primary text-primary-foreground" : "opacity-70"
                  }`}
                >
                  {p === "bn" ? "বাং" : p === "en" ? "EN" : t("অটো", "Auto")}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("বন্ধ", "Close")}
              className="p-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="flex items-center gap-1.5 border-b border-border bg-muted px-3 py-1 text-[11px] text-muted-foreground">
            <Languages className="h-3 w-3 text-primary" />
            <span className="font-semibold text-navy">
              {chatLang === "bn" ? "উত্তরের ভাষা: বাংলা" : "Reply language: English"}
            </span>
            <span>
              {langPref === "auto"
                ? t("(অটো — আপনি যে ভাষায় লিখবেন)", "(auto — follows what you type)")
                : t("(ম্যানুয়াল)", "(manual)")}
            </span>
          </p>

          {!user && (
            <p className="border-b border-border bg-primary/5 px-3 py-1.5 text-[11px] text-muted-foreground">
              {t(
                "গেস্ট মোড — সাধারণ তথ্য পাবেন। অর্ডার/পয়েন্ট দেখতে ",
                "Guest mode — general info available. For orders/points ",
              )}
              <Link
                href="/auth"
                onClick={() => setOpen(false)}
                className="font-semibold text-primary underline"
              >
                {t("লগইন করুন", "sign in")}
              </Link>
            </p>
          )}

          <div ref={boxRef} className="flex-1 space-y-3 overflow-y-auto bg-background px-3 py-3">
            {msgs.length === 0 && (
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-[13px] font-semibold text-navy">
                  {t("আসসালামু আলাইকুম! কীভাবে সাহায্য করতে পারি?", "Hello! How can I help you?")}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[
                    t("নাপা এক্সট্রা এর দাম কত?", "Price of Napa Extra?"),
                    t("আমার অর্ডার কোথায়?", "Where is my order?"),
                    t("ল্যাব টেস্ট বুক করব কীভাবে?", "How to book a lab test?"),
                    t("এক্সপ্রেস ডেলিভারি কীভাবে পাব?", "How to get express delivery?"),
                  ].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setInput(s)}
                      className="rounded-full border border-border px-2.5 py-1 text-[11px] text-navy"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {msgs.map((m) => {
              const mine = m.sender === "user";
              return (
                <div key={m.id} className={`flex gap-2 ${mine ? "justify-end" : ""}`}>
                  {!mine && (
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted text-navy">
                      {m.sender === "agent" ? (
                        <Headset className="h-3.5 w-3.5" />
                      ) : (
                        <Bot className="h-3.5 w-3.5" />
                      )}
                    </span>
                  )}
                  <div className={`max-w-[80%] ${mine ? "" : "min-w-0"}`}>
                    {!mine && (
                      <p className="mb-0.5 text-[10px] font-semibold text-muted-foreground">
                        {m.sender === "agent"
                          ? m.agent_name || t("কাস্টমার কেয়ার", "Customer care")
                          : t("ঔষধওয়ালা AI", "Oushodhwala AI")}
                      </p>
                    )}
                    <div
                      className={
                        mine
                          ? "rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-[13px] leading-relaxed text-primary-foreground"
                          : "text-foreground"
                      }
                    >
                      {mine ? m.body : <RichText text={m.body} />}
                    </div>
                  </div>
                  {mine && (
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted text-navy">
                      <UserIcon className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
              );
            })}

            {busy && (
              <p className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {live
                  ? t("প্রতিনিধিকে পাঠানো হচ্ছে…", "Sending to agent…")
                  : t("ভাবছি…", "Thinking…")}
              </p>
            )}
            {err && <p className="text-[12px] text-sale">{err}</p>}
          </div>

          {live && (
            <p className="border-t border-border bg-muted px-3 py-1.5 text-[11px] text-muted-foreground">
              {t(
                "কাস্টমার কেয়ার প্রতিনিধি যুক্ত আছেন — AI এখন চুপ আছে।",
                "A customer care agent is live — AI is paused.",
              )}
            </p>
          )}

          <div className="flex items-end gap-2 border-t border-border bg-card p-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={1}
              placeholder={t("আপনার প্রশ্ন লিখুন…", "Type your question…")}
              className="max-h-28 min-h-11 flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-base outline-none focus:border-primary sm:text-sm"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={busy || !input.trim()}
              aria-label={t("পাঠান", "Send")}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

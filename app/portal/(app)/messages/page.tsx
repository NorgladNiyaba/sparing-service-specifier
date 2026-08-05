"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState, useCallback } from "react";
import { ADVISOR_NAME } from "@/lib/advisor";
import { usePortalContext } from "@/components/portal/portal-context";
import type { ClientMessage } from "@/lib/supabase/types";

/* ── Helpers ──────────────────────────────────────────────────────────── */

function formatTime(iso: string) {
  const d = new Date(iso);
  const isToday = d.toDateString() === new Date().toDateString();
  if (isToday) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " · " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function groupByDate(messages: ClientMessage[]) {
  const groups: { date: string; items: ClientMessage[] }[] = [];
  for (const msg of messages) {
    const date = new Date(msg.created_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    const last = groups[groups.length - 1];
    if (last?.date === date) last.items.push(msg);
    else groups.push({ date, items: [msg] });
  }
  return groups;
}

/* ── Delivery status ticks ───────────────────────────────────────────── */

function MessageTicks({ read, pending }: { read: boolean; pending: boolean }) {
  if (pending) return (
    <svg className="h-3 w-3 shrink-0 opacity-60" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 5.5v2.5l1.75 1.75" />
    </svg>
  );
  if (read) return (
    <svg className="h-3.5 w-3.5 shrink-0" style={{ color: "rgba(255,255,255,0.8)" }} fill="none" viewBox="0 0 20 12" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
      <path d="M1 6l4 4 6.5-8" />
      <path d="M6.5 6l4 4 6.5-8" />
    </svg>
  );
  return (
    <svg className="h-3.5 w-3.5 shrink-0" style={{ color: "rgba(255,255,255,0.5)" }} fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
      <path d="M1 6l4 4 6-8" />
    </svg>
  );
}

/* ── Date separator ──────────────────────────────────────────────────── */

function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex items-center justify-center py-2">
      <div
        className="rounded-full border px-3.5 py-1.5"
        style={{
          background:    "rgba(255,255,255,0.75)",
          backdropFilter: "blur(10px)",
          borderColor:   "var(--line)",
          boxShadow:     "0 1px 4px rgba(0,0,0,0.04)",
        }}
      >
        <span className="text-[0.58rem] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--ink-3)" }}>{date}</span>
      </div>
    </div>
  );
}

/* ── Chat bubble ─────────────────────────────────────────────────────── */

function Bubble({ msg, isClient, advisorName }: { msg: ClientMessage; isClient: boolean; advisorName: string }) {
  const isPending = msg.client_id === "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className={`group flex ${isClient ? "justify-end" : "justify-start"}`}
    >
      <div className={`flex max-w-[78%] flex-col gap-1 ${isClient ? "items-end" : "items-start"}`}>
        {!isClient && (
          <span className="ml-3 text-[0.62rem] font-semibold" style={{ color: "var(--ink-3)" }}>{advisorName}</span>
        )}

        <div
          className="rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
          style={isClient ? {
            background:             "linear-gradient(145deg, #d61b17 0%, #b91511 100%)",
            color:                  "#ffffff",
            borderBottomRightRadius: 6,
            boxShadow:              "0 2px 12px rgba(214,27,23,0.25), 0 1px 4px rgba(0,0,0,0.1)",
          } : {
            background:            "var(--surface)",
            color:                 "var(--ink)",
            border:                "1px solid var(--line)",
            borderBottomLeftRadius: 6,
            boxShadow:             "var(--shadow-card)",
          }}
        >
          {msg.body.split("\n").map((line, i, arr) => (
            <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
          ))}
        </div>

        {/* Timestamp + ticks — visible on bubble hover */}
        <div
          className="mx-3 flex items-center gap-1.5 transition-opacity duration-150 group-hover:opacity-100"
          style={{ opacity: 0.45 }}
        >
          <span className="text-[0.58rem]" style={{ color: "var(--ink-3)" }}>{formatTime(msg.created_at)}</span>
          {isClient && <MessageTicks read={msg.is_read} pending={isPending} />}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export default function MessagesPage() {
  const { activeClientId } = usePortalContext();
  const [messages,    setMessages]    = useState<ClientMessage[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [body,        setBody]        = useState("");
  const [sending,     setSending]     = useState(false);
  const [advisorName, setAdvisorName] = useState(ADVISOR_NAME);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchMessages = useCallback(async () => {
    if (!activeClientId) return;
    const res = await fetch("/api/portal/messages");
    if (!res.ok) return;
    const data = await res.json() as ClientMessage[];
    setMessages(data);
    setLoading(false);
  }, [activeClientId]);

  useEffect(() => {
    if (!activeClientId) return;
    setLoading(true);
    void fetchMessages();
    fetch("/api/portal/advisor")
      .then((r) => r.ok ? r.json() : null)
      .then((d: { name: string } | null) => { if (d?.name) setAdvisorName(d.name); })
      .catch(() => {});
  }, [activeClientId, fetchMessages]);

  useEffect(() => {
    if (!activeClientId) return;
    const id = setInterval(() => { void fetchMessages(); }, 30_000);
    return () => clearInterval(id);
  }, [activeClientId, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const trimmed = body.trim();
    if (!trimmed || sending) return;

    const optimistic: ClientMessage = {
      id: crypto.randomUUID(), client_id: "", sender: "client",
      body: trimmed, is_read: false, created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setBody("");
    if (textareaRef.current) { textareaRef.current.style.height = "auto"; }
    setSending(true);

    const res = await fetch("/api/portal/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: trimmed }),
    });
    setSending(false);

    if (res.ok) {
      const saved = await res.json() as ClientMessage;
      setMessages((prev) => prev.map((m) => m.id === optimistic.id ? saved : m));
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setBody(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  const initials = advisorName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const groups = groupByDate(messages);

  return (
    <div className="flex h-full flex-col" style={{ background: "var(--bg)" }}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div
        className="shrink-0 border-b px-5 py-3.5"
        style={{
          borderColor:    "var(--line)",
          background:     "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
          boxShadow:      "0 1px 0 var(--line)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg, #e03432, #b91511)" }}
            >
              {initials}
            </div>
            {/* Online indicator */}
            <span
              className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white"
              style={{ background: "#22c55e" }}
              title="Available"
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight" style={{ color: "var(--ink)" }}>{advisorName}</p>
            <p className="text-[0.65rem]" style={{ color: "var(--ink-3)" }}>
              Your Sparing advisor · replies within 1 business day
            </p>
          </div>
        </div>
      </div>

      {/* ── Thread ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--ink-4)", borderTopColor: "transparent" }} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: "rgba(214,27,23,0.07)" }}>
              <svg className="h-8 w-8" style={{ color: "#d61b17" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            </div>
            <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>No messages yet</p>
            <p className="mt-1.5 max-w-[240px] text-xs leading-relaxed" style={{ color: "var(--ink-3)" }}>
              Ask your advisor a question below — they reply within 1 business day.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {groups.map((group) => (
              <div key={group.date}>
                <DateSeparator date={group.date} />
                <div className="space-y-1.5">
                  <AnimatePresence initial={false}>
                    {group.items.map((msg) => (
                      <Bubble
                        key={msg.id}
                        msg={msg}
                        isClient={msg.sender === "client"}
                        advisorName={advisorName}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Compose ─────────────────────────────────────────────────── */}
      <div
        className="shrink-0 border-t px-4 py-3 sm:px-5"
        style={{ borderColor: "var(--line)", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)" }}
      >
        {/* Unified pill container — border changes on focus-within via CSS */}
        <div
          className="flex items-end overflow-hidden rounded-[22px] border bg-white transition-all duration-150 focus-within:border-brand focus-within:shadow-md"
          style={{ borderColor: "var(--line)" }}
        >
          <textarea
            ref={textareaRef}
            value={body}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Message your advisor…"
            rows={1}
            className="flex-1 resize-none border-none bg-transparent px-4 py-3 text-sm outline-none"
            style={{ color: "var(--ink)", minHeight: 44, maxHeight: 120, lineHeight: "1.55" }}
          />
          <div className="shrink-0 p-1.5">
            <button
              onClick={() => void handleSend()}
              disabled={!body.trim() || sending}
              className="press flex h-9 w-9 items-center justify-center rounded-full text-white transition-all hover:brightness-110 disabled:opacity-35"
              style={{ background: "linear-gradient(135deg, #d61b17, #b91511)" }}
              aria-label="Send message"
            >
              <svg className="h-4 w-4 translate-x-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.269 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>
        </div>
        <p className="mt-1.5 px-4 text-[0.6rem]" style={{ color: "var(--ink-4)" }}>
          Shift+Enter for new line · not for urgent matters
        </p>
      </div>
    </div>
  );
}

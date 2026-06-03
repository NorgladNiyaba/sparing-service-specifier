"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState, useCallback } from "react";
import { ADVISOR_NAME } from "@/lib/advisor";
import type { ClientMessage } from "@/lib/supabase/types";

function formatTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
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

export default function MessagesPage() {
  const [messages,  setMessages]  = useState<ClientMessage[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [body,      setBody]      = useState("");
  const [sending,   setSending]   = useState(false);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchMessages = useCallback(async () => {
    const res = await fetch("/api/portal/messages");
    if (!res.ok) return;
    const data = await res.json() as ClientMessage[];
    setMessages(data);
    setLoading(false);
  }, []);

  useEffect(() => { void fetchMessages(); }, [fetchMessages]);

  // Poll every 30s for new messages
  useEffect(() => {
    const id = setInterval(() => { void fetchMessages(); }, 30_000);
    return () => clearInterval(id);
  }, [fetchMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const trimmed = body.trim();
    if (!trimmed || sending) return;

    const optimistic: ClientMessage = {
      id:         crypto.randomUUID(),
      client_id:  "",
      sender:     "client",
      body:       trimmed,
      is_read:    false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setBody("");
    setSending(true);

    const res = await fetch("/api/portal/messages", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ body: trimmed }),
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

  // Auto-resize textarea
  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setBody(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  const groups = groupByDate(messages);

  return (
    <div className="flex h-full flex-col" style={{ background: "#f3f3f5" }}>
      {/* Header */}
      <div className="shrink-0 border-b bg-white px-6 py-4" style={{ borderColor: "#ebecef" }}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: "#d61b17" }}>
            {ADVISOR_NAME.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "#171717" }}>{ADVISOR_NAME}</p>
            <p className="text-xs" style={{ color: "#9ca3af" }}>Your Sparing advisor · replies within 1 business day</p>
          </div>
        </div>
      </div>

      {/* Thread */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#d61b17] border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: "rgba(214,27,23,0.07)" }}>
              <svg className="h-8 w-8" style={{ color: "#d61b17" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            </div>
            <p className="text-sm font-semibold" style={{ color: "#171717" }}>No messages yet</p>
            <p className="mt-1.5 max-w-xs text-xs leading-relaxed" style={{ color: "#9ca3af" }}>
              Send a message to your advisor below. They'll respond within 1 business day.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group.date}>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex-1" style={{ borderTop: "1px solid #ebecef" }} />
                  <span className="text-[0.65rem] font-semibold uppercase tracking-[0.08em]" style={{ color: "#9ca3af" }}>{group.date}</span>
                  <div className="flex-1" style={{ borderTop: "1px solid #ebecef" }} />
                </div>
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {group.items.map((msg) => {
                      const isClient = msg.sender === "client";
                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 6, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.2 }}
                          className={`flex ${isClient ? "justify-end" : "justify-start"}`}
                        >
                          <div className={`flex max-w-[75%] flex-col gap-1 ${isClient ? "items-end" : "items-start"}`}>
                            {!isClient && (
                              <span className="ml-1 text-[0.65rem] font-semibold" style={{ color: "#9ca3af" }}>{ADVISOR_NAME}</span>
                            )}
                            <div
                              className="rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                              style={isClient
                                ? { background: "#d61b17", color: "#ffffff", borderBottomRightRadius: 6 }
                                : { background: "#ffffff", color: "#171717", border: "1px solid #ebecef", borderBottomLeftRadius: 6 }}
                            >
                              {msg.body.split("\n").map((line, i) => (
                                <span key={i}>{line}{i < msg.body.split("\n").length - 1 && <br />}</span>
                              ))}
                            </div>
                            <span className="mx-1 text-[0.6rem]" style={{ color: "#9ca3af" }}>{formatTime(msg.created_at)}</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Compose */}
      <div className="shrink-0 border-t bg-white px-4 py-3 sm:px-6" style={{ borderColor: "#ebecef" }}>
        <div className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={body}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Message your advisor… (Enter to send, Shift+Enter for new line)"
            rows={1}
            className="flex-1 resize-none rounded-2xl border px-4 py-3 text-sm outline-none transition"
            style={{ borderColor: "#ebecef", color: "#171717", background: "#f9f9fb", minHeight: 44, maxHeight: 120, lineHeight: "1.5" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#d61b17")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#ebecef")}
          />
          <button
            onClick={() => void handleSend()}
            disabled={!body.trim() || sending}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white transition hover:opacity-85 disabled:opacity-40"
            style={{ background: "#d61b17" }}
            aria-label="Send message"
          >
            <svg className="h-4 w-4 translate-x-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.269 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
        <p className="mt-1.5 px-1 text-[0.63rem]" style={{ color: "#d1d5db" }}>Replies within 1 business day · not for urgent matters</p>
      </div>
    </div>
  );
}

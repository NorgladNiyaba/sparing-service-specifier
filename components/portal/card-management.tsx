"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

const BRAND_ICONS: Record<string, string> = {
  visa: "Visa", mastercard: "MC", amex: "Amex", discover: "Disc", unknown: "Card",
};

function CardRow({ method, onSetDefault, onRemove, canRemove }: {
  method: PaymentMethod;
  onSetDefault: () => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-white px-5 py-4" style={{ borderColor: method.isDefault ? "rgba(214,27,23,0.25)" : "#ebecef" }}>
      <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg text-[0.6rem] font-bold uppercase tracking-wider"
        style={{ background: method.isDefault ? "rgba(214,27,23,0.07)" : "#f8f8f9", color: method.isDefault ? "#d61b17" : "#6b7280" }}>
        {BRAND_ICONS[method.brand] ?? method.brand}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: "#171717" }}>•••• {method.last4}</span>
          {method.isDefault && (
            <span className="rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase" style={{ background: "rgba(214,27,23,0.08)", color: "#d61b17" }}>Default</span>
          )}
        </div>
        <p className="text-xs" style={{ color: "#9ca3af" }}>Expires {String(method.expMonth).padStart(2, "0")}/{method.expYear}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {!method.isDefault && (
          <button onClick={onSetDefault}
            className="rounded-lg border px-3 py-1.5 text-[0.65rem] font-medium transition hover:border-[#d61b17] hover:text-[#d61b17]"
            style={{ borderColor: "#ebecef", color: "#6b7280" }}>
            Set default
          </button>
        )}
        {canRemove && !method.isDefault && (
          <button onClick={onRemove}
            className="rounded-lg border px-3 py-1.5 text-[0.65rem] font-medium transition hover:border-red-300 hover:text-red-600"
            style={{ borderColor: "#ebecef", color: "#9ca3af" }}>
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

function AddCardForm({ onAdded }: { onAdded: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSaving(true); setError("");

    const res = await fetch("/api/portal/billing/payment-methods", { method: "POST" });
    const { clientSecret, error: apiErr } = await res.json() as { clientSecret?: string; error?: string };
    if (!clientSecret) { setError(apiErr ?? "Failed to create setup."); setSaving(false); return; }

    const cardEl = elements.getElement(CardElement);
    if (!cardEl) { setSaving(false); return; }

    const { error: stripeErr } = await stripe.confirmCardSetup(clientSecret, {
      payment_method: { card: cardEl },
    });

    setSaving(false);
    if (stripeErr) { setError(stripeErr.message ?? "Card setup failed."); return; }
    onAdded();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl border p-4" style={{ borderColor: "#ebecef" }}>
        <CardElement options={{
          style: {
            base: { fontSize: "14px", color: "#171717", "::placeholder": { color: "#9ca3af" } },
          },
        }} />
      </div>
      {error && <p className="text-xs" style={{ color: "#d61b17" }}>{error}</p>}
      <button type="submit" disabled={saving || !stripe}
        className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
        style={{ background: "#d61b17" }}>
        {saving ? "Saving…" : "Add card"}
      </button>
    </form>
  );
}

export default function CardManagement() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding,  setAdding]  = useState(false);

  const fetchMethods = useCallback(() => {
    fetch("/api/portal/billing/payment-methods")
      .then((r) => r.json())
      .then((d: { methods: PaymentMethod[] }) => { setMethods(d.methods ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchMethods(); }, [fetchMethods]);

  async function handleSetDefault(methodId: string) {
    await fetch("/api/portal/billing/payment-methods", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ methodId }),
    });
    fetchMethods();
  }

  async function handleRemove(methodId: string) {
    await fetch("/api/portal/billing/payment-methods", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ methodId }),
    });
    fetchMethods();
  }

  if (loading) return <p className="py-4 text-sm" style={{ color: "#9ca3af" }}>Loading cards…</p>;

  return (
    <div>
      <div className="space-y-2">
        {methods.length === 0 ? (
          <p className="py-4 text-sm" style={{ color: "#9ca3af" }}>No cards on file. Add one below.</p>
        ) : methods.map((m) => (
          <CardRow
            key={m.id}
            method={m}
            onSetDefault={() => void handleSetDefault(m.id)}
            onRemove={() => void handleRemove(m.id)}
            canRemove={methods.length > 1}
          />
        ))}
      </div>

      <div className="mt-4">
        <AnimatePresence>
          {adding ? (
            <motion.div key="form" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <Elements stripe={stripePromise}>
                <AddCardForm onAdded={() => { setAdding(false); fetchMethods(); }} />
              </Elements>
              <button onClick={() => setAdding(false)} className="mt-2 text-xs" style={{ color: "#9ca3af" }}>Cancel</button>
            </motion.div>
          ) : (
            <button onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 rounded-lg border px-4 py-2.5 text-xs font-medium transition hover:border-[#d61b17] hover:text-[#d61b17]"
              style={{ borderColor: "#ebecef", color: "#6b7280" }}>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add a card
            </button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

import { getPortalSession } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { NextResponse, type NextRequest } from "next/server";

async function getOrCreateStripeCustomer(clientId: string) {
  const admin = createAdminClient();
  const { data: client } = await admin
    .from("clients")
    .select("id, email, full_name, company_name, stripe_customer_id")
    .eq("id", clientId)
    .single();

  if (!client) return null;

  if (client.stripe_customer_id) return client.stripe_customer_id as string;

  const customer = await stripe.customers.create({
    email: client.email,
    name: client.company_name ?? client.full_name,
    metadata: { client_id: clientId },
  });

  await admin.from("clients").update({ stripe_customer_id: customer.id }).eq("id", clientId);
  return customer.id;
}

export async function GET() {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const customerId = await getOrCreateStripeCustomer(session.clientId);
  if (!customerId) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const methods = await stripe.paymentMethods.list({ customer: customerId, type: "card" });
  const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
  const defaultId = typeof customer.invoice_settings?.default_payment_method === "string"
    ? customer.invoice_settings.default_payment_method
    : customer.invoice_settings?.default_payment_method?.id ?? null;

  return NextResponse.json({
    methods: methods.data.map((m) => ({
      id:        m.id,
      brand:     m.card?.brand ?? "unknown",
      last4:     m.card?.last4 ?? "****",
      expMonth:  m.card?.exp_month,
      expYear:   m.card?.exp_year,
      isDefault: m.id === defaultId,
    })),
    defaultId,
  });
}

export async function POST(req: NextRequest) {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const customerId = await getOrCreateStripeCustomer(session.clientId);
  if (!customerId) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const intent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ["card"],
  });

  return NextResponse.json({ clientSecret: intent.client_secret });
}

export async function PATCH(req: NextRequest) {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { methodId } = await req.json() as { methodId?: string };
  if (!methodId) return NextResponse.json({ error: "methodId required" }, { status: 400 });

  const customerId = await getOrCreateStripeCustomer(session.clientId);
  if (!customerId) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: methodId },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { methodId } = await req.json() as { methodId?: string };
  if (!methodId) return NextResponse.json({ error: "methodId required" }, { status: 400 });

  const customerId = await getOrCreateStripeCustomer(session.clientId);
  if (!customerId) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const methods = await stripe.paymentMethods.list({ customer: customerId, type: "card" });
  if (methods.data.length <= 1) {
    return NextResponse.json({ error: "Cannot remove last payment method." }, { status: 400 });
  }

  const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
  const defaultId = typeof customer.invoice_settings?.default_payment_method === "string"
    ? customer.invoice_settings.default_payment_method
    : customer.invoice_settings?.default_payment_method?.id ?? null;

  if (methodId === defaultId) {
    return NextResponse.json({ error: "Cannot remove the default card. Set another as default first." }, { status: 400 });
  }

  await stripe.paymentMethods.detach(methodId);
  return NextResponse.json({ ok: true });
}

import type Stripe from "stripe";

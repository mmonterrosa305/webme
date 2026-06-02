import type Stripe from "stripe";

import type { ClientPlan } from "@/lib/clients/types";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

const PLAN_AMOUNTS: Record<
  ClientPlan,
  { oneTimeAmount: number; monthlyAmount: number }
> = {
  monthly: { oneTimeAmount: 0, monthlyAmount: 99 },
  starter: { oneTimeAmount: 199, monthlyAmount: 29 },
  premium: { oneTimeAmount: 599, monthlyAmount: 59 },
};

type CheckoutContext = {
  leadId: string;
  plan: ClientPlan;
  businessName: string;
  customerId: string;
  subscriptionId: string;
  email: string;
};

function getStripeObjectId(
  value: string | { id: string } | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? value : value.id;
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const legacySubscription = (
    invoice as Stripe.Invoice & { subscription?: string | { id: string } | null }
  ).subscription;

  const legacyId = getStripeObjectId(legacySubscription);
  if (legacyId) {
    return legacyId;
  }

  const parent = invoice.parent;
  if (parent?.type === "subscription_details") {
    return getStripeObjectId(parent.subscription_details?.subscription ?? null);
  }

  return null;
}

function getPlanAmounts(plan: ClientPlan) {
  return PLAN_AMOUNTS[plan] ?? PLAN_AMOUNTS.monthly;
}

function isClientPlan(value: string | undefined): value is ClientPlan {
  return value === "starter" || value === "monthly" || value === "premium";
}

function getMetadataValue(
  metadata: Stripe.Metadata | null | undefined,
  key: string,
): string | undefined {
  const value = metadata?.[key]?.trim();
  return value || undefined;
}

function getPriceToPlanMap(): Record<string, ClientPlan> {
  const entries: Array<[string | undefined, ClientPlan]> = [
    [process.env.STRIPE_MONTHLY_PRICE_ID?.trim(), "monthly"],
    [process.env.STRIPE_STARTER_SUB_PRICE_ID?.trim(), "starter"],
    [process.env.STRIPE_STARTER_PRICE_ID?.trim(), "starter"],
    [process.env.STRIPE_PREMIUM_SUB_PRICE_ID?.trim(), "premium"],
    [process.env.STRIPE_PREMIUM_PRICE_ID?.trim(), "premium"],
  ];

  return Object.fromEntries(
    entries.flatMap(([priceId, plan]) => (priceId ? [[priceId, plan]] : [])),
  );
}

function inferPlanFromSession(session: Stripe.Checkout.Session): ClientPlan | null {
  const metadataPlan = getMetadataValue(session.metadata, "plan");
  if (isClientPlan(metadataPlan)) {
    return metadataPlan;
  }

  const priceToPlan = getPriceToPlanMap();
  const lineItems = session.line_items?.data ?? [];

  for (const item of lineItems) {
    const priceId = getStripeObjectId(item.price);
    if (priceId && priceToPlan[priceId]) {
      return priceToPlan[priceId];
    }
  }

  return null;
}

async function getLeadBySiteSlug(siteSlug: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("leads")
    .select("id, business_name, owner_email")
    .eq("site_slug", siteSlug)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load lead for site slug: ${error.message}`);
  }

  return data;
}

async function loadCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<Stripe.Checkout.Session> {
  if (session.id.startsWith("cs_test_") || session.id.startsWith("cs_live_")) {
    return getStripe().checkout.sessions.retrieve(session.id, {
      expand: ["line_items.data.price", "subscription"],
    });
  }

  return session;
}

async function resolveCheckoutContext(
  webhookSession: Stripe.Checkout.Session,
): Promise<CheckoutContext | null> {
  const session = await loadCheckoutSession(webhookSession);

  let leadId = getMetadataValue(session.metadata, "lead_id");
  let plan = inferPlanFromSession(session);
  let businessName = getMetadataValue(session.metadata, "business_name");
  const siteSlug = getMetadataValue(session.metadata, "site_slug");

  if (!leadId && siteSlug) {
    const lead = await getLeadBySiteSlug(siteSlug);

    if (lead) {
      leadId = lead.id;
      businessName = businessName ?? lead.business_name ?? undefined;
    }
  }

  const customerId = getStripeObjectId(session.customer);
  const subscriptionId = getStripeObjectId(session.subscription);
  const email =
    session.customer_details?.email?.trim() ??
    session.customer_email?.trim() ??
    undefined;

  console.log("[stripe/webhook] Resolved checkout context", {
    sessionId: session.id,
    leadId: leadId ?? null,
    plan: plan ?? null,
    siteSlug: siteSlug ?? null,
    hasCustomerId: Boolean(customerId),
    hasSubscriptionId: Boolean(subscriptionId),
    hasEmail: Boolean(email),
    metadataKeys: session.metadata ? Object.keys(session.metadata) : [],
  });

  if (!leadId || !plan) {
    console.warn(
      "[stripe/webhook] Skipping checkout.session.completed — not a WebMe checkout",
      {
        sessionId: session.id,
        leadId: leadId ?? null,
        plan: plan ?? null,
        siteSlug: siteSlug ?? null,
      },
    );
    return null;
  }

  if (!customerId || !subscriptionId) {
    throw new Error(
      "Checkout session is missing stripe customer or subscription.",
    );
  }

  if (!email) {
    throw new Error("Checkout session is missing customer email.");
  }

  return {
    leadId,
    plan,
    businessName: businessName ?? "Unknown business",
    customerId,
    subscriptionId,
    email,
  };
}

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const context = await resolveCheckoutContext(session);

  if (!context) {
    return;
  }

  const { leadId, plan, businessName, customerId, subscriptionId, email } =
    context;
  const { oneTimeAmount, monthlyAmount } = getPlanAmounts(plan);
  const supabase = createAdminClient();

  const { error: leadUpdateError } = await supabase
    .from("leads")
    .update({ status: "won" })
    .eq("id", leadId);

  if (leadUpdateError) {
    throw new Error(`Failed to update lead status: ${leadUpdateError.message}`);
  }

  const clientRow = {
    lead_id: leadId,
    business_name: businessName,
    package: plan,
    owner_email: email,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    subscription_status: "active",
    one_time_amount: oneTimeAmount,
    monthly_amount: monthlyAmount,
    created_at: new Date().toISOString(),
  };

  const { data: existingClient, error: existingClientError } = await supabase
    .from("clients")
    .select("id")
    .eq("lead_id", leadId)
    .maybeSingle();

  if (existingClientError) {
    throw new Error(
      `Failed to check existing client: ${existingClientError.message}`,
    );
  }

  if (existingClient) {
    const { error: clientUpdateError } = await supabase
      .from("clients")
      .update({
        business_name: clientRow.business_name,
        package: clientRow.package,
        owner_email: clientRow.owner_email,
        stripe_customer_id: clientRow.stripe_customer_id,
        stripe_subscription_id: clientRow.stripe_subscription_id,
        subscription_status: clientRow.subscription_status,
        one_time_amount: clientRow.one_time_amount,
        monthly_amount: clientRow.monthly_amount,
      })
      .eq("lead_id", leadId);

    if (clientUpdateError) {
      throw new Error(`Failed to update client: ${clientUpdateError.message}`);
    }

    return;
  }

  const { error: clientInsertError } = await supabase
    .from("clients")
    .insert(clientRow);

  if (clientInsertError) {
    throw new Error(`Failed to create client: ${clientInsertError.message}`);
  }
}

export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
): Promise<void> {
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  const customerId = getStripeObjectId(invoice.customer);

  if (!subscriptionId && !customerId) {
    console.warn(
      "[stripe/webhook] invoice.payment_failed without customer or subscription",
      { invoiceId: invoice.id },
    );
    return;
  }

  const supabase = createAdminClient();

  let query = supabase
    .from("clients")
    .update({ subscription_status: "payment_failed" });

  if (subscriptionId) {
    query = query.eq("stripe_subscription_id", subscriptionId);
  } else if (customerId) {
    query = query.eq("stripe_customer_id", customerId);
  }

  const { error } = await query;

  if (error) {
    throw new Error(
      `Failed to update client payment status: ${error.message}`,
    );
  }
}

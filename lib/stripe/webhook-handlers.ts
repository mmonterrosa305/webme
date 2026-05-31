import type Stripe from "stripe";

import type { ClientPlan } from "@/lib/clients/types";
import { createAdminClient } from "@/lib/supabase/admin";

const PLAN_AMOUNTS: Record<
  ClientPlan,
  { oneTimeAmount: number; monthlyAmount: number }
> = {
  monthly: { oneTimeAmount: 0, monthlyAmount: 99 },
  starter: { oneTimeAmount: 199, monthlyAmount: 29 },
  premium: { oneTimeAmount: 599, monthlyAmount: 59 },
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

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const leadId = session.metadata?.lead_id?.trim();
  const plan = session.metadata?.plan?.trim() as ClientPlan | undefined;
  const businessName = session.metadata?.business_name?.trim();

  if (!leadId || !plan) {
    throw new Error("Checkout session is missing lead_id or plan metadata.");
  }

  const customerId = getStripeObjectId(session.customer);
  const subscriptionId = getStripeObjectId(session.subscription);

  if (!customerId || !subscriptionId) {
    throw new Error(
      "Checkout session is missing stripe customer or subscription.",
    );
  }

  const email =
    session.customer_details?.email?.trim() ??
    session.customer_email?.trim() ??
    null;

  if (!email) {
    throw new Error("Checkout session is missing customer email.");
  }

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
    business_name: businessName ?? "Unknown business",
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

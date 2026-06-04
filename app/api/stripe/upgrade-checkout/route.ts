import { NextResponse } from "next/server";

import {
  ClientAuthError,
  requirePortalClient,
} from "@/lib/client-auth/require-portal-client";
import { resolveClientLead } from "@/lib/client-auth/resolve-client-lead";
import { getAppUrl, getStripe } from "@/lib/stripe";
import {
  checkoutCustomTextForTrial,
  subscriptionDataWithTrial,
} from "@/lib/stripe/subscription-trial";

function getPriceId(envKey: string): string {
  const id = process.env[envKey]?.trim();

  if (!id) {
    throw new Error(`Missing ${envKey} environment variable.`);
  }

  return id;
}

export async function POST() {
  try {
    const { email, client } = await requirePortalClient();

    if (client.package !== "starter") {
      return NextResponse.json(
        { error: "Only Pro clients can upgrade to Elite from the portal." },
        { status: 403 },
      );
    }

    const lead = await resolveClientLead(client);

    if (!lead?.site_slug) {
      return NextResponse.json(
        { error: "No site is linked to your account yet." },
        { status: 404 },
      );
    }

    const setupPriceId = getPriceId("STRIPE_PREMIUM_PRICE_ID");
    const subPriceId = getPriceId("STRIPE_PREMIUM_SUB_PRICE_ID");
    const appUrl = getAppUrl();
    const dashboardUrl = `${appUrl}/client/dashboard`;

    const subscriptionMetadata = {
      lead_id: lead.id,
      site_slug: lead.site_slug,
      plan: "premium",
      business_name: client.business_name,
      owner_email: email,
      checkout_type: "upgrade",
    };

    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [
        { price: setupPriceId, quantity: 1 },
        { price: subPriceId, quantity: 1 },
      ],
      ...(client.stripe_customer_id
        ? { customer: client.stripe_customer_id }
        : { customer_email: email }),
      metadata: {
        ...subscriptionMetadata,
      },
      custom_text: checkoutCustomTextForTrial(),
      subscription_data: subscriptionDataWithTrial(subscriptionMetadata),
      success_url: `${dashboardUrl}?upgraded=true`,
      cancel_url: dashboardUrl,
    });

    if (!session.url) {
      throw new Error("Failed to create checkout session.");
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error instanceof ClientAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message =
      error instanceof Error ? error.message : "Checkout failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

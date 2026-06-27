import { NextResponse } from "next/server";

import { getLeadBySlug } from "@/lib/leads/get-lead-by-slug";
import {
  REQUIRED_STRIPE_PRICE_ENVS,
  STANDARD_PLAN_ID,
  STRIPE_HOSTING_SUB_PRICE_ENV,
  STRIPE_SITE_BUILD_PRICE_ENV,
} from "@/lib/plans/pricing";
import { getAppUrl, getStripe } from "@/lib/stripe";

function getPriceId(envKey: string): string {
  const id = process.env[envKey]?.trim();

  if (!id) {
    throw new Error(`Missing ${envKey} environment variable.`);
  }

  return id;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";

    if (!slug) {
      return NextResponse.json({ error: "slug is required." }, { status: 400 });
    }

    const lead = await getLeadBySlug(slug);

    if (!lead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    const setupPriceId = getPriceId(STRIPE_SITE_BUILD_PRICE_ENV);
    const subPriceId = getPriceId(STRIPE_HOSTING_SUB_PRICE_ENV);
    const appUrl = getAppUrl();
    const subscriptionMetadata = {
      lead_id: lead.id,
      site_slug: slug,
      plan: STANDARD_PLAN_ID,
      business_name: lead.business_name,
    };

    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [
        { price: setupPriceId, quantity: 1 },
        { price: subPriceId, quantity: 1 },
      ],
      customer_email: lead.owner_email ?? undefined,
      metadata: {
        lead_id: lead.id,
        site_slug: slug,
        plan: STANDARD_PLAN_ID,
        business_name: lead.business_name,
        stripe_env_requirements: REQUIRED_STRIPE_PRICE_ENVS.join(","),
      },
      subscription_data: { metadata: subscriptionMetadata },
      success_url: `${appUrl}/preview/${slug}?checkout=success`,
      cancel_url: `${appUrl}/preview/${slug}?checkout=canceled`,
    });

    if (!session.url) {
      throw new Error("Failed to create checkout session.");
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Checkout failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

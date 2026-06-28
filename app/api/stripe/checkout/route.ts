import { NextResponse } from "next/server";

import { getLeadBySlug } from "@/lib/leads/get-lead-by-slug";
import { STANDARD_PLAN_ID, HOSTING_TRIAL_DAYS } from "@/lib/plans/pricing";
import { getAppUrl, getStripe } from "@/lib/stripe";
import { getStripeCheckoutPriceIds } from "@/lib/stripe/price-env";

export const runtime = "nodejs";

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

    const { siteBuildPriceId, hostingSubPriceId } = getStripeCheckoutPriceIds();
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
        { price: siteBuildPriceId, quantity: 1 },
        { price: hostingSubPriceId, quantity: 1 },
      ],
      customer_email: lead.owner_email ?? undefined,
      metadata: {
        lead_id: lead.id,
        site_slug: slug,
        plan: STANDARD_PLAN_ID,
        business_name: lead.business_name,
      },
      subscription_data: {
        trial_period_days: HOSTING_TRIAL_DAYS,
        metadata: subscriptionMetadata,
      },
      success_url: `${appUrl}/checkout/success?slug=${encodeURIComponent(slug)}`,
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

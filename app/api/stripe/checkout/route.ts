import { NextResponse } from "next/server";

import { getLeadBySlug } from "@/lib/leads/get-lead-by-slug";
import { getLeadBuildPriceUsd } from "@/lib/leads/site-build-options";
import { getStripeSiteBuildPriceIdForAmount } from "@/lib/plans/build-price";
import { STANDARD_PLAN_ID, HOSTING_TRIAL_DAYS } from "@/lib/plans/pricing";
import { getStripe } from "@/lib/stripe";
import { getStripeHostingSubPriceId } from "@/lib/stripe/price-env";

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

    const buildPriceUsd = getLeadBuildPriceUsd(lead.site_metadata);
    const siteBuildPriceId = getStripeSiteBuildPriceIdForAmount(buildPriceUsd);
    const hostingSubPriceId = getStripeHostingSubPriceId();

    console.log("[stripe/checkout] selective build price", {
      slug,
      buildPriceUsd,
      siteBuildPriceId,
      hostingSubPriceId,
    });

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
      "https://webme-x6ed.onrender.com";
    const customerEmail = lead.owner_email?.trim() || undefined;
    const subscriptionMetadata = {
      lead_id: lead.id,
      site_slug: slug,
      plan: STANDARD_PLAN_ID,
      business_name: lead.business_name,
      build_price_usd: String(buildPriceUsd),
    };

    const sessionParams: Parameters<
      ReturnType<typeof getStripe>["checkout"]["sessions"]["create"]
    >[0] = {
      mode: "subscription",
      line_items: [
        { price: siteBuildPriceId, quantity: 1 },
        { price: hostingSubPriceId, quantity: 1 },
      ],
      customer_email: customerEmail,
      ...(customerEmail
        ? {
            payment_intent_data: {
              receipt_email: customerEmail,
            },
          }
        : {}),
      metadata: {
        lead_id: lead.id,
        site_slug: slug,
        plan: STANDARD_PLAN_ID,
        business_name: lead.business_name,
        build_price_usd: String(buildPriceUsd),
      },
      subscription_data: {
        trial_period_days: HOSTING_TRIAL_DAYS,
        metadata: subscriptionMetadata,
      },
      success_url: `${baseUrl}/checkout/success?slug=${encodeURIComponent(slug)}`,
      cancel_url: `${baseUrl}/preview/${encodeURIComponent(slug)}?mode=public`,
    };

    let session;
    try {
      session = await getStripe().checkout.sessions.create(sessionParams);
    } catch (createError) {
      const message =
        createError instanceof Error ? createError.message : String(createError);
      if (
        customerEmail &&
        /payment_intent_data/i.test(message) &&
        sessionParams.payment_intent_data
      ) {
        console.warn(
          "[stripe/checkout] payment_intent_data not allowed in subscription mode; retrying with customer_email only",
          { message },
        );
        const { payment_intent_data: _ignored, ...withoutPaymentIntentData } =
          sessionParams;
        session = await getStripe().checkout.sessions.create(
          withoutPaymentIntentData,
        );
      } else {
        throw createError;
      }
    }

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

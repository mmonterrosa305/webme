import { NextResponse } from "next/server";

import { getLeadBySlug } from "@/lib/leads/get-lead-by-slug";
import { getAppUrl, getStripe } from "@/lib/stripe";

const PLANS = {
  starter: {
    setupPriceEnv: "STRIPE_STARTER_PRICE_ID",
    subPriceEnv: "STRIPE_STARTER_SUB_PRICE_ID",
    label: "Starter",
  },
  monthly: {
    subPriceEnv: "STRIPE_MONTHLY_PRICE_ID",
    label: "Monthly",
  },
  premium: {
    setupPriceEnv: "STRIPE_PREMIUM_PRICE_ID",
    subPriceEnv: "STRIPE_PREMIUM_SUB_PRICE_ID",
    label: "Premium",
  },
} as const;

const REQUIRED_ENV_VARS = [
  "STRIPE_STARTER_PRICE_ID",
  "STRIPE_STARTER_SUB_PRICE_ID",
  "STRIPE_MONTHLY_PRICE_ID",
  "STRIPE_PREMIUM_PRICE_ID",
  "STRIPE_PREMIUM_SUB_PRICE_ID",
] as const;

type PlanId = keyof typeof PLANS;

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
    const plan = body.plan as PlanId;

    if (!slug || !(plan in PLANS)) {
      return NextResponse.json(
        { error: "slug and plan (starter | monthly | premium) are required." },
        { status: 400 },
      );
    }

    const lead = await getLeadBySlug(slug);

    if (!lead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    const planConfig = PLANS[plan];
    const setupPriceId =
      "setupPriceEnv" in planConfig
        ? getPriceId(planConfig.setupPriceEnv)
        : null;
    const subPriceId = getPriceId(planConfig.subPriceEnv);
    const appUrl = getAppUrl();

    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [
        ...(setupPriceId ? [{ price: setupPriceId, quantity: 1 }] : []),
        { price: subPriceId, quantity: 1 },
      ],
      customer_email: lead.owner_email ?? undefined,
      metadata: {
        lead_id: lead.id,
        site_slug: slug,
        plan,
        business_name: lead.business_name,
        stripe_env_requirements: REQUIRED_ENV_VARS.join(","),
      },
      subscription_data: {
        metadata: {
          lead_id: lead.id,
          site_slug: slug,
          plan,
          business_name: lead.business_name,
        },
      },
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

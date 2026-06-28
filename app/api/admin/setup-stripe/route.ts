import { NextResponse } from "next/server";

import {
  STRIPE_HOSTING_SUB_PRICE_ENV,
  STRIPE_SITE_BUILD_PRICE_ENV,
} from "@/lib/plans/pricing";
import {
  createFlatPricingPrices,
  getStripeModeFromSecretKey,
} from "@/lib/stripe/create-flat-pricing-prices";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();

    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: "Missing STRIPE_SECRET_KEY on this server." },
        { status: 500 },
      );
    }

    const stripeMode = getStripeModeFromSecretKey(stripeSecretKey);
    const { siteBuildPriceId, hostingSubPriceId } =
      await createFlatPricingPrices();

    return NextResponse.json({
      success: true,
      stripeMode,
      [STRIPE_SITE_BUILD_PRICE_ENV]: siteBuildPriceId,
      [STRIPE_HOSTING_SUB_PRICE_ENV]: hostingSubPriceId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Stripe setup failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

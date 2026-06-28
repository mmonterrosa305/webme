import { NextResponse } from "next/server";

import {
  resolveRenderServiceId,
  triggerRenderDeploy,
  updateRenderServiceEnvVar,
} from "@/lib/render/client";
import {
  createFlatPricingPrices,
  getStripeModeFromSecretKey,
} from "@/lib/stripe/create-flat-pricing-prices";
import {
  STRIPE_HOSTING_SUB_PRICE_ENV,
  STRIPE_SITE_BUILD_PRICE_ENV,
} from "@/lib/plans/pricing";

export const runtime = "nodejs";
export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const renderApiKey = process.env.RENDER_API_KEY?.trim();
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret")?.trim();
  const queryKey = url.searchParams.get("key")?.trim();
  const authHeader = request.headers.get("authorization")?.trim();

  if (cronSecret && querySecret === cronSecret) {
    return true;
  }

  if (renderApiKey && queryKey === renderApiKey) {
    return true;
  }

  if (renderApiKey && authHeader === `Bearer ${renderApiKey}`) {
    return true;
  }

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  return false;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        error:
          "Unauthorized. Visit with ?secret=CRON_SECRET or ?key=RENDER_API_KEY.",
      },
      { status: 401 },
    );
  }

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

    const serviceId = await resolveRenderServiceId();

    await updateRenderServiceEnvVar(
      serviceId,
      STRIPE_SITE_BUILD_PRICE_ENV,
      siteBuildPriceId,
    );
    await updateRenderServiceEnvVar(
      serviceId,
      STRIPE_HOSTING_SUB_PRICE_ENV,
      hostingSubPriceId,
    );

    let deployId: string | null = null;

    try {
      deployId = await triggerRenderDeploy(serviceId);
    } catch (deployError) {
      console.warn("[admin/setup-stripe] Render deploy trigger failed:", deployError);
    }

    return NextResponse.json({
      success: true,
      stripeMode,
      serviceId,
      deployId,
      [STRIPE_SITE_BUILD_PRICE_ENV]: siteBuildPriceId,
      [STRIPE_HOSTING_SUB_PRICE_ENV]: hostingSubPriceId,
      message:
        "Created Stripe prices and updated Render environment variables.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Stripe setup failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

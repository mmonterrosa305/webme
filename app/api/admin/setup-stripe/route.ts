import { NextResponse } from "next/server";

import {
  resolveRenderServiceId,
  triggerRenderDeploy,
  updateRenderServiceEnvVar,
} from "@/lib/render/client";
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

function resolveRenderApiKey(request: Request): string | undefined {
  const queryKey = new URL(request.url).searchParams.get("key")?.trim();
  const envKey = process.env.RENDER_API_KEY?.trim();

  return queryKey || envKey;
}

export async function GET(request: Request) {
  try {
    const renderApiKey = resolveRenderApiKey(request);

    if (!renderApiKey) {
      return NextResponse.json(
        {
          error:
            "Missing Render API key. Pass ?key=YOUR_RENDER_API_KEY or set RENDER_API_KEY on the server.",
        },
        { status: 400 },
      );
    }

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

    const serviceId = await resolveRenderServiceId(renderApiKey);

    await updateRenderServiceEnvVar(
      serviceId,
      STRIPE_SITE_BUILD_PRICE_ENV,
      siteBuildPriceId,
      renderApiKey,
    );
    await updateRenderServiceEnvVar(
      serviceId,
      STRIPE_HOSTING_SUB_PRICE_ENV,
      hostingSubPriceId,
      renderApiKey,
    );

    let deployId: string | null = null;

    try {
      deployId = await triggerRenderDeploy(serviceId, renderApiKey);
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

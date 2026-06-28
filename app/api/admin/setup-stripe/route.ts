import { NextResponse } from "next/server";

import {
  resolveRenderServiceId,
  triggerRenderDeploy,
  updateRenderServiceEnvVar,
  validateRenderApiKey,
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

function getQueryParam(request: Request, name: string): string | undefined {
  return new URL(request.url).searchParams.get(name)?.trim() || undefined;
}

async function resolveAuthorizedRenderApiKey(
  request: Request,
): Promise<string | null> {
  const envRenderKey = process.env.RENDER_API_KEY?.trim();
  const cronSecret = process.env.CRON_SECRET?.trim();
  const queryKey = getQueryParam(request, "key");
  const querySecret = getQueryParam(request, "secret");
  const authHeader = request.headers.get("authorization")?.trim();

  if (cronSecret && (querySecret === cronSecret || authHeader === `Bearer ${cronSecret}`)) {
    return envRenderKey ?? queryKey ?? null;
  }

  if (queryKey) {
    if (envRenderKey && queryKey === envRenderKey) {
      return queryKey;
    }

    if (await validateRenderApiKey(queryKey)) {
      return queryKey;
    }
  }

  if (envRenderKey && authHeader === `Bearer ${envRenderKey}`) {
    return envRenderKey;
  }

  return null;
}

export async function GET(request: Request) {
  const renderApiKey = await resolveAuthorizedRenderApiKey(request);

  if (!renderApiKey) {
    return NextResponse.json(
      {
        error:
          "Unauthorized. Visit with ?key=YOUR_RENDER_API_KEY or ?secret=CRON_SECRET.",
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

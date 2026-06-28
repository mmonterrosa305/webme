import type Stripe from "stripe";

import { getStripe } from "@/lib/stripe";

export type FlatPricingPriceIds = {
  siteBuildPriceId: string;
  hostingSubPriceId: string;
};

export async function createFlatPricingPrices(
  stripe: Stripe = getStripe(),
): Promise<FlatPricingPriceIds> {
  const siteBuildProduct = await stripe.products.create({
    name: "WebMe Site Build",
    description: "One-time professional website build fee",
  });

  const siteBuildPrice = await stripe.prices.create({
    product: siteBuildProduct.id,
    unit_amount: 29900,
    currency: "usd",
  });

  const hostingProduct = await stripe.products.create({
    name: "WebMe Hosting",
    description: "Monthly website hosting and maintenance",
  });

  const hostingPrice = await stripe.prices.create({
    product: hostingProduct.id,
    unit_amount: 999,
    currency: "usd",
    recurring: { interval: "month" },
  });

  return {
    siteBuildPriceId: siteBuildPrice.id,
    hostingSubPriceId: hostingPrice.id,
  };
}

export function getStripeModeFromSecretKey(secretKey: string): "live" | "test" | "unknown" {
  if (secretKey.startsWith("sk_live_")) {
    return "live";
  }

  if (secretKey.startsWith("sk_test_")) {
    return "test";
  }

  return "unknown";
}

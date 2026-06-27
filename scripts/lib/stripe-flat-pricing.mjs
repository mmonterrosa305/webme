import Stripe from "stripe";

export const SITE_BUILD_PRICE_ENV = "STRIPE_SITE_BUILD_PRICE_ID";
export const HOSTING_SUB_PRICE_ENV = "STRIPE_HOSTING_SUB_PRICE_ID";

/**
 * Create WebMe flat pricing products in Stripe (test or live, per secret key).
 */
export async function createFlatPricingPrices(stripeSecretKey) {
  const stripe = new Stripe(stripeSecretKey);

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

export function formatPricingOutput({ mode, siteBuildPriceId, hostingSubPriceId }) {
  const modeLabel = mode === "live" ? "LIVE" : mode === "test" ? "TEST" : "UNKNOWN";

  return [
    "",
    `WebMe flat pricing created in Stripe (${modeLabel} mode):`,
    "",
    `  Site build (one-time $299):  ${siteBuildPriceId}`,
    `  Hosting (monthly $9.99):     ${hostingSubPriceId}`,
    "",
    "Add to .env.local:",
    "",
    `${SITE_BUILD_PRICE_ENV}=${siteBuildPriceId}`,
    `${HOSTING_SUB_PRICE_ENV}=${hostingSubPriceId}`,
    "",
  ].join("\n");
}

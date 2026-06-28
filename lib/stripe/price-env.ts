const LIVE_SITE_BUILD_PRICE_ID = "price_1Tn74SCmxMwUNkLyegoeNttP";
const LIVE_HOSTING_SUB_PRICE_ID = "price_1Tn74SCmxMwUNkLypO8tBXwk";

function getEnvOrFallback(
  name: "STRIPE_SITE_BUILD_PRICE_ID" | "STRIPE_HOSTING_SUB_PRICE_ID",
  fallback: string,
): string {
  const value = process.env[name]?.trim();
  return value || fallback;
}

export function getStripeSiteBuildPriceId(): string {
  return getEnvOrFallback("STRIPE_SITE_BUILD_PRICE_ID", LIVE_SITE_BUILD_PRICE_ID);
}

export function getStripeHostingSubPriceId(): string {
  return getEnvOrFallback(
    "STRIPE_HOSTING_SUB_PRICE_ID",
    LIVE_HOSTING_SUB_PRICE_ID,
  );
}

export function getStripeCheckoutPriceIds(): {
  siteBuildPriceId: string;
  hostingSubPriceId: string;
} {
  return {
    siteBuildPriceId: getStripeSiteBuildPriceId(),
    hostingSubPriceId: getStripeHostingSubPriceId(),
  };
}

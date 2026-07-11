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
  const siteBuildEnv = process.env.STRIPE_SITE_BUILD_PRICE_ID?.trim() || "";
  const hostingSubEnv = process.env.STRIPE_HOSTING_SUB_PRICE_ID?.trim() || "";
  const siteBuildPriceId = siteBuildEnv || LIVE_SITE_BUILD_PRICE_ID;
  const hostingSubPriceId = hostingSubEnv || LIVE_HOSTING_SUB_PRICE_ID;

  console.log("[stripe/price-env] getStripeCheckoutPriceIds()", {
    STRIPE_SITE_BUILD_PRICE_ID: siteBuildEnv || "(unset)",
    STRIPE_HOSTING_SUB_PRICE_ID: hostingSubEnv || "(unset)",
    siteBuildPriceId,
    hostingSubPriceId,
    siteBuildUsingFallback: !siteBuildEnv,
    hostingSubUsingFallback: !hostingSubEnv,
  });

  return {
    siteBuildPriceId,
    hostingSubPriceId,
  };
}

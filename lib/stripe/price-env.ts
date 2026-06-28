function getRequiredEnv(name: "STRIPE_SITE_BUILD_PRICE_ID" | "STRIPE_HOSTING_SUB_PRICE_ID"): string {
  // Bracket access so Next.js does not inline stale values at build time.
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing ${name} environment variable.`);
  }

  return value;
}

export function getStripeSiteBuildPriceId(): string {
  return getRequiredEnv("STRIPE_SITE_BUILD_PRICE_ID");
}

export function getStripeHostingSubPriceId(): string {
  return getRequiredEnv("STRIPE_HOSTING_SUB_PRICE_ID");
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

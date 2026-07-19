import {
  getStripeSiteBuildPriceId,
} from "@/lib/stripe/price-env";

/** Allowed one-time site-build amounts selectable at build time. */
export const SITE_BUILD_PRICE_OPTIONS = [99, 200, 500] as const;

export type SiteBuildPriceUsd = (typeof SITE_BUILD_PRICE_OPTIONS)[number];

export const DEFAULT_SITE_BUILD_PRICE_USD: SiteBuildPriceUsd = 99;

const PRICE_ENV_BY_AMOUNT: Record<SiteBuildPriceUsd, string> = {
  99: "STRIPE_SITE_BUILD_PRICE_ID_99",
  200: "STRIPE_SITE_BUILD_PRICE_ID_200",
  500: "STRIPE_SITE_BUILD_PRICE_ID_500",
};

export function isSiteBuildPriceUsd(value: unknown): value is SiteBuildPriceUsd {
  return (
    typeof value === "number" &&
    (SITE_BUILD_PRICE_OPTIONS as readonly number[]).includes(value)
  );
}

export function parseSiteBuildPriceUsd(
  value: unknown,
): SiteBuildPriceUsd | null {
  if (isSiteBuildPriceUsd(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim());
    if (isSiteBuildPriceUsd(parsed)) {
      return parsed;
    }
  }
  return null;
}

export function formatSiteBuildPriceDisplay(
  amount: SiteBuildPriceUsd | null | undefined,
): string {
  const usd = amount && isSiteBuildPriceUsd(amount) ? amount : DEFAULT_SITE_BUILD_PRICE_USD;
  return `$${usd}`;
}

/** Resolve Stripe Price ID for a stored site-build amount. */
export function getStripeSiteBuildPriceIdForAmount(
  amount: SiteBuildPriceUsd | null | undefined,
): string {
  const usd =
    amount && isSiteBuildPriceUsd(amount)
      ? amount
      : DEFAULT_SITE_BUILD_PRICE_USD;
  const envName = PRICE_ENV_BY_AMOUNT[usd];
  const fromEnv = process.env[envName]?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  // Legacy fallback — only used if selective price env vars are missing.
  console.warn(
    `[build-price] Missing ${envName}; falling back to STRIPE_SITE_BUILD_PRICE_ID`,
  );
  return getStripeSiteBuildPriceId();
}

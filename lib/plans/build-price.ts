import type Stripe from "stripe";

/** Allowed one-time site-build amounts selectable at build time. */
export const SITE_BUILD_PRICE_OPTIONS = [99, 200, 500] as const;

export type SiteBuildPriceUsd = (typeof SITE_BUILD_PRICE_OPTIONS)[number];

export const DEFAULT_SITE_BUILD_PRICE_USD: SiteBuildPriceUsd = 99;

const PRICE_ENV_BY_AMOUNT: Record<SiteBuildPriceUsd, string> = {
  99: "STRIPE_SITE_BUILD_PRICE_ID_99",
  200: "STRIPE_SITE_BUILD_PRICE_ID_200",
  500: "STRIPE_SITE_BUILD_PRICE_ID_500",
};

export class MissingSiteBuildPriceEnvError extends Error {
  readonly envName: string;
  readonly buildPriceUsd: SiteBuildPriceUsd;

  constructor(envName: string, buildPriceUsd: SiteBuildPriceUsd) {
    super(
      `Checkout misconfigured: missing ${envName} for $${buildPriceUsd} site build. ` +
        `Set this Stripe Price ID on the server — refusing to fall back to another amount.`,
    );
    this.name = "MissingSiteBuildPriceEnvError";
    this.envName = envName;
    this.buildPriceUsd = buildPriceUsd;
  }
}

export class MismatchedSiteBuildPriceError extends Error {
  readonly priceId: string;
  readonly expectedUsd: SiteBuildPriceUsd;
  readonly actualCents: number | null;

  constructor(
    priceId: string,
    expectedUsd: SiteBuildPriceUsd,
    actualCents: number | null,
  ) {
    const actualLabel =
      actualCents == null ? "unknown" : `$${actualCents / 100}`;
    super(
      `Checkout misconfigured: Stripe price ${priceId} is ${actualLabel}, ` +
        `but this site requires $${expectedUsd}. Refusing to charge the wrong amount.`,
    );
    this.name = "MismatchedSiteBuildPriceError";
    this.priceId = priceId;
    this.expectedUsd = expectedUsd;
    this.actualCents = actualCents;
  }
}

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
  const usd =
    amount && isSiteBuildPriceUsd(amount) ? amount : DEFAULT_SITE_BUILD_PRICE_USD;
  return `$${usd}`;
}

export function getSiteBuildPriceEnvName(
  amount: SiteBuildPriceUsd,
): string {
  return PRICE_ENV_BY_AMOUNT[amount];
}

/**
 * Resolve Stripe Price ID for a stored site-build amount.
 * Never falls back to STRIPE_SITE_BUILD_PRICE_ID — wrong charges are worse than a failed checkout.
 */
export function getStripeSiteBuildPriceIdForAmount(
  amount: SiteBuildPriceUsd | null | undefined,
): string {
  const usd =
    amount && isSiteBuildPriceUsd(amount)
      ? amount
      : DEFAULT_SITE_BUILD_PRICE_USD;
  const envName = PRICE_ENV_BY_AMOUNT[usd];
  const fromEnv = process.env[envName]?.trim();
  if (!fromEnv) {
    console.error("[build-price] Missing selective site-build price env", {
      envName,
      buildPriceUsd: usd,
    });
    throw new MissingSiteBuildPriceEnvError(envName, usd);
  }
  return fromEnv;
}

/** Confirm the configured Stripe Price's unit_amount matches the lead's selected tier. */
export async function assertStripeSiteBuildPriceMatchesAmount(
  stripe: Stripe,
  priceId: string,
  expectedUsd: SiteBuildPriceUsd,
): Promise<void> {
  const expectedCents = expectedUsd * 100;
  const price = await stripe.prices.retrieve(priceId);
  const actualCents =
    typeof price.unit_amount === "number" ? price.unit_amount : null;

  if (actualCents !== expectedCents) {
    console.error("[build-price] Stripe price amount mismatch", {
      priceId,
      expectedUsd,
      expectedCents,
      actualCents,
      livemode: price.livemode,
    });
    throw new MismatchedSiteBuildPriceError(priceId, expectedUsd, actualCents);
  }

  if (!price.active) {
    throw new Error(
      `Checkout misconfigured: Stripe price ${priceId} for $${expectedUsd} is inactive.`,
    );
  }
}

/**
 * Creates WebMe flat pricing in Stripe (test or live, based on STRIPE_SECRET_KEY)
 * and writes the new price IDs to .env.local.
 *
 * For production: set STRIPE_SECRET_KEY=sk_live_... in .env.local, then run:
 *   node scripts/setup-live-stripe.mjs
 *
 * Usage:
 *   node scripts/setup-live-stripe.mjs
 */

import { loadEnvLocal, getStripeMode } from "./lib/load-env-local.mjs";
import {
  createFlatPricingPrices,
  formatPricingOutput,
  HOSTING_SUB_PRICE_ENV,
  SITE_BUILD_PRICE_ENV,
} from "./lib/stripe-flat-pricing.mjs";
import { updateEnvLocal } from "./lib/update-env-local.mjs";

loadEnvLocal();

async function main() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    console.error(
      "Missing STRIPE_SECRET_KEY. Add it to .env.local or export it before running.",
    );
    process.exit(1);
  }

  const mode = getStripeMode(secretKey);

  if (mode === "unknown") {
    console.warn(
      "Warning: STRIPE_SECRET_KEY does not look like sk_test_ or sk_live_.",
    );
  }

  console.log(`Using Stripe ${mode.toUpperCase()} mode (${secretKey.slice(0, 12)}…)`);

  const prices = await createFlatPricingPrices(secretKey);

  console.log(
    formatPricingOutput({
      mode,
      siteBuildPriceId: prices.siteBuildPriceId,
      hostingSubPriceId: prices.hostingSubPriceId,
    }),
  );

  const envPath = updateEnvLocal({
    [SITE_BUILD_PRICE_ENV]: prices.siteBuildPriceId,
    [HOSTING_SUB_PRICE_ENV]: prices.hostingSubPriceId,
  });

  console.log(`Updated ${envPath} with new price IDs.`);
}

void main();

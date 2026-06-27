/**
 * Creates Stripe products/prices for WebMe's flat pricing model.
 * Reads STRIPE_SECRET_KEY from .env.local automatically.
 *
 * Usage:
 *   node scripts/create-stripe-pricing.mjs
 */

import { loadEnvLocal, getStripeMode } from "./lib/load-env-local.mjs";
import {
  createFlatPricingPrices,
  formatPricingOutput,
} from "./lib/stripe-flat-pricing.mjs";

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
  const prices = await createFlatPricingPrices(secretKey);

  console.log(
    formatPricingOutput({
      mode,
      siteBuildPriceId: prices.siteBuildPriceId,
      hostingSubPriceId: prices.hostingSubPriceId,
    }),
  );
}

void main();

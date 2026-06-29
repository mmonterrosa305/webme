/**
 * Create WebMe flat Stripe prices ($299 one-time + $9.99/mo hosting).
 * Reads STRIPE_SECRET_KEY from .env.local automatically.
 *
 * Run: node fix-stripe.mjs
 */

import { loadEnvLocal, getStripeMode } from "./scripts/lib/load-env-local.mjs";
import { createFlatPricingPrices } from "./scripts/lib/stripe-flat-pricing.mjs";

loadEnvLocal();

async function main() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    console.error("Missing STRIPE_SECRET_KEY in .env.local");
    process.exit(1);
  }

  const mode = getStripeMode(secretKey);
  console.log(`Stripe mode: ${mode.toUpperCase()}`);

  const { siteBuildPriceId, hostingSubPriceId } =
    await createFlatPricingPrices(secretKey);

  console.log("");
  console.log("New price IDs:");
  console.log(`  STRIPE_SITE_BUILD_PRICE_ID=${siteBuildPriceId}`);
  console.log(`  STRIPE_HOSTING_SUB_PRICE_ID=${hostingSubPriceId}`);
  console.log("");
}

void main();

/**
 * Creates Stripe products/prices for WebMe's flat pricing model.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_... node scripts/create-stripe-pricing.mjs
 *
 * Add the printed price IDs to .env.local:
 *   STRIPE_SITE_BUILD_PRICE_ID=price_...
 *   STRIPE_HOSTING_SUB_PRICE_ID=price_...
 */

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

async function main() {
  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    console.error("Set STRIPE_SECRET_KEY before running this script.");
    process.exit(1);
  }

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

  console.log("\nWebMe flat pricing created in Stripe:\n");
  console.log(`Site build (one-time $299):  ${siteBuildPrice.id}`);
  console.log(`Hosting (monthly $9.99):     ${hostingPrice.id}`);
  console.log("\nAdd to .env.local:\n");
  console.log(`STRIPE_SITE_BUILD_PRICE_ID=${siteBuildPrice.id}`);
  console.log(`STRIPE_HOSTING_SUB_PRICE_ID=${hostingPrice.id}`);
  console.log("");
}

void main();

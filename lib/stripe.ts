import Stripe from "stripe";

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY?.trim();

    if (!key) {
      throw new Error("Missing STRIPE_SECRET_KEY environment variable.");
    }

    stripe = new Stripe(key);
  }

  return stripe;
}

export function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!url) {
    return "http://localhost:3000";
  }

  return url.replace(/\/$/, "");
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!secret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET environment variable.");
  }

  return secret;
}

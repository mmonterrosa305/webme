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

export function getStripeWebhookSecrets(): string[] {
  const raw = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!raw) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET environment variable.");
  }

  const secrets = raw
    .split(",")
    .map((secret) => secret.trim())
    .filter(Boolean);

  if (secrets.length === 0) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET environment variable.");
  }

  return secrets;
}

/** @deprecated Use getStripeWebhookSecrets() */
export function getStripeWebhookSecret(): string {
  return getStripeWebhookSecrets()[0]!;
}

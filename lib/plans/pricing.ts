import type { ClientPlan } from "@/lib/clients/types";

/** Current WebMe plan — $299 build + $9.99/mo hosting. */
export const STANDARD_PLAN_ID = "standard" satisfies ClientPlan;

export const SITE_BUILD_FEE = 299;
export const HOSTING_MONTHLY_FEE = 9.99;

export const SITE_BUILD_FEE_DISPLAY = "$299";
export const HOSTING_MONTHLY_FEE_DISPLAY = "$9.99/mo";
export const PRICING_HEADLINE = "$299 + $9.99/mo hosting";
export const PRICING_SUBLINE = "$299 one-time site build + $9.99/mo hosting";

export const PLAN_AMOUNTS = {
  oneTimeAmount: SITE_BUILD_FEE,
  monthlyAmount: HOSTING_MONTHLY_FEE,
} as const;

export const STRIPE_SITE_BUILD_PRICE_ENV = "STRIPE_SITE_BUILD_PRICE_ID";
export const STRIPE_HOSTING_SUB_PRICE_ENV = "STRIPE_HOSTING_SUB_PRICE_ID";

export const REQUIRED_STRIPE_PRICE_ENVS = [
  STRIPE_SITE_BUILD_PRICE_ENV,
  STRIPE_HOSTING_SUB_PRICE_ENV,
] as const;

export const PLAN_FEATURES = [
  "Professional website built for your business",
  "Custom domain included",
  "Mobile-friendly design",
  "Contact form included",
  "Unlimited editing in your dashboard",
  "Photo & logo uploads",
  "Hosted and maintained by WebMe",
  "Cancel hosting anytime",
] as const;

export function isStandardPlan(plan: string): boolean {
  return plan === STANDARD_PLAN_ID;
}

export function isLegacyPlan(plan: string): boolean {
  return plan === "monthly" || plan === "starter" || plan === "premium";
}

export function isActiveClientPlan(plan: string): plan is ClientPlan {
  return isStandardPlan(plan) || isLegacyPlan(plan);
}

export function getStripePriceToPlanMap(): Record<string, ClientPlan> {
  const siteBuildPriceId = process.env.STRIPE_SITE_BUILD_PRICE_ID?.trim();
  const hostingSubPriceId = process.env.STRIPE_HOSTING_SUB_PRICE_ID?.trim();

  const entries: Array<[string | undefined, ClientPlan]> = [
    [hostingSubPriceId, STANDARD_PLAN_ID],
    [siteBuildPriceId, STANDARD_PLAN_ID],
    // Legacy price IDs — keep for existing subscriptions and webhooks
    [process.env.STRIPE_MONTHLY_PRICE_ID?.trim(), "monthly"],
    [process.env.STRIPE_STARTER_SUB_PRICE_ID?.trim(), "starter"],
    [process.env.STRIPE_STARTER_PRICE_ID?.trim(), "starter"],
    [process.env.STRIPE_PREMIUM_SUB_PRICE_ID?.trim(), "premium"],
    [process.env.STRIPE_PREMIUM_PRICE_ID?.trim(), "premium"],
  ];

  return Object.fromEntries(
    entries.flatMap(([priceId, plan]) => (priceId ? [[priceId, plan]] : [])),
  );
}

export function getPlanAmounts(plan: ClientPlan) {
  if (plan === STANDARD_PLAN_ID) {
    return PLAN_AMOUNTS;
  }

  const legacyAmounts: Record<
    Exclude<ClientPlan, typeof STANDARD_PLAN_ID>,
    { oneTimeAmount: number; monthlyAmount: number }
  > = {
    monthly: { oneTimeAmount: 0, monthlyAmount: 99 },
    starter: { oneTimeAmount: 199, monthlyAmount: 29 },
    premium: { oneTimeAmount: 599, monthlyAmount: 59 },
  };

  return legacyAmounts[plan as Exclude<ClientPlan, typeof STANDARD_PLAN_ID>];
}

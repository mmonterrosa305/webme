import type { ClientPlan } from "@/lib/clients/types";
import { STANDARD_PLAN_ID } from "@/lib/plans/pricing";

export const DOMAIN_SEARCH_TLDS = ["com", "net", "org", "io"] as const;

export type DomainTld = (typeof DOMAIN_SEARCH_TLDS)[number];

export const DOMAIN_PRICE_LIMIT_STANDARD = 50;
export const DOMAIN_PRICE_LIMIT_LEGACY_STARTER = 15;

export function getDomainPriceLimit(plan: string): number {
  if (plan === "starter") {
    return DOMAIN_PRICE_LIMIT_LEGACY_STARTER;
  }

  return DOMAIN_PRICE_LIMIT_STANDARD;
}

export function isDomainClaimEligiblePlan(plan: string): plan is ClientPlan {
  return (
    plan === STANDARD_PLAN_ID || plan === "premium" || plan === "starter"
  );
}

export function normalizeDomainQuery(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(".")[0]
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "");
}

export function clientShouldShowDomainClaim(options: {
  plan: string;
  domainStatus: string | null;
}): boolean {
  if (!isDomainClaimEligiblePlan(options.plan)) {
    return false;
  }

  return options.domainStatus !== "active";
}

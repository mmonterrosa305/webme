import type { ClientPlan } from "@/lib/clients/types";

export const DOMAIN_SEARCH_TLDS = ["com", "net", "org", "io"] as const;

export type DomainTld = (typeof DOMAIN_SEARCH_TLDS)[number];

export const DOMAIN_PRICE_LIMITS: Record<"starter" | "premium", number> = {
  starter: 15,
  premium: 50,
};

export function getDomainPriceLimit(plan: string): number {
  if (plan === "premium") {
    return DOMAIN_PRICE_LIMITS.premium;
  }

  return DOMAIN_PRICE_LIMITS.starter;
}

export function isDomainClaimEligiblePlan(plan: string): plan is ClientPlan {
  return plan === "starter" || plan === "premium";
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

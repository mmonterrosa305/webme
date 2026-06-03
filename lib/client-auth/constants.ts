import type { ClientPlan } from "@/lib/clients/types";

/** Pro and Elite plans in the product map to starter and premium in Stripe/Supabase. */
export const PORTAL_ELIGIBLE_PLANS = new Set<ClientPlan>(["starter", "premium"]);

export function isPortalEligiblePlan(plan: string | null | undefined): boolean {
  return PORTAL_ELIGIBLE_PLANS.has(plan as ClientPlan);
}

export function getPlanDisplayName(plan: string): string {
  switch (plan) {
    case "starter":
      return "Pro";
    case "premium":
      return "Elite";
    case "monthly":
      return "Basic";
    default:
      return plan;
  }
}

export function getSiteStatusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Live";
    case "payment_failed":
      return "Payment issue";
    default:
      return status.replace("_", " ");
  }
}

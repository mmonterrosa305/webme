import type { ClientPlan } from "@/lib/clients/types";

/** Client OTP validity — must match Supabase Auth → Email OTP Expiration (seconds). */
export const CLIENT_MAGIC_LINK_EXPIRY_SECONDS = 600;
export const CLIENT_OTP_EXPIRY_SECONDS = CLIENT_MAGIC_LINK_EXPIRY_SECONDS;

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

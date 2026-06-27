import type { ClientPlan } from "@/lib/clients/types";
import { STANDARD_PLAN_ID } from "@/lib/plans/pricing";

/** Client OTP validity — must match Supabase Auth → Email OTP Expiration (seconds). */
export const CLIENT_MAGIC_LINK_EXPIRY_SECONDS = 600;
export const CLIENT_OTP_EXPIRY_SECONDS = CLIENT_MAGIC_LINK_EXPIRY_SECONDS;

/** All paying WebMe clients can access the client dashboard. */
export const PORTAL_ELIGIBLE_PLANS = new Set<ClientPlan>([
  STANDARD_PLAN_ID,
  "starter",
  "premium",
  "monthly",
]);

export function isPortalEligiblePlan(plan: string | null | undefined): boolean {
  return PORTAL_ELIGIBLE_PLANS.has(plan as ClientPlan);
}

export function getPlanDisplayName(plan: string): string {
  switch (plan) {
    case STANDARD_PLAN_ID:
      return "WebMe";
    case "starter":
      return "Pro (legacy)";
    case "premium":
      return "Elite (legacy)";
    case "monthly":
      return "Basic (legacy)";
    default:
      return "WebMe";
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

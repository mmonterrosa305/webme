import type { ClientPlan } from "@/lib/clients/types";

export const PREVIEW_FREE_EDITS = 3;
export const BASIC_EDITS_PER_MONTH = 1;

export function isUnlimitedEditsPlan(plan: string): boolean {
  return plan === "starter" || plan === "premium";
}

export function isLimitedDashboardPlan(plan: string): boolean {
  return plan === "monthly";
}

export function isFullEditorPlan(plan: string): boolean {
  return plan === "starter" || plan === "premium";
}

export function getMonthYear(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function getNextMonthResetDate(date: Date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

export function formatResetDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function planSupportsDomainClaim(plan: string): plan is ClientPlan {
  return plan === "premium";
}

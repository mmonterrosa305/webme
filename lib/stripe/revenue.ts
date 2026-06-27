import type Stripe from "stripe";

import type { ClientPlan } from "@/lib/clients/types";
import {
  getStripePriceToPlanMap,
  isActiveClientPlan,
  STANDARD_PLAN_ID,
} from "@/lib/plans/pricing";
import { getStripe } from "@/lib/stripe";

export type PlanBreakdown = {
  plan: ClientPlan | "unknown";
  label: string;
  count: number;
  mrr: number;
};

export type MrrTrendPoint = {
  monthKey: string;
  label: string;
  mrr: number;
};

export type RevenueInvoice = {
  id: string;
  number: string | null;
  customerName: string;
  amount: number;
  status: string;
  date: string;
};

export type RevenueData = {
  mrr: number;
  arr: number;
  activeSubscriptions: number;
  collectedMtd: number;
  pendingInvoices: number;
  mrrByPlan: PlanBreakdown[];
  mrrTrend: MrrTrendPoint[];
  recentInvoices: RevenueInvoice[];
};

const PLAN_LABELS: Record<ClientPlan, string> = {
  standard: "WebMe",
  monthly: "Basic (legacy)",
  starter: "Pro (legacy)",
  premium: "Elite (legacy)",
};

function priceToMonthlyCents(price: Stripe.Price, quantity = 1): number {
  if (!price.recurring) {
    return 0;
  }

  const amount = price.unit_amount ?? 0;
  const interval = price.recurring.interval;
  const intervalCount = price.recurring.interval_count ?? 1;

  let monthly = 0;

  switch (interval) {
    case "month":
      monthly = amount / intervalCount;
      break;
    case "year":
      monthly = amount / (12 * intervalCount);
      break;
    case "week":
      monthly = (amount * 52) / (12 * intervalCount);
      break;
    case "day":
      monthly = (amount * 365) / (12 * intervalCount);
      break;
    default:
      monthly = 0;
  }

  return Math.round(monthly * quantity);
}

function getSubscriptionMonthlyCents(subscription: Stripe.Subscription): number {
  return subscription.items.data.reduce((total, item) => {
    const price = item.price;

    if (!price || typeof price === "string") {
      return total;
    }

    return total + priceToMonthlyCents(price, item.quantity ?? 1);
  }, 0);
}

function inferPlanFromSubscription(
  subscription: Stripe.Subscription,
): ClientPlan | "unknown" {
  const metadataPlan = subscription.metadata?.plan?.trim();

  if (metadataPlan && isActiveClientPlan(metadataPlan)) {
    return metadataPlan;
  }

  const priceToPlan = getStripePriceToPlanMap();

  for (const item of subscription.items.data) {
    const price = item.price;

    if (!price || typeof price === "string") {
      continue;
    }

    const plan = priceToPlan[price.id];

    if (plan) {
      return plan;
    }
  }

  return "unknown";
}

async function listActiveSubscriptions(
  stripe: Stripe,
): Promise<Stripe.Subscription[]> {
  const subscriptions: Stripe.Subscription[] = [];

  for await (const subscription of stripe.subscriptions.list({
    status: "active",
    expand: ["data.items.data.price"],
    limit: 100,
  })) {
    subscriptions.push(subscription);
  }

  return subscriptions;
}

function getLastMonths(count: number): Array<{ monthKey: string; label: string }> {
  const months: Array<{ monthKey: string; label: string }> = [];
  const now = new Date();

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    months.push({
      monthKey,
      label: date.toLocaleString("en-US", { month: "short" }),
    });
  }

  return months;
}

function getMonthKeyFromUnix(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

async function listRecentPaidInvoices(stripe: Stripe): Promise<Stripe.Invoice[]> {
  const invoices: Stripe.Invoice[] = [];
  const fiveMonthsAgo = Math.floor(
    new Date(new Date().getFullYear(), new Date().getMonth() - 4, 1).getTime() /
      1000,
  );

  for await (const invoice of stripe.invoices.list({
    status: "paid",
    created: { gte: fiveMonthsAgo },
    limit: 100,
    expand: ["data.customer"],
  })) {
    invoices.push(invoice);
  }

  return invoices;
}

function getCustomerName(invoice: Stripe.Invoice): string {
  const customer = invoice.customer;

  if (customer && typeof customer !== "string" && !customer.deleted) {
    return (
      customer.name ??
      customer.email ??
      invoice.customer_email ??
      "Unknown customer"
    );
  }

  return invoice.customer_email ?? "Unknown customer";
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const legacySubscription = (
    invoice as Stripe.Invoice & { subscription?: string | { id: string } | null }
  ).subscription;

  if (legacySubscription) {
    return typeof legacySubscription === "string"
      ? legacySubscription
      : legacySubscription.id;
  }

  const parent = invoice.parent;

  if (parent?.type === "subscription_details") {
    const subscription = parent.subscription_details?.subscription;

    if (!subscription) {
      return null;
    }

    return typeof subscription === "string" ? subscription : subscription.id;
  }

  return null;
}

function isSubscriptionInvoice(invoice: Stripe.Invoice): boolean {
  return Boolean(
    getInvoiceSubscriptionId(invoice) ||
      invoice.billing_reason === "subscription_create" ||
      invoice.billing_reason === "subscription_cycle" ||
      invoice.billing_reason === "subscription_update",
  );
}

export async function getRevenueData(): Promise<RevenueData> {
  const stripe = getStripe();
  const subscriptions = await listActiveSubscriptions(stripe);
  const paidInvoices = await listRecentPaidInvoices(stripe);

  const planMap = new Map<
    ClientPlan | "unknown",
    { count: number; mrr: number }
  >([
    [STANDARD_PLAN_ID, { count: 0, mrr: 0 }],
    ["monthly", { count: 0, mrr: 0 }],
    ["starter", { count: 0, mrr: 0 }],
    ["premium", { count: 0, mrr: 0 }],
    ["unknown", { count: 0, mrr: 0 }],
  ]);

  let mrr = 0;

  for (const subscription of subscriptions) {
    const monthlyCents = getSubscriptionMonthlyCents(subscription);
    const plan = inferPlanFromSubscription(subscription);
    const entry = planMap.get(plan)!;

    mrr += monthlyCents;
    entry.count += 1;
    entry.mrr += monthlyCents;
  }

  const mrrByPlan: PlanBreakdown[] = (
    [STANDARD_PLAN_ID, "monthly", "starter", "premium"] as const
  )
    .map((plan) => {
      const entry = planMap.get(plan)!;

      return {
        plan,
        label: PLAN_LABELS[plan],
        count: entry.count,
        mrr: entry.mrr,
      };
    })
    .filter((entry) => entry.count > 0);

  const unknownEntry = planMap.get("unknown")!;

  if (unknownEntry.count > 0) {
    mrrByPlan.push({
      plan: "unknown",
      label: "Other",
      count: unknownEntry.count,
      mrr: unknownEntry.mrr,
    });
  }

  const trendMonths = getLastMonths(5);
  const trendMap = new Map(trendMonths.map((month) => [month.monthKey, 0]));

  for (const invoice of paidInvoices) {
    if (!isSubscriptionInvoice(invoice)) {
      continue;
    }

    const monthKey = getMonthKeyFromUnix(invoice.created);

    if (trendMap.has(monthKey)) {
      trendMap.set(monthKey, (trendMap.get(monthKey) ?? 0) + invoice.amount_paid);
    }
  }

  const mrrTrend: MrrTrendPoint[] = trendMonths.map((month) => ({
    monthKey: month.monthKey,
    label: month.label,
    mrr: trendMap.get(month.monthKey) ?? 0,
  }));

  const now = new Date();
  const monthStart = Math.floor(
    new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000,
  );

  const recentInvoiceList = await stripe.invoices.list({
    limit: 10,
    expand: ["data.customer"],
  });

  const recentInvoices: RevenueInvoice[] = recentInvoiceList.data.map(
    (invoice) => ({
      id: invoice.id,
      number: invoice.number,
      customerName: getCustomerName(invoice),
      amount: invoice.amount_due,
      status: invoice.status ?? "unknown",
      date: new Date(invoice.created * 1000).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    }),
  );

  let collectedMtd = 0;
  let pendingInvoices = 0;

  for await (const invoice of stripe.invoices.list({
    created: { gte: monthStart },
    limit: 100,
  })) {
    if (invoice.status === "paid") {
      collectedMtd += invoice.amount_paid;
    } else if (invoice.status === "open") {
      pendingInvoices += 1;
    }
  }

  return {
    mrr,
    arr: mrr * 12,
    activeSubscriptions: subscriptions.length,
    collectedMtd,
    pendingInvoices,
    mrrByPlan,
    mrrTrend,
    recentInvoices,
  };
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatCurrencyDetailed(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

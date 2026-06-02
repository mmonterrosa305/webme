import type { Metadata } from "next";

import {
  DataTable,
  PageHeader,
  Panel,
  StatCard,
  StatusPill,
} from "../_components/dashboard-ui";
import {
  formatCurrency,
  formatCurrencyDetailed,
  getRevenueData,
} from "@/lib/stripe/revenue";

export const metadata: Metadata = {
  title: "Revenue — WebMe",
};

function invoiceStatusVariant(
  status: string,
): "default" | "success" | "warning" | "accent" {
  if (status === "paid") {
    return "success";
  }

  if (status === "open" || status === "draft") {
    return "warning";
  }

  return "default";
}

function formatInvoiceStatus(status: string): string {
  return status.replace("_", " ");
}

export default async function RevenuePage() {
  const revenue = await getRevenueData();
  const maxTrend = Math.max(...revenue.mrrTrend.map((point) => point.mrr), 1);
  const maxPlanMrr = Math.max(...revenue.mrrByPlan.map((plan) => plan.mrr), 1);

  const mrrChange =
    revenue.mrrTrend.length >= 2
      ? revenue.mrrTrend[revenue.mrrTrend.length - 1]!.mrr -
        revenue.mrrTrend[revenue.mrrTrend.length - 2]!.mrr
      : 0;

  const mrrChangeLabel =
    mrrChange === 0
      ? "No change vs prior month"
      : `${mrrChange > 0 ? "+" : ""}${formatCurrency(mrrChange)} vs prior month`;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader
        eyebrow="Finance"
        title="Revenue"
        description="Live subscription metrics and invoices from Stripe."
      />

      <section
        aria-label="Revenue metrics"
        className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          label="MRR"
          value={formatCurrency(revenue.mrr)}
          change={`${revenue.activeSubscriptions} active subscriptions`}
        />
        <StatCard
          label="ARR"
          value={formatCurrency(revenue.arr)}
          change="MRR x 12"
        />
        <StatCard
          label="Collected (MTD)"
          value={formatCurrency(revenue.collectedMtd)}
          change={`${revenue.pendingInvoices} open invoice${revenue.pendingInvoices === 1 ? "" : "s"}`}
        />
        <StatCard
          label="Subscription revenue"
          value={formatCurrency(
            revenue.mrrTrend[revenue.mrrTrend.length - 1]?.mrr ?? 0,
          )}
          change={mrrChangeLabel}
        />
      </section>

      <div className="grid gap-8 lg:grid-cols-5">
        <Panel
          title="MRR trend"
          subtitle="Paid subscription revenue by month"
          className="lg:col-span-3"
        >
          {revenue.mrrTrend.every((point) => point.mrr === 0) ? (
            <div className="px-5 py-10 text-sm text-neutral-500">
              No subscription revenue recorded yet. Paid Stripe invoices will
              appear here month by month.
            </div>
          ) : (
            <div className="flex h-56 items-end justify-between gap-3 px-5 pb-5 pt-6">
              {revenue.mrrTrend.map((point) => (
                <div
                  key={point.monthKey}
                  className="flex flex-1 flex-col items-center gap-2"
                >
                  <span className="text-xs font-medium text-neutral-900">
                    {formatCurrency(point.mrr)}
                  </span>
                  <div
                    className="w-full max-w-[48px] rounded-t bg-neutral-900 transition hover:bg-neutral-700"
                    style={{
                      height: `${Math.max((point.mrr / maxTrend) * 160, point.mrr > 0 ? 8 : 0)}px`,
                    }}
                  />
                  <span className="text-xs text-neutral-500">{point.label}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel
          title="Clients by plan"
          subtitle="Active Stripe subscriptions"
          className="lg:col-span-2"
        >
          {revenue.mrrByPlan.length === 0 ? (
            <div className="px-5 py-10 text-sm text-neutral-500">
              No active subscriptions yet.
            </div>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {revenue.mrrByPlan.map((row) => (
                <li key={row.plan} className="px-5 py-4">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-neutral-900">
                      {row.label}
                    </span>
                    <span className="font-medium text-neutral-900">
                      {formatCurrency(row.mrr)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {row.count} client{row.count === 1 ? "" : "s"}
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-200">
                    <div
                      className="h-full rounded-full bg-neutral-900"
                      style={{
                        width: `${Math.min((row.mrr / maxPlanMrr) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-8">
        <Panel title="Recent invoices" subtitle="Last 10 from Stripe">
          {revenue.recentInvoices.length === 0 ? (
            <div className="px-5 py-10 text-sm text-neutral-500">
              No invoices yet.
            </div>
          ) : (
            <DataTable
              columns={["Invoice", "Client", "Amount", "Status", "Date"]}
              rows={revenue.recentInvoices.map((invoice) => [
                <span key="id" className="font-mono text-neutral-500">
                  {invoice.number ?? invoice.id.slice(-8)}
                </span>,
                <span key="client" className="font-medium text-neutral-900">
                  {invoice.customerName}
                </span>,
                <span key="amount" className="text-neutral-800">
                  {formatCurrencyDetailed(invoice.amount)}
                </span>,
                <StatusPill
                  key="status"
                  label={formatInvoiceStatus(invoice.status)}
                  variant={invoiceStatusVariant(invoice.status)}
                />,
                <span key="date" className="text-neutral-500">
                  {invoice.date}
                </span>,
              ])}
            />
          )}
        </Panel>
      </div>
    </main>
  );
}

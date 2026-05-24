import type { Metadata } from "next";

import {
  DataTable,
  PageHeader,
  Panel,
  StatCard,
  StatusPill,
} from "../_components/dashboard-ui";

export const metadata: Metadata = {
  title: "Revenue — WebMe",
};

const STATS = [
  { label: "MRR", value: "$12,400", change: "+8.2% vs last month" },
  { label: "ARR", value: "$148.8k", change: "Annualized run rate" },
  { label: "Collected (MTD)", value: "$11,200", change: "2 invoices pending" },
  { label: "Net new MRR", value: "+$920", change: "March 2026" },
] as const;

const MRR_BY_PLAN = [
  { plan: "Starter ($399)", clients: 12, mrr: "$4,788", pct: 39 },
  { plan: "Growth ($599)", clients: 14, mrr: "$8,386", pct: 68 },
  { plan: "Pro ($799)", clients: 8, mrr: "$6,392", pct: 52 },
] as const;

const INVOICES = [
  ["INV-1042", "Riverside Dental", "$599", "Paid", "Mar 1"],
  ["INV-1043", "Apex Accounting", "$799", "Paid", "Mar 1"],
  ["INV-1044", "Summit Legal Partners", "$799", "Paid", "Mar 3"],
  ["INV-1045", "Coastal Cafe Group", "$399", "Pending", "Apr 1"],
  ["INV-1046", "Greenfield Nursery", "$399", "Paid", "Mar 1"],
  ["INV-1047", "Blue Oak Landscaping", "$399", "Pending", "Apr 1"],
] as const;

const MONTHLY_MRR = [
  { month: "Nov", mrr: 8400 },
  { month: "Dec", mrr: 9200 },
  { month: "Jan", mrr: 10100 },
  { month: "Feb", mrr: 11480 },
  { month: "Mar", mrr: 12400 },
] as const;

const maxMrr = Math.max(...MONTHLY_MRR.map((m) => m.mrr));

export default function RevenuePage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader
        eyebrow="Finance"
        title="Revenue"
        description="MRR trends, plan breakdown, and invoice status."
      />

      <section
        aria-label="Revenue metrics"
        className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {STATS.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <div className="grid gap-8 lg:grid-cols-5">
        <Panel
          title="MRR trend"
          subtitle="Last 5 months"
          className="lg:col-span-3"
        >
          <div className="flex h-56 items-end justify-between gap-3 px-5 pb-5 pt-6">
            {MONTHLY_MRR.map((point) => (
              <div
                key={point.month}
                className="flex flex-1 flex-col items-center gap-2"
              >
                <span className="text-xs font-medium text-neutral-900">
                  ${(point.mrr / 1000).toFixed(1)}k
                </span>
                <div
                  className="w-full max-w-[48px] rounded-t bg-neutral-900 transition hover:bg-neutral-700"
                  style={{ height: `${(point.mrr / maxMrr) * 160}px` }}
                />
                <span className="text-xs text-neutral-500">{point.month}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="MRR by plan" subtitle="Current breakdown" className="lg:col-span-2">
          <ul className="divide-y divide-neutral-100">
            {MRR_BY_PLAN.map((row) => (
              <li key={row.plan} className="px-5 py-4">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-neutral-900">{row.plan}</span>
                  <span className="font-medium text-neutral-900">{row.mrr}</span>
                </div>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {row.clients} clients
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-200">
                  <div
                    className="h-full rounded-full bg-neutral-900"
                    style={{ width: `${Math.min(row.pct, 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel title="Recent invoices" subtitle="Billing history">
            <DataTable
              columns={["Invoice", "Client", "Amount", "Status", "Date"]}
              rows={INVOICES.map(([id, client, amount, status, date]) => [
                <span key="id" className="font-mono text-neutral-500">
                  {id}
                </span>,
                <span key="cl" className="font-medium text-neutral-900">
                  {client}
                </span>,
                <span key="am" className="text-neutral-800">
                  {amount}
                </span>,
                <StatusPill
                  key="st"
                  label={status}
                  variant={status === "Paid" ? "success" : "warning"}
                />,
                <span key="dt" className="text-neutral-500">
                  {date}
                </span>,
              ])}
            />
          </Panel>
        </div>

        <Panel title="Quick summary" subtitle="March 2026">
          <dl className="space-y-4 p-5">
            <div className="flex justify-between border-b border-neutral-200 pb-3">
              <dt className="text-sm text-neutral-600">New MRR</dt>
              <dd className="text-sm font-medium text-emerald-700">+$1,200</dd>
            </div>
            <div className="flex justify-between border-b border-neutral-200 pb-3">
              <dt className="text-sm text-neutral-600">Expansion</dt>
              <dd className="text-sm font-medium text-emerald-700">+$200</dd>
            </div>
            <div className="flex justify-between border-b border-neutral-200 pb-3">
              <dt className="text-sm text-neutral-600">Churned MRR</dt>
              <dd className="text-sm font-medium text-red-600">−$480</dd>
            </div>
            <div className="flex justify-between pt-1">
              <dt className="text-sm font-medium text-neutral-900">Net new MRR</dt>
              <dd className="text-sm font-semibold text-neutral-900">+$920</dd>
            </div>
          </dl>
        </Panel>
      </div>
    </main>
  );
}

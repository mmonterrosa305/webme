import type { Metadata } from "next";

import {
  DataTable,
  PageHeader,
  Panel,
  StatCard,
  StatusPill,
} from "../_components/dashboard-ui";

export const metadata: Metadata = {
  title: "Clients — WebMe",
};

const STATS = [
  { label: "Active clients", value: "34", change: "3 onboarding" },
  { label: "Total MRR", value: "$12,400", change: "+$1,200 this month" },
  { label: "Churn (30d)", value: "2.9%", change: "1 client cancelled" },
  { label: "Avg. client LTV", value: "$4,680", change: "12-month estimate" },
] as const;

const CLIENTS = [
  {
    company: "Riverside Dental",
    plan: "Growth",
    mrr: "$599",
    site: "Live",
    since: "Jan 2026",
    contact: "Dr. Nguyen",
  },
  {
    company: "Apex Accounting",
    plan: "Pro",
    mrr: "$799",
    site: "Live",
    since: "Dec 2025",
    contact: "Lisa Hart",
  },
  {
    company: "Summit Legal Partners",
    plan: "Pro",
    mrr: "$799",
    site: "Live",
    since: "Feb 2026",
    contact: "James Cole",
  },
  {
    company: "Greenfield Nursery",
    plan: "Starter",
    mrr: "$399",
    site: "Live",
    since: "Nov 2025",
    contact: "Tom Reed",
  },
  {
    company: "Coastal Cafe Group",
    plan: "Starter",
    mrr: "$399",
    site: "In review",
    since: "Mar 2026",
    contact: "Maria Santos",
  },
  {
    company: "Blue Oak Landscaping",
    plan: "Starter",
    mrr: "$399",
    site: "Building",
    since: "Mar 2026",
    contact: "Kevin Shaw",
  },
  {
    company: "Pulse Wellness Studio",
    plan: "Growth",
    mrr: "$599",
    site: "Onboarding",
    since: "Apr 2026",
    contact: "Alex Rivera",
  },
] as const;

const ONBOARDING = [
  {
    company: "Pulse Wellness Studio",
    step: "Brand intake submitted",
    due: "Complete",
  },
  {
    company: "Coastal Cafe Group",
    step: "Final review & launch",
    due: "Apr 8",
  },
  {
    company: "Blue Oak Landscaping",
    step: "Agent building site",
    due: "Apr 10",
  },
] as const;

export default function ClientsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader
        eyebrow="Accounts"
        title="Clients"
        description="Active subscriptions, site status, and onboarding progress."
      />

      <section
        aria-label="Client metrics"
        className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {STATS.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel title="Client roster" subtitle="All active accounts">
            <DataTable
              columns={[
                "Company",
                "Contact",
                "Plan",
                "MRR",
                "Site",
                "Since",
              ]}
              rows={CLIENTS.map((c) => [
                <span key="co" className="font-medium text-neutral-900">
                  {c.company}
                </span>,
                <span key="ct" className="text-neutral-600">
                  {c.contact}
                </span>,
                <span key="pl" className="text-neutral-700">
                  {c.plan}
                </span>,
                <span key="mrr" className="font-medium text-neutral-900">
                  {c.mrr}
                </span>,
                <StatusPill
                  key="site"
                  label={c.site}
                  variant={
                    c.site === "Live"
                      ? "success"
                      : c.site === "Building" || c.site === "In review"
                        ? "accent"
                        : "warning"
                  }
                />,
                <span key="since" className="text-neutral-500">
                  {c.since}
                </span>,
              ])}
            />
          </Panel>
        </div>

        <Panel title="Onboarding" subtitle="New clients in setup">
          <ul className="divide-y divide-neutral-100">
            {ONBOARDING.map((item) => (
              <li key={item.company} className="px-5 py-4">
                <p className="font-medium text-neutral-900">{item.company}</p>
                <p className="mt-1 text-sm text-neutral-600">{item.step}</p>
                <p className="mt-2 text-xs font-medium text-neutral-800">
                  Due: {item.due}
                </p>
              </li>
            ))}
          </ul>
          <div className="border-t border-neutral-200 px-5 py-3">
            <button
              type="button"
              className="text-sm font-medium text-neutral-900 hover:text-neutral-600"
            >
              + Add client
            </button>
          </div>
        </Panel>
      </div>
    </main>
  );
}

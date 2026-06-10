import type { Metadata } from "next";

import {
  PageHeader,
  Panel,
  PriorityBadge,
  StatCard,
} from "../_components/dashboard-ui";

export const metadata: Metadata = {
  title: "Overview — WebMe",
};

const STATS = [
  { label: "Total Leads", value: "0", change: "No leads yet" },
  { label: "Sites Built", value: "0", change: "No sites built yet" },
  { label: "Active Clients", value: "0", change: "No clients yet" },
  { label: "MRR", value: "$0", change: "No revenue yet" },
] as const;

const RECENT_ACTIVITY: { id: string; title: string; detail: string; time: string }[] = [];

const LEADS_NEEDING_ACTION: { id: string; company: string; contact: string; status: string; action: string; priority: "high" | "medium" | "low"; lastTouch: string }[] = [];

export default function OverviewPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader
        eyebrow="Dashboard"
        title="Overview"
        description="Your agency at a glance — leads, builds, clients, and revenue."
      />

      <section
        aria-label="Key metrics"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {STATS.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-5">
        <Panel title="Recent Activity" className="lg:col-span-2">
          <ul className="divide-y divide-neutral-100">
            {RECENT_ACTIVITY.map((item) => (
              <li key={item.id} className="px-5 py-4">
                <div className="flex gap-3">
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-neutral-900"
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-neutral-900">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {item.detail}
                    </p>
                    <p className="mt-1 text-xs text-neutral-400">{item.time}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="Leads Needing Action"
          subtitle={`${LEADS_NEEDING_ACTION.length} items require your attention`}
          className="lg:col-span-3"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-xs uppercase tracking-wider text-neutral-500">
                  <th className="px-5 py-3 font-medium">Company</th>
                  <th className="px-5 py-3 font-medium">Contact</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Action</th>
                  <th className="px-5 py-3 font-medium">Priority</th>
                  <th className="px-5 py-3 font-medium">Last touch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {LEADS_NEEDING_ACTION.map((lead) => (
                  <tr
                    key={lead.id}
                    className="transition hover:bg-neutral-50"
                  >
                    <td className="px-5 py-3.5 font-medium text-neutral-900">
                      {lead.company}
                    </td>
                    <td className="px-5 py-3.5 text-neutral-600">
                      {lead.contact}
                    </td>
                    <td className="px-5 py-3.5 text-neutral-700">
                      {lead.status}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-neutral-900">
                      {lead.action}
                    </td>
                    <td className="px-5 py-3.5">
                      <PriorityBadge priority={lead.priority} />
                    </td>
                    <td className="px-5 py-3.5 text-neutral-500">
                      {lead.lastTouch}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </main>
  );
}

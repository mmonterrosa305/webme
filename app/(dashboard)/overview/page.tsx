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
  { label: "Total Leads", value: "247", change: "+18 this week" },
  { label: "Sites Built", value: "89", change: "+6 this month" },
  { label: "Active Clients", value: "34", change: "3 onboarding" },
  { label: "MRR", value: "$12,400", change: "+8.2% vs last month" },
] as const;

const RECENT_ACTIVITY = [
  {
    id: "1",
    title: "Site deployed for Riverside Dental",
    detail: "Pipeline → Live",
    time: "12 min ago",
  },
  {
    id: "2",
    title: "New lead: Harborview Property Group",
    detail: "Inbound from outreach sequence",
    time: "1 hr ago",
  },
  {
    id: "3",
    title: "Client signed — Summit Legal Partners",
    detail: "Starter plan, $399/mo",
    time: "3 hrs ago",
  },
  {
    id: "4",
    title: "Agent completed site draft",
    detail: "Blue Oak Landscaping — review pending",
    time: "5 hrs ago",
  },
  {
    id: "5",
    title: "Follow-up sent to Metro Fitness Co.",
    detail: "Day 3 of nurture sequence",
    time: "Yesterday",
  },
] as const;

const LEADS_NEEDING_ACTION = [
  {
    id: "1",
    company: "Northline HVAC",
    contact: "Jordan Ellis",
    status: "Proposal sent",
    action: "Schedule demo call",
    priority: "high" as const,
    lastTouch: "2 days ago",
  },
  {
    id: "2",
    company: "Cedar & Stone Realty",
    contact: "Morgan Chen",
    status: "Site draft ready",
    action: "Send preview link",
    priority: "high" as const,
    lastTouch: "1 day ago",
  },
  {
    id: "3",
    company: "Pulse Wellness Studio",
    contact: "Alex Rivera",
    status: "Replied to outreach",
    action: "Respond to email",
    priority: "medium" as const,
    lastTouch: "4 hrs ago",
  },
  {
    id: "4",
    company: "Ironclad Roofing",
    contact: "Sam Okonkwo",
    status: "No response",
    action: "Send follow-up #2",
    priority: "medium" as const,
    lastTouch: "5 days ago",
  },
  {
    id: "5",
    company: "Bloom & Branch Florists",
    contact: "Taylor Brooks",
    status: "Contract unsigned",
    action: "Nudge for signature",
    priority: "low" as const,
    lastTouch: "3 days ago",
  },
] as const;

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

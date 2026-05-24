import type { Metadata } from "next";

import {
  DataTable,
  PageHeader,
  Panel,
  StatCard,
  StatusPill,
} from "../_components/dashboard-ui";

export const metadata: Metadata = {
  title: "Outreach — WebMe",
};

const STATS = [
  { label: "Emails sent (7d)", value: "412", change: "+22% vs prior week" },
  { label: "Open rate", value: "48%", change: "Industry avg: 42%" },
  { label: "Reply rate", value: "12%", change: "+1.8% this month" },
  { label: "Meetings booked", value: "9", change: "From outreach this week" },
] as const;

const SEQUENCES = [
  {
    name: "Local services — cold intro",
    steps: 5,
    enrolled: 84,
    status: "Active",
    openRate: "52%",
    replyRate: "14%",
  },
  {
    name: "Agency follow-up nurture",
    steps: 4,
    enrolled: 41,
    status: "Active",
    openRate: "46%",
    replyRate: "11%",
  },
  {
    name: "Re-engage stale leads",
    steps: 3,
    enrolled: 29,
    status: "Paused",
    openRate: "38%",
    replyRate: "8%",
  },
  {
    name: "Post-demo thank you",
    steps: 2,
    enrolled: 12,
    status: "Active",
    openRate: "61%",
    replyRate: "22%",
  },
] as const;

const SCHEDULED = [
  ["Northline HVAC", "Follow-up #2", "Today, 2:00 PM", "Queued"],
  ["Ironclad Roofing", "Cold intro", "Today, 4:30 PM", "Queued"],
  ["Metro Fitness Co.", "Case study share", "Tomorrow, 9:00 AM", "Queued"],
  ["Urban Pet Grooming", "Break-up email", "Tomorrow, 11:00 AM", "Queued"],
  ["Peak Performance PT", "Meeting confirm", "Wed, 10:00 AM", "Draft"],
] as const;

export default function OutreachPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader
        eyebrow="Growth"
        title="Outreach"
        description="Email sequences, campaign performance, and scheduled sends."
      />

      <section
        aria-label="Outreach metrics"
        className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {STATS.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <Panel title="Active sequences" subtitle="Automated email workflows">
          <ul className="divide-y divide-neutral-100">
            {SEQUENCES.map((seq) => (
              <li key={seq.name} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-neutral-900">{seq.name}</p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {seq.steps} steps · {seq.enrolled} enrolled
                    </p>
                  </div>
                  <StatusPill
                    label={seq.status}
                    variant={seq.status === "Active" ? "success" : "warning"}
                  />
                </div>
                <div className="mt-3 flex gap-6 text-xs">
                  <span className="text-neutral-500">
                    Open{" "}
                    <span className="font-medium text-neutral-800">
                      {seq.openRate}
                    </span>
                  </span>
                  <span className="text-neutral-500">
                    Reply{" "}
                    <span className="font-medium text-neutral-900">
                      {seq.replyRate}
                    </span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Scheduled sends" subtitle="Upcoming outbound emails">
          <DataTable
            columns={["Lead", "Email", "Send time", "Status"]}
            rows={SCHEDULED.map(([lead, email, time, status]) => [
              <span key="l" className="font-medium text-neutral-900">
                {lead}
              </span>,
              <span key="e" className="text-neutral-600">
                {email}
              </span>,
              <span key="t" className="text-neutral-600">
                {time}
              </span>,
              <StatusPill
                key="s"
                label={status}
                variant={status === "Queued" ? "accent" : "default"}
              />,
            ])}
          />
        </Panel>
      </div>

      <div className="mt-8">
        <Panel
          title="This week&apos;s performance"
          subtitle="Aggregate stats across all sequences"
        >
          <div className="grid gap-4 p-5 sm:grid-cols-3">
            {[
              { label: "Mon", sent: 58, opens: 31 },
              { label: "Tue", sent: 72, opens: 38 },
              { label: "Wed", sent: 65, opens: 34 },
              { label: "Thu", sent: 81, opens: 42 },
              { label: "Fri", sent: 69, opens: 36 },
              { label: "Sat", sent: 12, opens: 5 },
            ].map((day) => (
              <div key={day.label} className="text-center">
                <p className="text-xs text-neutral-500">{day.label}</p>
                <div className="mt-2 flex h-24 items-end justify-center gap-1">
                  <div
                    className="w-6 rounded-t bg-neutral-300"
                    style={{ height: `${(day.sent / 81) * 100}%` }}
                    title={`${day.sent} sent`}
                  />
                  <div
                    className="w-6 rounded-t bg-neutral-900"
                    style={{ height: `${(day.opens / 42) * 100}%` }}
                    title={`${day.opens} opens`}
                  />
                </div>
                <p className="mt-1 text-xs text-neutral-600">
                  {day.sent} sent ·{" "}
                  <span className="font-medium text-neutral-900">
                    {day.opens} opens
                  </span>
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </main>
  );
}

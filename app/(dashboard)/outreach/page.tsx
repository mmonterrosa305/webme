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
  { label: "Emails sent (7d)", value: "0", change: "No emails sent yet" },
  { label: "Open rate", value: "0%", change: "No data yet" },
  { label: "Reply rate", value: "0%", change: "No data yet" },
  { label: "Meetings booked", value: "0", change: "No meetings yet" },
] as const;

const SEQUENCES = [] as const;

const SCHEDULED = [] as const;

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
            {[].map((day) => (
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

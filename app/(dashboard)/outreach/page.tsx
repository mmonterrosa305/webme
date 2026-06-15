import type { Metadata } from "next";

import {
  DataTable,
  PageHeader,
  Panel,
  StatCard,
  StatusPill,
} from "../_components/dashboard-ui";
import { getOutreachDashboardStats } from "@/lib/outreach/get-outreach-stats";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Outreach — WebMe",
};

function formatOpenRate(
  openRatePercent: number | null,
  trackableCount: number,
): { value: string; change: string } {
  if (trackableCount === 0) {
    return {
      value: "—",
      change: "Opens tracked on new sends",
    };
  }

  return {
    value: `${openRatePercent ?? 0}%`,
    change: "Based on tracking pixel loads",
  };
}

export default async function OutreachPage() {
  const supabase = createAdminClient();
  const stats = await getOutreachDashboardStats(supabase);
  const openRate = formatOpenRate(stats.openRatePercent, stats.trackableCount);

  const dashboardStats = [
    {
      label: "Emails sent (7d)",
      value: String(stats.emailsSent7d),
      change:
        stats.emailsSent7d > 0 ? "Last 7 days" : "No emails sent yet",
    },
    {
      label: "Total sent",
      value: String(stats.totalSent),
      change: stats.totalSent > 0 ? "All time" : "No emails sent yet",
    },
    {
      label: "Open rate",
      value: openRate.value,
      change: openRate.change,
    },
    {
      label: "Reply rate",
      value: "—",
      change: "Reply tracking not set up",
    },
  ];

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
        {dashboardStats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <Panel title="Outreach History" subtitle="Sent outreach emails">
          {stats.history.length === 0 ? (
            <div className="px-5 py-10 text-sm text-neutral-500">
              No outreach emails sent yet.
            </div>
          ) : (
            <DataTable
              columns={[
                "Business",
                "Email",
                "Subject",
                "Sent At",
                "Status",
                "Opened",
              ]}
              rows={stats.history.map((record) => [
                <span key="b" className="font-medium text-neutral-900">
                  {record.businessName}
                </span>,
                <span key="e" className="text-neutral-600">
                  {record.email}
                </span>,
                <span key="s" className="text-neutral-600">
                  {record.subject}
                </span>,
                <span key="t" className="text-neutral-600">
                  {record.sentAt
                    ? new Date(record.sentAt).toLocaleString()
                    : "—"}
                </span>,
                <StatusPill
                  key="st"
                  label={record.status}
                  variant={record.status === "sent" ? "success" : "default"}
                />,
                <StatusPill
                  key="op"
                  label={record.opened ? "Opened" : "Not opened"}
                  variant={record.opened ? "accent" : "default"}
                />,
              ])}
            />
          )}
        </Panel>
      </div>
    </main>
  );
}

import type { Metadata } from "next";

import {
  DataTable,
  PageHeader,
  Panel,
  StatCard,
  StatusPill,
} from "../_components/dashboard-ui";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Outreach — WebMe",
};

export default async function OutreachPage() {
  const supabase = createAdminClient();

  const { data: outreachRecords } = await supabase
    .from("outreach")
    .select(
      "id, lead_id, email_to, subject, resend_message_id, sent_at, status, leads(business_name, city)",
    )
    .order("sent_at", { ascending: false })
    .limit(50);

  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const emailsSent7d = (outreachRecords ?? []).filter(
    (r) => r.sent_at && r.sent_at > sevenDaysAgo,
  ).length;

  const totalSent = outreachRecords?.length ?? 0;

  const STATS = [
    {
      label: "Emails sent (7d)",
      value: String(emailsSent7d),
      change:
        emailsSent7d > 0 ? "Last 7 days" : "No emails sent yet",
    },
    {
      label: "Total sent",
      value: String(totalSent),
      change: totalSent > 0 ? "All time" : "No emails sent yet",
    },
    { label: "Open rate", value: "—", change: "Tracking not set up" },
    { label: "Reply rate", value: "—", change: "Tracking not set up" },
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
        {STATS.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <Panel title="Outreach History" subtitle="Sent outreach emails">
          <DataTable
            columns={["Business", "Email", "Subject", "Sent At", "Status"]}
            rows={(outreachRecords ?? []).map((record) => {
              const lead = record.leads as
                | { business_name: string; city: string }
                | { business_name: string; city: string }[]
                | null;
              const leadData = Array.isArray(lead) ? lead[0] : lead;
              const businessName =
                leadData?.business_name ?? record.email_to;

              return [
                <span key="b" className="font-medium text-neutral-900">
                  {businessName}
                </span>,
                <span key="e" className="text-neutral-600">
                  {record.email_to}
                </span>,
                <span key="s" className="text-neutral-600">
                  {record.subject}
                </span>,
                <span key="t" className="text-neutral-600">
                  {record.sent_at
                    ? new Date(record.sent_at).toLocaleString()
                    : "—"}
                </span>,
                <StatusPill
                  key="st"
                  label={record.status ?? "unknown"}
                  variant={record.status === "sent" ? "success" : "default"}
                />,
              ];
            })}
          />
        </Panel>
      </div>
    </main>
  );
}

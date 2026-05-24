import type { Metadata } from "next";

import {
  DataTable,
  PageHeader,
  Panel,
  StatCard,
  StatusPill,
} from "../_components/dashboard-ui";

export const metadata: Metadata = {
  title: "Leads — WebMe",
};

const STATS = [
  { label: "Total leads", value: "247", change: "+18 this week" },
  { label: "New this week", value: "31", change: "12 from outreach" },
  { label: "Qualified rate", value: "41%", change: "+4% vs last month" },
  { label: "Avg. lead score", value: "72", change: "Out of 100" },
] as const;

const LEADS = [
  {
    company: "Metro Fitness Co.",
    contact: "Chris Nolan",
    email: "chris@metrofitness.com",
    source: "Cold email",
    score: 88,
    status: "Qualified",
  },
  {
    company: "Lakeside Auto Repair",
    contact: "Dana Kim",
    email: "dana@lakesideauto.com",
    source: "Referral",
    score: 76,
    status: "New",
  },
  {
    company: "Bright Smile Ortho",
    contact: "Dr. Patel",
    email: "info@brightsmileortho.com",
    source: "Inbound",
    score: 91,
    status: "Proposal",
  },
  {
    company: "Urban Pet Grooming",
    contact: "Jamie Fox",
    email: "jamie@urbanpet.com",
    source: "LinkedIn",
    score: 64,
    status: "Contacted",
  },
  {
    company: "Green Valley Law",
    contact: "R. Martinez",
    email: "rmartinez@gvlaw.com",
    source: "Cold email",
    score: 82,
    status: "Qualified",
  },
  {
    company: "Sunrise Bakery",
    contact: "Elena Ruiz",
    email: "elena@sunrisebakery.co",
    source: "Trade show",
    score: 59,
    status: "New",
  },
  {
    company: "Peak Performance PT",
    contact: "Mike Torres",
    email: "mike@peakpt.com",
    source: "Outreach seq.",
    score: 85,
    status: "Replied",
  },
  {
    company: "Oak Street Dental",
    contact: "Sarah Webb",
    email: "sarah@oakstreetdental.com",
    source: "Inbound",
    score: 94,
    status: "Proposal",
  },
] as const;

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-neutral-200">
        <div
          className="h-full rounded-full bg-neutral-900"
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-sm text-neutral-700">{score}</span>
    </div>
  );
}

export default function LeadsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader
        eyebrow="Prospects"
        title="Leads"
        description="All inbound and outbound prospects — filter, score, and push to pipeline."
      />

      <section
        aria-label="Lead metrics"
        className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {STATS.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <div className="mb-4 flex flex-wrap gap-2">
        {["All", "New", "Contacted", "Qualified", "Proposal", "Replied"].map(
          (filter, i) => (
            <button
              key={filter}
              type="button"
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                i === 0
                  ? "bg-neutral-900 text-white"
                  : "border border-neutral-300 text-neutral-600 hover:border-neutral-900 hover:text-neutral-900"
              }`}
            >
              {filter}
            </button>
          ),
        )}
      </div>

      <Panel title="All leads" subtitle={`${LEADS.length} shown — sample data`}>
        <DataTable
          columns={[
            "Company",
            "Contact",
            "Email",
            "Source",
            "Score",
            "Status",
          ]}
          rows={LEADS.map((lead) => [
            <span key="co" className="font-medium text-neutral-900">
              {lead.company}
            </span>,
            <span key="ct" className="text-neutral-600">
              {lead.contact}
            </span>,
            <span key="em" className="text-neutral-500">
              {lead.email}
            </span>,
            <span key="src" className="text-neutral-600">
              {lead.source}
            </span>,
            <ScoreBar key="sc" score={lead.score} />,
            <StatusPill
              key="st"
              label={lead.status}
              variant={
                lead.status === "Qualified" || lead.status === "Proposal"
                  ? "accent"
                  : lead.status === "Replied"
                    ? "success"
                    : "default"
              }
            />,
          ])}
        />
      </Panel>
    </main>
  );
}

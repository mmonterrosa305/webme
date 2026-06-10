import type { Metadata } from "next";

import { PageHeader, Panel, StatCard } from "../_components/dashboard-ui";

export const metadata: Metadata = {
  title: "Pipeline — WebMe",
};

const STATS = [
  { label: "In pipeline", value: "0", change: "No deals yet" },
  { label: "Avg. days to close", value: "0", change: "No data yet" },
  { label: "Win rate", value: "0%", change: "No data yet" },
  { label: "Pipeline value", value: "$0", change: "No forecast yet" },
] as const;

const STAGES = [] as const;

export default function PipelinePage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader
        eyebrow="Sales"
        title="Pipeline"
        description="Track deals from first touch through site launch and handoff."
      />

      <section
        aria-label="Pipeline metrics"
        className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {STATS.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <Panel
        title="Deal board"
        subtitle="Drag-and-drop coming soon — placeholder kanban view"
      >
        <div className="overflow-x-auto p-4">
          <div className="flex min-w-max gap-4">
            {STAGES.map((stage) => (
              <div
                key={stage.name}
                className="w-64 shrink-0 rounded-lg border border-neutral-200 bg-neutral-50"
              >
                <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2.5">
                  <h3 className="text-sm font-medium text-neutral-900">
                    {stage.name}
                  </h3>
                  <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs text-neutral-600">
                    {stage.count}
                  </span>
                </div>
                <ul className="space-y-2 p-2">
                  {stage.deals.map((deal) => (
                    <li
                      key={deal.company}
                      className="rounded-lg border border-neutral-200 bg-white p-3 transition hover:border-neutral-400"
                    >
                      <p className="text-sm font-medium text-neutral-900">
                        {deal.company}
                      </p>
                      <p className="mt-1 text-xs font-medium text-neutral-700">
                        {deal.value}
                      </p>
                      <p className="mt-2 text-xs text-neutral-500">
                        {deal.days === 0
                          ? "Closed today"
                          : `${deal.days} days in stage`}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-neutral-500">Stalled (&gt;14 days)</p>
          <p className="mt-1 text-xl font-semibold text-amber-700">0 deals</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-neutral-500">Lost this month</p>
          <p className="mt-1 text-xl font-semibold text-neutral-600">0 deals</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-neutral-500">Next action due</p>
          <p className="mt-1 text-xl font-semibold text-neutral-900">0 today</p>
        </div>
      </div>
    </main>
  );
}

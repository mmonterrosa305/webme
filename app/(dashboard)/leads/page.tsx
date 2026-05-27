import type { Metadata } from "next";

import { PageHeader } from "../_components/dashboard-ui";
import { LeadsSearch } from "./leads-search";
import { SavedLeads } from "./saved-leads";

export const metadata: Metadata = {
  title: "Leads — WebMe",
};

export default function LeadsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader
        eyebrow="Prospects"
        title="Leads"
        description="All inbound and outbound prospects — filter, score, and push to pipeline."
      />
      <div className="space-y-8">
        <LeadsSearch />
        <SavedLeads />
      </div>
    </main>
  );
}

import type { Metadata } from "next";

import { PageHeader } from "../_components/dashboard-ui";
import { WebDesignAgentForm } from "./web-design-agent-form";

export const metadata: Metadata = {
  title: "Create Site — WebMe",
};

export default function AgentsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader
        eyebrow="Automation"
        title="Create Site"
        description="AI agents that build sites, write outreach, and handle repetitive workflows."
      />

      <WebDesignAgentForm />
    </main>
  );
}

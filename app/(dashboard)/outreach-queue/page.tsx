import type { Metadata } from "next";
import { PageHeader } from "../_components/dashboard-ui";
import { OutreachQueue } from "./outreach-queue";

export const metadata: Metadata = {
  title: "Outreach Queue — WebMe",
};

export default function OutreachQueuePage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader
        eyebrow="Outreach"
        title="Outreach Queue"
        description="Businesses selected for outreach today. Add contact emails and send when ready."
      />
      <OutreachQueue />
    </main>
  );
}

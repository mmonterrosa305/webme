import type { Metadata } from "next";

import { PageHeader } from "../_components/dashboard-ui";
import { ImportSiteForm } from "./import-site-form";

export const metadata: Metadata = {
  title: "Import Site — WebMe",
};

export default function ImportSitePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader
        eyebrow="Sites"
        title="Import Site"
        description="Turn an existing business website into a new WebMe site by extracting its content and rebuilding it automatically."
      />
      <ImportSiteForm />
    </main>
  );
}

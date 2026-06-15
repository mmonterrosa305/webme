import type { Metadata } from "next";

import { PageHeader } from "../_components/dashboard-ui";
import { BusinessSearchForm } from "./business-search-form";

export const metadata: Metadata = {
  title: "Business Search — WebMe",
};

export default function BusinessSearchPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader
        eyebrow="Sites"
        title="Business Search"
        description="Find a business by name and city, gather everything Google and their website offer, and build a WebMe site in one flow."
      />
      <BusinessSearchForm />
    </main>
  );
}

import type { Metadata } from "next";

import { PageHeader } from "../_components/dashboard-ui";
import { ProjectsList } from "./projects-list";

export const metadata: Metadata = {
  title: "Projects — WebMe",
};

export default function ProjectsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader
        eyebrow="Sites"
        title="Projects"
        description="Websites built from Create Site. Open any project to revisit its preview after refresh or a new session."
      />
      <ProjectsList />
    </main>
  );
}

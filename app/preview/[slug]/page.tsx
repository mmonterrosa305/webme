import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getLeadBySlug } from "@/lib/leads/get-lead-by-slug";

import { PreviewShell } from "./preview-shell";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ shuffle?: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const lead = await getLeadBySlug(slug);

  return {
    title: lead
      ? `${lead.business_name} — Site Preview`
      : "Site Preview — WebMe",
  };
}

export default async function PreviewPage(props: PageProps) {
  const { slug } = await props.params;
  const lead = await getLeadBySlug(slug);

  if (!lead) {
    notFound();
  }

  const resolvedSearchParams = await props.searchParams;
  const shuffleMode = resolvedSearchParams?.shuffle === "true";

  return <PreviewShell lead={lead} shuffleMode={shuffleMode} />;
}

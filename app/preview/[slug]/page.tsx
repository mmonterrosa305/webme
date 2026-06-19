import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { prepareScrollHeroSiteHtml } from "@/lib/agents/scroll-hero-video";
import { getLeadBySlug } from "@/lib/leads/get-lead-by-slug";

import { PreviewShell } from "./preview-shell";

type PageProps = {
  params: Promise<{ slug: string }>;
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

export default async function PreviewPage({ params }: PageProps) {
  const { slug } = await params;
  const lead = await getLeadBySlug(slug);

  if (!lead) {
    notFound();
  }

  return (
    <PreviewShell
      lead={{
        ...lead,
        site_html: prepareScrollHeroSiteHtml(lead.site_html),
      }}
    />
  );
}

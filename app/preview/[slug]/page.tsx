import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getScrollHeroSequenceIdFromMetadata,
  prepareAndPersistLeadSiteHtml,
} from "@/lib/agents/prepare-lead-site-html";
import { getLeadBySlug } from "@/lib/leads/get-lead-by-slug";
import { resolveSequenceHeroCopy } from "@/lib/scroll-hero/resolve-sequence-hero-copy";

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

  const sequenceId = getScrollHeroSequenceIdFromMetadata(lead.site_metadata);
  const sequenceHero = sequenceId
    ? resolveSequenceHeroCopy({
        html: lead.site_html,
        metadata: lead.site_metadata,
        businessName: lead.business_name,
      })
    : null;

  const siteHtml = await prepareAndPersistLeadSiteHtml(
    lead.site_slug,
    lead.site_html,
    lead.site_metadata,
    lead.industry,
  );

  return (
    <PreviewShell
      lead={{
        ...lead,
        site_html: siteHtml,
      }}
      scrollHeroSequenceId={sequenceId}
      sequenceHero={sequenceHero}
    />
  );
}

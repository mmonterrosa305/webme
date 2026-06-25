import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getScrollHeroSequenceIdFromMetadata,
  prepareAndPersistLeadSiteHtml,
} from "@/lib/agents/prepare-lead-site-html";
import { getLeadBySlug } from "@/lib/leads/get-lead-by-slug";
import { stripSequenceHeroFromSiteHtml } from "@/lib/scroll-hero/strip-sequence-hero-html";

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
    ? stripSequenceHeroFromSiteHtml(lead.site_html)
    : null;
  const metadata = lead.site_metadata;

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
      sequenceHero={
        sequenceHero
          ? {
              headline: sequenceHero.headline || metadata?.headline,
              tagline: sequenceHero.tagline || metadata?.tagline,
              posterUrl: sequenceHero.posterUrl || metadata?.heroImageUrl,
            }
          : null
      }
    />
  );
}

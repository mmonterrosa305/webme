import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ScrollHeroSequenceHero } from "@/components/scroll-hero-sequence/scroll-hero-sequence-hero";
import { SiteContentFrame } from "@/components/site-content-frame";
import {
  getScrollHeroSequenceIdFromMetadata,
  prepareLeadSiteHtml,
} from "@/lib/agents/prepare-lead-site-html";
import { getLeadBySlug } from "@/lib/leads/get-lead-by-slug";
import { prepareSequenceIframeHtml } from "@/lib/leads/enrich-built-site-html";
import { resolveSequenceHeroCopy } from "@/lib/scroll-hero/resolve-sequence-hero-copy";
import { injectAnalyticsScript } from "@/lib/site/inject-analytics";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const lead = await getLeadBySlug(slug);

  return {
    title: lead ? lead.business_name : "Site not found",
  };
}

export default async function SitePage({ params }: PageProps) {
  const { slug } = await params;
  const lead = await getLeadBySlug(slug);

  if (!lead) {
    notFound();
  }

  const sequenceId = getScrollHeroSequenceIdFromMetadata(lead.site_metadata);
  const metadata = lead.site_metadata;

  if (sequenceId) {
    const siteHtml = await prepareLeadSiteHtml(
      lead.site_html,
      lead.site_metadata,
      lead.industry,
    );
    const heroCopy = resolveSequenceHeroCopy({
      html: siteHtml,
      metadata,
      businessName: lead.business_name,
    });
    const bodyHtml = injectAnalyticsScript(prepareSequenceIframeHtml(siteHtml));

    return (
      <div className="bg-white">
        <ScrollHeroSequenceHero
          sequenceId={sequenceId}
          businessName={lead.business_name}
          posterUrl={heroCopy.posterUrl}
          headline={heroCopy.headline}
          tagline={heroCopy.tagline}
        />
        <SiteContentFrame html={bodyHtml} title={lead.business_name} />
      </div>
    );
  }

  const html = injectAnalyticsScript(
    await prepareLeadSiteHtml(
      lead.site_html,
      lead.site_metadata,
      lead.industry,
    ),
  );

  return (
    <SiteContentFrame
      html={html}
      title={lead.business_name}
      className="min-h-screen w-full"
    />
  );
}

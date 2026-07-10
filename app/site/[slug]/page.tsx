import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";

import { ScrollHeroSequenceHero } from "@/components/scroll-hero-sequence/scroll-hero-sequence-hero";
import { SiteContentFrame } from "@/components/site-content-frame";
import {
  prepareAndPersistLeadSiteHtml,
  resolveScrollHeroSequenceId,
} from "@/lib/agents/prepare-lead-site-html";
import { getLeadBySlug } from "@/lib/leads/get-lead-by-slug";
import { prepareSequenceIframeHtml } from "@/lib/leads/enrich-built-site-html";
import { resolveSequenceHeroCopy } from "@/lib/scroll-hero/resolve-sequence-hero-copy";
import { injectAnalyticsScript } from "@/lib/site/inject-analytics";

type PageProps = {
  params: Promise<{ slug: string }>;
};

/** Always fetch fresh lead HTML and re-run enrichment on every request. */
export const dynamic = "force-dynamic";

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
  noStore();

  const { slug } = await params;
  const lead = await getLeadBySlug(slug);

  if (!lead) {
    notFound();
  }

  const siteHtml = await prepareAndPersistLeadSiteHtml(
    lead.site_slug,
    lead.site_html,
    lead.site_metadata,
    lead.industry,
  );

  const metadata = lead.site_metadata;
  const sequenceId = resolveScrollHeroSequenceId(metadata);

  const sequenceDebug = (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 9999,
        background: "red",
        color: "white",
        padding: "4px",
        fontSize: "12px",
      }}
    >
      SEQ: {sequenceId ?? "NULL"}
    </div>
  );

  if (sequenceId) {
    const heroCopy = resolveSequenceHeroCopy({
      html: siteHtml,
      metadata,
      businessName: lead.business_name,
    });
    const bodyHtml = injectAnalyticsScript(prepareSequenceIframeHtml(siteHtml));

    return (
      <div className="bg-white">
        {sequenceDebug}
        <ScrollHeroSequenceHero
          key={sequenceId}
          sequenceId={sequenceId}
          businessName={lead.business_name}
          posterUrl={heroCopy.posterUrl || metadata?.heroImageUrl}
          headline={heroCopy.headline}
          tagline={heroCopy.tagline}
        />
        <SiteContentFrame html={bodyHtml} title={lead.business_name} />
      </div>
    );
  }

  const html = injectAnalyticsScript(siteHtml);

  return (
    <>
      {sequenceDebug}
      <SiteContentFrame
        html={html}
        title={lead.business_name}
        className="min-h-screen w-full"
      />
    </>
  );
}

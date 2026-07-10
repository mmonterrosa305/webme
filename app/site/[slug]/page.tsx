import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { notFound, redirect } from "next/navigation";

import { SiteContentFrame } from "@/components/site-content-frame";
import {
  prepareAndPersistLeadSiteHtml,
  resolveScrollHeroSequenceId,
} from "@/lib/agents/prepare-lead-site-html";
import { getLeadBySlug } from "@/lib/leads/get-lead-by-slug";
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

  const sequenceId = resolveScrollHeroSequenceId(lead.site_metadata);

  // Sequence heroes render correctly in the preview pipeline — serve that
  // as the public live site without the preview chrome.
  if (sequenceId) {
    redirect(`/preview/${slug}?mode=public`);
  }

  const siteHtml = await prepareAndPersistLeadSiteHtml(
    lead.site_slug,
    lead.site_html,
    lead.site_metadata,
    lead.industry,
  );

  const html = injectAnalyticsScript(siteHtml);

  return (
    <SiteContentFrame
      html={html}
      title={lead.business_name}
      className="min-h-screen w-full"
    />
  );
}

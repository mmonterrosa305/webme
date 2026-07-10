import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  prepareAndPersistLeadSiteHtml,
  resolveScrollHeroSequenceId,
} from "@/lib/agents/prepare-lead-site-html";
import { getLeadBySlug } from "@/lib/leads/get-lead-by-slug";
import { resolveSequenceHeroCopy } from "@/lib/scroll-hero/resolve-sequence-hero-copy";

import { PreviewShell } from "./preview-shell";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ mode?: string | string[] }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const mode = Array.isArray(resolvedSearchParams.mode)
    ? resolvedSearchParams.mode[0]
    : resolvedSearchParams.mode;
  const publicMode = mode === "public";
  const lead = await getLeadBySlug(slug);

  if (publicMode) {
    return {
      title: lead ? lead.business_name : "Site not found",
    };
  }

  return {
    title: lead
      ? `${lead.business_name} — Site Preview`
      : "Site Preview — WebMe",
  };
}

export default async function PreviewPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const mode = Array.isArray(resolvedSearchParams.mode)
    ? resolvedSearchParams.mode[0]
    : resolvedSearchParams.mode;
  const publicMode = mode === "public";

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

  const sequenceId = resolveScrollHeroSequenceId(lead.site_metadata);
  const sequenceHero = sequenceId
    ? resolveSequenceHeroCopy({
        html: siteHtml,
        metadata: lead.site_metadata,
        businessName: lead.business_name,
      })
    : null;

  return (
    <PreviewShell
      lead={{
        ...lead,
        site_html: siteHtml,
      }}
      scrollHeroSequenceId={sequenceId}
      sequenceHero={sequenceHero}
      publicMode={publicMode}
    />
  );
}

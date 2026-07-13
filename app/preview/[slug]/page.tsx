import type { Metadata } from "next";
import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";

import {
  prepareAndPersistLeadSiteHtml,
  resolveScrollHeroSequenceId,
} from "@/lib/agents/prepare-lead-site-html";
import { getClientBySiteSlug } from "@/lib/clients/get-client-by-site-slug";
import { getLeadBySlug } from "@/lib/leads/get-lead-by-slug";
import { resolveSequenceHeroCopy } from "@/lib/scroll-hero/resolve-sequence-hero-copy";

import { PreviewShell } from "./preview-shell";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ mode?: string | string[] }>;
};

function isPublicModeParam(mode: string | string[] | undefined): boolean {
  const value = Array.isArray(mode) ? mode[0] : mode;
  return value === "public";
}

function isPaidClient(
  client: Awaited<ReturnType<typeof getClientBySiteSlug>>,
  leadStatus: string | null,
): boolean {
  if (leadStatus === "won") {
    return true;
  }

  if (!client) {
    return false;
  }

  const status = (client.subscription_status ?? "").toLowerCase();
  return status !== "payment_failed";
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const publicMode = isPublicModeParam(resolvedSearchParams.mode);
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
  noStore();

  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const publicMode = isPublicModeParam(resolvedSearchParams.mode);

  const lead = await getLeadBySlug(slug);

  if (!lead) {
    notFound();
  }

  const client = await getClientBySiteSlug(slug);
  const hasPaidClient = isPaidClient(client, lead.status);

  const siteHtml = await prepareAndPersistLeadSiteHtml(
    lead.site_slug,
    lead.site_html,
    lead.site_metadata,
    lead.industry,
    lead.business_name,
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
    <Suspense fallback={null}>
      <PreviewShell
        lead={{
          ...lead,
          site_html: siteHtml,
        }}
        scrollHeroSequenceId={sequenceId}
        sequenceHero={sequenceHero}
        publicMode={publicMode}
        hasPaidClient={hasPaidClient}
      />
    </Suspense>
  );
}

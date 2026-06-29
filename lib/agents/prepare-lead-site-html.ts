import { applyStoredSiteEnrichmentsToHtml } from "@/lib/leads/enrich-built-site-html";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeHeroSection } from "@/lib/site-editor/normalize-hero-section";
import type { SiteMetadata } from "@/lib/site-editor/types";
import { stripSequenceHeroFromSiteHtml } from "@/lib/scroll-hero/strip-sequence-hero-html";

import {
  hasScrollHeroSequence,
  hasStaleSequenceInitScript,
} from "./scroll-hero-sequence";
import { prepareScrollHeroVideoSiteHtml } from "./scroll-hero-video";

export function getScrollHeroSequenceIdFromMetadata(
  metadata: Record<string, unknown> | SiteMetadata | null | undefined,
): string | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const value = (metadata as SiteMetadata).scrollHeroSequenceId;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function prepareLeadSiteHtml(
  html: string,
  metadata?: Record<string, unknown> | SiteMetadata | null,
  industry?: string | null,
): Promise<string> {
  void industry;

  const sequenceId = getScrollHeroSequenceIdFromMetadata(metadata);
  let prepared = normalizeHeroSection(html);

  if (sequenceId || hasScrollHeroSequence(html) || hasStaleSequenceInitScript(html)) {
    prepared = stripSequenceHeroFromSiteHtml(prepared).html;
  } else {
    prepared = prepareScrollHeroVideoSiteHtml(prepared);
  }

  prepared = normalizeHeroSection(prepared);

  return applyStoredSiteEnrichmentsToHtml(
    prepared,
    metadata as SiteMetadata | null,
  );
}

export async function prepareAndPersistLeadSiteHtml(
  siteSlug: string,
  html: string,
  metadata?: Record<string, unknown> | SiteMetadata | null,
  industry?: string | null,
): Promise<string> {
  const prepared = await prepareLeadSiteHtml(html, metadata, industry);

  if (prepared === html) {
    return prepared;
  }

  const sequenceId = getScrollHeroSequenceIdFromMetadata(metadata);

  console.log(`[prepare-lead-site-html] Persisting cleaned HTML for ${siteSlug}`, {
    beforeLength: html.length,
    afterLength: prepared.length,
    staleInitScript: hasStaleSequenceInitScript(html),
    sequenceId: sequenceId ?? null,
  });

  const supabase = createAdminClient();
  const nextMetadata: SiteMetadata = {
    ...((metadata as SiteMetadata | null) ?? {}),
    ...(sequenceId ? { scrollHeroSequenceId: sequenceId } : {}),
  };

  const { error } = await supabase
    .from("leads")
    .update({
      site_html: prepared,
      site_metadata: nextMetadata,
    })
    .eq("site_slug", siteSlug);

  if (error) {
    console.error(
      `[prepare-lead-site-html] Failed to persist cleaned HTML for ${siteSlug}:`,
      error.message,
    );
  }

  return prepared;
}

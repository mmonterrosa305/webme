import { createAdminClient } from "@/lib/supabase/admin";
import type { SiteMetadata } from "@/lib/site-editor/types";

import {
  extractScrollHeroSequenceId,
  hasInlineSequenceFrames,
  hasScrollHeroSequence,
  prepareScrollHeroSequenceSiteHtmlAsync,
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
  if (hasScrollHeroSequence(html)) {
    return prepareScrollHeroSequenceSiteHtmlAsync(html, {
      sequenceId: getScrollHeroSequenceIdFromMetadata(metadata),
      industry,
    });
  }

  return prepareScrollHeroVideoSiteHtml(html);
}

function shouldPersistCompactedHtml(originalHtml: string, preparedHtml: string): boolean {
  if (!hasScrollHeroSequence(originalHtml)) {
    return false;
  }

  return (
    hasInlineSequenceFrames(originalHtml) ||
    preparedHtml.length < originalHtml.length - 5000
  );
}

export async function prepareAndPersistLeadSiteHtml(
  siteSlug: string,
  html: string,
  metadata?: Record<string, unknown> | SiteMetadata | null,
  industry?: string | null,
): Promise<string> {
  const prepared = await prepareLeadSiteHtml(html, metadata, industry);

  if (!shouldPersistCompactedHtml(html, prepared) || prepared === html) {
    return prepared;
  }

  const sequenceId =
    extractScrollHeroSequenceId(prepared) ??
    getScrollHeroSequenceIdFromMetadata(metadata);

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
      `[prepare-lead-site-html] Failed to persist compacted HTML for ${siteSlug}:`,
      error.message,
    );
  }

  return prepared;
}

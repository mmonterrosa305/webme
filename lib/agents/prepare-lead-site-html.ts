import {
  hasScrollHeroSequence,
  prepareScrollHeroSequenceSiteHtmlAsync,
} from "./scroll-hero-sequence";
import { prepareScrollHeroVideoSiteHtml } from "./scroll-hero-video";
import type { SiteMetadata } from "@/lib/site-editor/types";

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

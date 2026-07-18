import { applyStoredSiteEnrichmentsToHtml } from "@/lib/leads/enrich-built-site-html";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isInvalidHeroTagline,
  normalizeHeroSection,
} from "@/lib/site-editor/normalize-hero-section";
import type { SiteMetadata } from "@/lib/site-editor/types";
import { resolveSequenceHeroCopy } from "@/lib/scroll-hero/resolve-sequence-hero-copy";
import { stripSequenceHeroFromSiteHtml } from "@/lib/scroll-hero/strip-sequence-hero-html";

import { applyCuratedRetailImagesToHtml } from "./apply-curated-retail-images";
import {
  hasScrollHeroSequence,
  hasStaleSequenceInitScript,
} from "./scroll-hero-sequence";
import { prepareScrollHeroVideoSiteHtml } from "./scroll-hero-video";
import {
  isRetailLikeIndustry,
  prefersCuratedIndustryImages,
  shouldUseProductCueImageSearch,
} from "./retail-industry";

export function getScrollHeroSequenceIdFromMetadata(
  metadata: Record<string, unknown> | SiteMetadata | null | undefined,
): string | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const value = (metadata as SiteMetadata).scrollHeroSequenceId;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function resolveScrollHeroSequenceId(
  metadata: Record<string, unknown> | SiteMetadata | null | undefined,
): string | null {
  return (
    getScrollHeroSequenceIdFromMetadata(metadata) ||
    (metadata as SiteMetadata | null)?.buildOptions?.scrollHeroSequencePresetId?.trim() ||
    null
  );
}

export async function prepareLeadSiteHtml(
  html: string,
  metadata?: Record<string, unknown> | SiteMetadata | null,
  industry?: string | null,
  businessName?: string | null,
): Promise<string> {
  const sequenceId = resolveScrollHeroSequenceId(metadata);
  const retailLike = isRetailLikeIndustry(industry ?? "");
  let prepared = normalizeHeroSection(html);

  if (sequenceId || hasScrollHeroSequence(html) || hasStaleSequenceInitScript(html)) {
    prepared = stripSequenceHeroFromSiteHtml(prepared).html;
  } else {
    prepared = prepareScrollHeroVideoSiteHtml(prepared, {
      simpleLoop: retailLike,
    });
  }

  prepared = normalizeHeroSection(prepared);

  const taglineForCues =
    typeof (metadata as SiteMetadata | null)?.tagline === "string"
      ? (metadata as SiteMetadata).tagline
      : null;

  // Skip curated Unsplash when name/tagline carry product cues (Pixabay at build time).
  if (
    industry &&
    prefersCuratedIndustryImages(industry) &&
    !shouldUseProductCueImageSearch(industry, businessName, taglineForCues)
  ) {
    prepared = applyCuratedRetailImagesToHtml(prepared, industry).html;
  }

  return applyStoredSiteEnrichmentsToHtml(
    prepared,
    metadata as SiteMetadata | null,
  );
}

function healPollutedTaglineMetadata(
  html: string,
  metadata: SiteMetadata,
  businessName: string,
): { metadata: SiteMetadata; changed: boolean } {
  const current = metadata.tagline?.trim() ?? "";
  if (current && !isInvalidHeroTagline(current)) {
    return { metadata, changed: false };
  }

  const resolved = resolveSequenceHeroCopy({
    html,
    metadata: { ...metadata, tagline: undefined },
    businessName,
  });

  const next: SiteMetadata = { ...metadata };
  if (resolved.tagline) {
    if (next.tagline === resolved.tagline) {
      return { metadata: next, changed: false };
    }
    next.tagline = resolved.tagline;
  } else if (next.tagline) {
    delete next.tagline;
  } else {
    return { metadata: next, changed: false };
  }

  return { metadata: next, changed: true };
}

export async function prepareAndPersistLeadSiteHtml(
  siteSlug: string,
  html: string,
  metadata?: Record<string, unknown> | SiteMetadata | null,
  industry?: string | null,
  businessName?: string | null,
): Promise<string> {
  const prepared = await prepareLeadSiteHtml(
    html,
    metadata,
    industry,
    businessName,
  );
  const sequenceId = getScrollHeroSequenceIdFromMetadata(metadata);

  let baseMetadata: SiteMetadata = {
    ...((metadata as SiteMetadata | null) ?? {}),
    ...(sequenceId ? { scrollHeroSequenceId: sequenceId } : {}),
  };

  const taglineForCues =
    typeof baseMetadata.tagline === "string" ? baseMetadata.tagline : null;
  const skipCurated = shouldUseProductCueImageSearch(
    industry ?? "",
    businessName,
    taglineForCues,
  );

  if (industry && prefersCuratedIndustryImages(industry) && !skipCurated) {
    const { images } = applyCuratedRetailImagesToHtml(prepared, industry);
    if (images) {
      baseMetadata = {
        ...baseMetadata,
        aboutImageUrl: images.about,
        serviceImageUrls: [
          images.service1,
          images.service2,
          images.service3,
          images.service4,
        ],
        galleryImageUrls: [images.gallery1, images.gallery2, images.gallery3],
      };
    }
  }

  const { metadata: nextMetadata, changed: taglineHealed } =
    healPollutedTaglineMetadata(
      prepared,
      baseMetadata,
      businessName?.trim() || siteSlug,
    );

  if (prepared === html && !taglineHealed) {
    return prepared;
  }

  console.log(`[prepare-lead-site-html] Persisting cleaned HTML for ${siteSlug}`, {
    beforeLength: html.length,
    afterLength: prepared.length,
    staleInitScript: hasStaleSequenceInitScript(html),
    sequenceId: sequenceId ?? null,
    taglineHealed,
    retailSimpleLoop: isRetailLikeIndustry(industry ?? ""),
    skipCuratedForProductCues: skipCurated,
  });

  const supabase = createAdminClient();
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

  const { error: projectError } = await supabase
    .from("projects")
    .update({
      site_html: prepared,
      site_metadata: nextMetadata,
    })
    .eq("site_slug", siteSlug);

  if (projectError) {
    console.error(
      `[prepare-lead-site-html] Failed to persist cleaned HTML to projects for ${siteSlug}:`,
      projectError.message,
    );
  }

  return prepared;
}

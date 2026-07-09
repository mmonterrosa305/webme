import type { SiteMetadata } from "@/lib/site-editor/types";
import {
  normalizeHeroVideoAttributes,
} from "@/lib/agents/normalize-hero-video";
import { injectSiteAnimations } from "@/lib/site-editor/inject-site-animations";
import {
  normalizeHeroSection,
  type HeroRatingOptions,
} from "@/lib/site-editor/normalize-hero-section";
import { stripHorizontalScrollSection } from "@/lib/site-editor/strip-horizontal-scroll-section";
import { stripSequenceHeroFromSiteHtml } from "@/lib/scroll-hero/strip-sequence-hero-html";

import { enrichBuiltSiteWithGoogleMap } from "./enrich-built-site-with-google-map";
import { applyStoredGoogleMapToHtml } from "./enrich-built-site-with-google-map";
import {
  applyStoredGoogleReviewsToHtml,
  enrichBuiltSiteWithGoogleReviews,
} from "./enrich-built-site-with-google-reviews";

export async function enrichBuiltSiteHtml(options: {
  html: string;
  metadata: SiteMetadata;
  businessName: string;
  city: string;
  address?: string | null;
  placeId?: string | null;
  rating?: HeroRatingOptions["rating"];
  reviewCount?: HeroRatingOptions["reviewCount"];
}): Promise<{ html: string; metadata: SiteMetadata }> {
  const withReviews = await enrichBuiltSiteWithGoogleReviews({
    html: options.html,
    metadata: options.metadata,
    businessName: options.businessName,
    city: options.city,
    placeId: options.placeId,
  });

  const heroRating: HeroRatingOptions | undefined =
    typeof options.rating === "number" && Number.isFinite(options.rating)
      ? { rating: options.rating, reviewCount: options.reviewCount }
      : undefined;

  const withoutHorizontalScroll = stripHorizontalScrollSection(withReviews.html);
  const normalizedHero = normalizeHeroSection(withoutHorizontalScroll, heroRating);
  const withHeroPlayback = normalizeHeroVideoAttributes(normalizedHero);
  const withAnimations = injectSiteAnimations(withHeroPlayback);
  console.log("[enrichBuiltSiteHtml] enrichments:", {
    businessName: options.businessName,
    beforeLength: withReviews.html.length,
    afterLength: withAnimations.length,
    hasHorizontalScroll: withAnimations.includes("webme-horizontal-scroll"),
    hasInitScript: withAnimations.includes("webme-site-animations-init"),
  });

  return enrichBuiltSiteWithGoogleMap({
    html: withAnimations,
    metadata: withReviews.metadata,
    address: options.address,
  });
}

export function applyStoredSiteEnrichmentsToHtml(
  html: string,
  metadata?: SiteMetadata | null,
): string {
  let prepared = applyStoredGoogleReviewsToHtml(html, metadata);
  prepared = applyStoredGoogleMapToHtml(prepared, metadata);
  prepared = stripHorizontalScrollSection(prepared);
  prepared = normalizeHeroSection(prepared);
  prepared = normalizeHeroVideoAttributes(prepared);
  prepared = injectSiteAnimations(prepared);
  return prepared;
}

export { applyStoredGoogleMapToHtml, applyStoredGoogleReviewsToHtml };

/** Prepare iframe HTML for external sequence hero sites (strip hero + ensure animations). */
export function prepareSequenceIframeHtml(html: string): string {
  const normalized = normalizeHeroSection(html);
  const stripped = stripSequenceHeroFromSiteHtml(normalized);
  const withoutHorizontalScroll = stripHorizontalScrollSection(stripped.html);
  return injectSiteAnimations(withoutHorizontalScroll);
}

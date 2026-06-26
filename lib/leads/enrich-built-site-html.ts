import type { SiteMetadata } from "@/lib/site-editor/types";
import { injectSiteAnimations } from "@/lib/site-editor/inject-site-animations";
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
}): Promise<{ html: string; metadata: SiteMetadata }> {
  const withReviews = await enrichBuiltSiteWithGoogleReviews({
    html: options.html,
    metadata: options.metadata,
    businessName: options.businessName,
    city: options.city,
    placeId: options.placeId,
  });

  const withAnimations = injectSiteAnimations(withReviews.html);
  console.log("[enrichBuiltSiteHtml] injectSiteAnimations:", {
    businessName: options.businessName,
    beforeLength: withReviews.html.length,
    afterLength: withAnimations.length,
    hasGsap: withAnimations.includes("gsap.min.js"),
    hasScrollTrigger: withAnimations.includes("ScrollTrigger"),
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
  prepared = injectSiteAnimations(prepared);
  return prepared;
}

export { applyStoredGoogleMapToHtml, applyStoredGoogleReviewsToHtml };

/** Prepare iframe HTML for external sequence hero sites (strip hero + ensure animations). */
export function prepareSequenceIframeHtml(html: string): string {
  const stripped = stripSequenceHeroFromSiteHtml(html);
  return injectSiteAnimations(stripped.html);
}

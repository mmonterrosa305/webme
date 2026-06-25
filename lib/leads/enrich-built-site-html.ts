import type { SiteMetadata } from "@/lib/site-editor/types";
import { injectSiteAnimations } from "@/lib/site-editor/inject-site-animations";

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

  return enrichBuiltSiteWithGoogleMap({
    html: injectSiteAnimations(withReviews.html),
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
  return prepared;
}

export { applyStoredGoogleMapToHtml, applyStoredGoogleReviewsToHtml };

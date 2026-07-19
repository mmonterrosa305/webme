import {
  fetchGoogleReviews,
  filterGoogleReviewsForDisplay,
} from "@/lib/google-places/fetch-google-reviews";
import {
  hasGoogleReviewsSection,
  injectGoogleReviewsSection,
  ensureGoogleReviewsSectionStyles,
} from "@/lib/site-editor/inject-google-reviews";
import type { SiteMetadata } from "@/lib/site-editor/types";

export async function enrichBuiltSiteWithGoogleReviews(options: {
  html: string;
  metadata: SiteMetadata;
  businessName: string;
  city: string;
  placeId?: string | null;
}): Promise<{ html: string; metadata: SiteMetadata }> {
  const fetched = await fetchGoogleReviews({
    placeId: options.placeId ?? options.metadata.googlePlaceId,
    businessName: options.businessName,
    city: options.city,
    maxReviews: 5,
  });

  if (!fetched.reviews.length) {
    return { html: options.html, metadata: options.metadata };
  }

  return {
    html: injectGoogleReviewsSection(options.html, fetched.reviews),
    metadata: {
      ...options.metadata,
      googleReviews: fetched.reviews,
      googlePlaceId: fetched.placeId ?? options.metadata.googlePlaceId,
    },
  };
}

export function applyStoredGoogleReviewsToHtml(
  html: string,
  metadata?: SiteMetadata | null,
): string {
  // Always refresh contrast styles for existing review sections.
  if (hasGoogleReviewsSection(html)) {
    return ensureGoogleReviewsSectionStyles(html);
  }

  if (!metadata?.googleReviews?.length) {
    return html;
  }

  const displayableReviews = filterGoogleReviewsForDisplay(metadata.googleReviews);
  if (!displayableReviews.length) {
    return html;
  }

  return injectGoogleReviewsSection(html, displayableReviews);
}

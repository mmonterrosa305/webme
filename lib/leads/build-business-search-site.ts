import { buildSite } from "@/lib/agents/buildSite";
import type { BusinessProfile } from "@/lib/agents/scrapeBusinessData";
import { extractScrollHeroSequenceId } from "@/lib/agents/scroll-hero-sequence";
import { uploadLogo } from "@/lib/agents/upload-logo";
import { DEFAULT_SECTIONS } from "@/lib/agents/site-options";
import { withScrollHeroSequenceMetadata } from "@/lib/site-editor/scroll-hero-metadata";
import {
  contentToMetadata,
  extractSiteContent,
} from "@/lib/site-editor/extract-content";
import { enrichBuiltSiteHtml } from "@/lib/leads/enrich-built-site-html";
import { createAdminClient } from "@/lib/supabase/admin";

import type { ScrollHeroMediaType } from "@/lib/agents/scroll-build-options";

import type { BusinessSearchResult } from "./business-search-types";

const SUPPORTED_LOGO_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

async function persistLogo(
  logoUrl: string,
  businessName: string,
): Promise<string | null> {
  try {
    const response = await fetch(logoUrl);
    if (!response.ok) {
      return null;
    }

    const mediaType = response.headers.get("content-type")?.split(";")[0];
    if (!mediaType || !SUPPORTED_LOGO_TYPES.has(mediaType)) {
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength === 0 || buffer.byteLength > 5 * 1024 * 1024) {
      return null;
    }

    return uploadLogo(buffer.toString("base64"), mediaType, businessName);
  } catch {
    return null;
  }
}

function toBusinessProfile(result: BusinessSearchResult): BusinessProfile {
  const website = result.websiteData;
  const descriptionParts = [
    result.description,
    website?.headline ? `Headline: ${website.headline}` : null,
    website?.tagline ? `Tagline: ${website.tagline}` : null,
    website?.adCopy.length
      ? `Prominent ad copy: ${website.adCopy.join(" | ")}`
      : null,
  ].filter(Boolean);

  return {
    businessName: result.businessName,
    address: result.address,
    phone: result.phone,
    hours: result.hours,
    rating: result.rating,
    reviewCount: result.reviewCount,
    topReviews: [],
    ownerName: null,
    ownerEmail: null,
    services: result.services,
    description:
      descriptionParts.length > 0 ? descriptionParts.join("\n\n") : null,
    instagramBio: null,
    instagramPosts: [],
    facebookDescription: null,
    yelpCategories: [],
    priceRange: null,
    photos: [],
    brandImageUrls: [],
    website: result.website,
    facebookPosts: [],
    instagramHashtags: [],
    sourceErrors: { googlePlaces: "business-search" },
  };
}

export async function buildBusinessSearchSite(
  result: BusinessSearchResult,
  options?: {
    scrollAnimationEffect?: boolean;
    scrollHeroMediaType?: ScrollHeroMediaType;
    scrollHeroVideoUrl?: string | null;
    scrollHeroSequencePresetId?: string | null;
    cardHoverEffect?: boolean;
  },
) {
  const businessProfile = toBusinessProfile(result);
  const tagline =
    result.websiteData?.headline ??
    result.websiteData?.tagline ??
    result.description ??
    undefined;

  let logoUrl: string | undefined;
  const scrapedLogo = result.websiteData?.logoUrl;

  if (scrapedLogo) {
    const storedLogoUrl = await persistLogo(scrapedLogo, result.businessName);
    logoUrl = storedLogoUrl ?? scrapedLogo;
  }

  const { html: builtHtml, siteSlug } = await buildSite({
    city: result.city,
    industry: result.industry,
    tagline,
    paletteId: "midnight",
    styleId: "modern-minimal",
    sections: DEFAULT_SECTIONS,
    createLogoForMe: !logoUrl,
    businessProfile,
    logoUrl,
    scrollAnimationEffect: options?.scrollAnimationEffect ?? false,
    scrollHeroMediaType: options?.scrollHeroMediaType ?? "video",
    scrollHeroVideoUrl: options?.scrollHeroVideoUrl ?? null,
    scrollHeroSequencePresetId: options?.scrollHeroSequencePresetId ?? null,
    cardHoverEffect: options?.cardHoverEffect ?? false,
  });

  if (!builtHtml?.trim()) {
    throw new Error("Site build produced empty HTML.");
  }

  const siteBuiltAt = new Date().toISOString();
  const supabase = createAdminClient();
  const siteContent = extractSiteContent(builtHtml, {
    businessName: result.businessName,
    phone: result.phone ?? "",
    address: result.address ?? "",
  });

  let siteMetadata = withScrollHeroSequenceMetadata(
    contentToMetadata(siteContent),
    options?.scrollHeroSequencePresetId,
  );

  const enriched = await enrichBuiltSiteHtml({
    html: builtHtml,
    metadata: siteMetadata,
    businessName: result.businessName,
    city: result.city,
    address: result.address,
    placeId: result.placeId,
  });
  const html = enriched.html;
  siteMetadata = enriched.metadata;

  const leadRow = {
    business_name: result.businessName,
    city: result.city,
    industry: result.industry,
    address: result.address,
    phone: result.phone,
    has_website: Boolean(result.website),
    existing_website_url: result.website,
    owner_email: null,
    owner_name: null,
    site_html: html,
    site_slug: siteSlug,
    site_built_at: siteBuiltAt,
    status: "pending_review",
    site_version: "A",
    site_metadata: siteMetadata,
    preview_edits_used: 0,
  };

  const { error: deleteError } = await supabase
    .from("leads")
    .delete()
    .eq("business_name", result.businessName)
    .eq("city", result.city);

  if (deleteError) {
    console.error(
      "[business-search] Failed to delete old leads:",
      deleteError.message,
    );
  }

  const { error: leadSaveError } = await supabase.from("leads").upsert(
    leadRow,
    { onConflict: "site_slug" },
  );

  console.log("[business-search] Supabase save attempt:", {
    businessName: result.businessName,
    city: result.city,
    siteSlug,
    siteHtmlLength: html.length,
    scrollHeroSequencePresetId: options?.scrollHeroSequencePresetId ?? null,
    hasSequenceCanvas: html.includes('data-webme-scroll-hero="sequence"'),
    sequenceIdInHtml: extractScrollHeroSequenceId(html),
    siteMetadataSequenceId:
      (leadRow.site_metadata as { scrollHeroSequenceId?: string })
        .scrollHeroSequenceId ?? null,
    saveError: leadSaveError?.message ?? null,
  });

  if (leadSaveError) {
    const {
      site_metadata: _siteMetadata,
      preview_edits_used: _previewEditsUsed,
      ...fallbackRow
    } = leadRow;

    const { error: fallbackError } = await supabase.from("leads").upsert(
      fallbackRow,
      { onConflict: "site_slug" },
    );

    if (fallbackError) {
      throw new Error(
        `Site was generated but could not be saved: ${fallbackError.message}`,
      );
    }
  }

  return {
    siteSlug,
    businessName: result.businessName,
    html,
  };
}

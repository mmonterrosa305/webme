import { buildSite, type BuildSiteInput } from "@/lib/agents/buildSite";
import { prepareLeadSiteHtml } from "@/lib/agents/prepare-lead-site-html";
import {
  COLOR_PALETTES,
  DESIGN_STYLES,
  SITE_SECTIONS,
  type PaletteId,
  type SectionId,
  type StyleId,
} from "@/lib/agents/site-options";
import { enrichBuiltSiteHtml } from "@/lib/leads/enrich-built-site-html";
import { resolveSiteBuildOptions } from "@/lib/leads/site-build-options";
import { scrapeBusinessData } from "@/lib/agents/scrapeBusinessData";
import { resolveScrollHeroAssetsForBuild } from "@/lib/scroll-hero/resolve-for-build";
import { withScrollHeroSequenceMetadata } from "@/lib/site-editor/scroll-hero-metadata";
import {
  contentToMetadata,
  extractSiteContent,
} from "@/lib/site-editor/extract-content";
import { isInvalidHeroTagline } from "@/lib/site-editor/normalize-hero-section";
import type { SiteMetadata } from "@/lib/site-editor/types";
import { createAdminClient } from "@/lib/supabase/admin";

function isPaletteId(value: string): value is PaletteId {
  return COLOR_PALETTES.some((palette) => palette.id === value);
}

function isStyleId(value: string): value is StyleId {
  return DESIGN_STYLES.some((style) => style.id === value);
}

function parseSections(value: string[]): SectionId[] | null {
  const validIds = new Set<string>(SITE_SECTIONS.map((section) => section.id));
  const sections: SectionId[] = [];

  for (const item of value) {
    if (!validIds.has(item)) {
      return null;
    }

    sections.push(item as SectionId);
  }

  return sections.length > 0 ? sections : null;
}

type LeadRebuildRow = {
  id: string;
  business_name: string;
  city: string;
  industry: string | null;
  address: string | null;
  phone: string | null;
  has_website: boolean | null;
  existing_website_url: string | null;
  owner_email: string | null;
  site_slug: string;
  site_html: string | null;
  site_metadata: SiteMetadata | null;
};

function preserveHeroCopy(
  stored: string | undefined,
  extracted: string | undefined,
): string | undefined {
  const storedValue = stored?.trim();
  if (storedValue && !isInvalidHeroTagline(storedValue)) {
    return storedValue;
  }

  const extractedValue = extracted?.trim();
  if (extractedValue && !isInvalidHeroTagline(extractedValue)) {
    return extractedValue;
  }

  return undefined;
}

export type RebuildLeadSiteOptions = {
  scrollHeroSequencePresetId?: string | null;
};

/** Rebuild a lead site in place, preserving the existing slug and build options. */
export async function rebuildLeadSite(
  siteSlug: string,
  options?: RebuildLeadSiteOptions,
): Promise<{
  siteSlug: string;
  siteBuiltAt: string;
}> {
  const normalizedSlug = siteSlug.trim();
  if (!normalizedSlug) {
    throw new Error("site_slug is required.");
  }

  const supabase = createAdminClient();
  const { data: lead, error } = await supabase
    .from("leads")
    .select(
      "id, business_name, city, industry, address, phone, has_website, existing_website_url, owner_email, site_slug, site_html, site_metadata",
    )
    .eq("site_slug", normalizedSlug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!lead) {
    throw new Error("Lead not found for this site.");
  }

  const leadRow = lead as LeadRebuildRow;
  let buildOptions = resolveSiteBuildOptions({
    metadata: leadRow.site_metadata,
    siteHtml: leadRow.site_html,
  });

  const sequenceOverride = options?.scrollHeroSequencePresetId?.trim();
  if (sequenceOverride) {
    buildOptions = {
      ...buildOptions,
      scrollAnimationEffect: true,
      scrollHeroMediaType: "image-sequence",
      scrollHeroSequencePresetId: sequenceOverride,
      scrollHeroPresetId: null,
    };
  }

  if (!isPaletteId(buildOptions.paletteId)) {
    throw new Error(`Invalid stored palette: ${buildOptions.paletteId}`);
  }

  if (!isStyleId(buildOptions.styleId)) {
    throw new Error(`Invalid stored style: ${buildOptions.styleId}`);
  }

  const sections = parseSections(buildOptions.sections);
  if (!sections) {
    throw new Error("Invalid stored site sections.");
  }

  const businessProfile = await scrapeBusinessData({
    businessName: leadRow.business_name,
    city: leadRow.city,
  });

  if (leadRow.phone) {
    businessProfile.phone = leadRow.phone;
  }

  let scrollHeroMediaType = buildOptions.scrollHeroMediaType;
  let scrollHeroVideoUrl: string | null = null;
  let scrollHeroPosterUrl: string | null = null;
  let scrollHeroSequencePresetId = buildOptions.scrollHeroSequencePresetId ?? null;

  if (buildOptions.scrollAnimationEffect) {
    const scrollHeroAssets = await resolveScrollHeroAssetsForBuild({
      businessName: leadRow.business_name,
      scrollHeroMediaType: buildOptions.scrollHeroMediaType,
      videoPresetId: buildOptions.scrollHeroPresetId,
      sequencePresetId: buildOptions.scrollHeroSequencePresetId,
    });

    scrollHeroMediaType = scrollHeroAssets.mediaType;
    scrollHeroVideoUrl = scrollHeroAssets.videoUrl;
    scrollHeroPosterUrl = scrollHeroAssets.posterUrl;
    scrollHeroSequencePresetId = scrollHeroAssets.sequencePresetId;
  }

  const storedLogoUrl = leadRow.site_metadata?.logoUrl?.trim();

  const buildInput: BuildSiteInput = {
    city: leadRow.city,
    industry: leadRow.industry?.trim() || "General",
    tagline: leadRow.site_metadata?.tagline,
    paletteId: buildOptions.paletteId,
    styleId: buildOptions.styleId,
    sections,
    createLogoForMe: buildOptions.createLogoForMe && !storedLogoUrl,
    businessProfile,
    logoUrl: storedLogoUrl || undefined,
    scrollAnimationEffect: buildOptions.scrollAnimationEffect,
    scrollHeroMediaType,
    scrollHeroVideoUrl,
    scrollHeroPosterUrl,
    scrollHeroSequencePresetId,
    cardHoverEffect: buildOptions.cardHoverEffect,
    existingSiteSlug: normalizedSlug,
  };

  const { html: builtHtml } = await buildSite(buildInput);

  if (!builtHtml?.trim()) {
    throw new Error("Site rebuild produced empty HTML.");
  }

  const siteBuiltAt = new Date().toISOString();
  const siteContent = extractSiteContent(builtHtml, {
    businessName: leadRow.business_name,
    phone: leadRow.phone ?? businessProfile.phone ?? "",
    address: leadRow.address ?? businessProfile.address ?? "",
  });

  let siteMetadata = withScrollHeroSequenceMetadata(
    contentToMetadata(siteContent),
    scrollHeroSequencePresetId,
  );

  siteMetadata = {
    ...siteMetadata,
    buildOptions,
    logoUrl: storedLogoUrl || siteMetadata.logoUrl,
    headline: preserveHeroCopy(
      leadRow.site_metadata?.headline,
      siteMetadata.headline,
    ),
    tagline: preserveHeroCopy(leadRow.site_metadata?.tagline, siteMetadata.tagline),
    googlePlaceId:
      buildOptions.googlePlaceId ?? leadRow.site_metadata?.googlePlaceId,
  };

  const enriched = await enrichBuiltSiteHtml({
    html: builtHtml,
    metadata: siteMetadata,
    businessName: leadRow.business_name,
    city: leadRow.city,
    address: leadRow.address ?? businessProfile.address,
    placeId: buildOptions.googlePlaceId ?? leadRow.site_metadata?.googlePlaceId,
    rating: businessProfile.rating,
    reviewCount: businessProfile.reviewCount,
  });

  siteMetadata = {
    ...enriched.metadata,
    buildOptions,
    headline: preserveHeroCopy(
      leadRow.site_metadata?.headline,
      enriched.metadata.headline,
    ),
    tagline: preserveHeroCopy(
      leadRow.site_metadata?.tagline,
      enriched.metadata.tagline,
    ),
  };

  const html = await prepareLeadSiteHtml(
    enriched.html,
    siteMetadata,
    leadRow.industry,
  );

  const { error: updateError } = await supabase
    .from("leads")
    .update({
      site_html: html,
      site_built_at: siteBuiltAt,
      site_metadata: siteMetadata,
      industry: leadRow.industry,
    })
    .eq("id", leadRow.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return {
    siteSlug: normalizedSlug,
    siteBuiltAt,
  };
}

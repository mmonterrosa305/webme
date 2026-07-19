import { DEFAULT_SECTIONS } from "@/lib/agents/site-options";
import {
  DEFAULT_SITE_BUILD_PRICE_USD,
  parseSiteBuildPriceUsd,
  type SiteBuildPriceUsd,
} from "@/lib/plans/build-price";
import type { SiteBuildOptions, SiteMetadata } from "@/lib/site-editor/types";

export const DEFAULT_SITE_BUILD_OPTIONS: SiteBuildOptions = {
  paletteId: "midnight",
  styleId: "modern-minimal",
  sections: [...DEFAULT_SECTIONS],
  createLogoForMe: true,
  scrollAnimationEffect: false,
  scrollHeroMediaType: "video",
  scrollHeroPresetId: null,
  scrollHeroSequencePresetId: null,
  cardHoverEffect: false,
  googlePlaceId: null,
  buildPriceUsd: DEFAULT_SITE_BUILD_PRICE_USD,
};

export function captureSiteBuildOptions(input: {
  paletteId: string;
  styleId: string;
  sections: string[];
  createLogoForMe: boolean;
  scrollAnimationEffect: boolean;
  scrollHeroMediaType: "video" | "image-sequence";
  scrollHeroPresetId?: string | null;
  scrollHeroSequencePresetId?: string | null;
  cardHoverEffect: boolean;
  googlePlaceId?: string | null;
  buildPriceUsd?: SiteBuildPriceUsd | null;
}): SiteBuildOptions {
  return {
    paletteId: input.paletteId,
    styleId: input.styleId,
    sections: [...input.sections],
    createLogoForMe: input.createLogoForMe,
    scrollAnimationEffect: input.scrollAnimationEffect,
    scrollHeroMediaType: input.scrollHeroMediaType,
    scrollHeroPresetId: input.scrollHeroPresetId ?? null,
    scrollHeroSequencePresetId: input.scrollHeroSequencePresetId ?? null,
    cardHoverEffect: input.cardHoverEffect,
    googlePlaceId: input.googlePlaceId ?? null,
    buildPriceUsd:
      parseSiteBuildPriceUsd(input.buildPriceUsd) ??
      DEFAULT_SITE_BUILD_PRICE_USD,
  };
}

export function resolveSiteBuildOptions(options: {
  metadata?: SiteMetadata | null;
  siteHtml?: string | null;
}): SiteBuildOptions {
  const stored = options.metadata?.buildOptions;
  if (stored?.paletteId && stored.styleId && stored.sections?.length) {
    return {
      ...DEFAULT_SITE_BUILD_OPTIONS,
      ...stored,
      sections: [...stored.sections],
      buildPriceUsd:
        parseSiteBuildPriceUsd(stored.buildPriceUsd) ??
        DEFAULT_SITE_BUILD_PRICE_USD,
    };
  }

  const metadata = options.metadata;
  const siteHtml = options.siteHtml ?? "";
  const scrollHeroSequencePresetId =
    metadata?.scrollHeroSequenceId?.trim() ||
    metadata?.buildOptions?.scrollHeroSequencePresetId?.trim() ||
    null;
  const hasScrollHero =
    siteHtml.includes("data-webme-scroll-hero") ||
    siteHtml.includes("webme-scroll-hero");
  const hasSequence =
    Boolean(scrollHeroSequencePresetId) ||
    siteHtml.includes('data-webme-scroll-hero="sequence"');

  return {
    ...DEFAULT_SITE_BUILD_OPTIONS,
    scrollAnimationEffect: hasScrollHero || hasSequence,
    scrollHeroMediaType: scrollHeroSequencePresetId ? "image-sequence" : "video",
    scrollHeroSequencePresetId,
    cardHoverEffect: siteHtml.includes('id="webme-service-card-hover-init"'),
    googlePlaceId: metadata?.googlePlaceId ?? null,
    buildPriceUsd:
      parseSiteBuildPriceUsd(metadata?.buildOptions?.buildPriceUsd) ??
      DEFAULT_SITE_BUILD_PRICE_USD,
  };
}

export function getLeadBuildPriceUsd(
  metadata?: SiteMetadata | null,
): SiteBuildPriceUsd {
  return (
    parseSiteBuildPriceUsd(metadata?.buildOptions?.buildPriceUsd) ??
    DEFAULT_SITE_BUILD_PRICE_USD
  );
}

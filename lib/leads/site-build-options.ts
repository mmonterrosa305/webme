import { DEFAULT_SECTIONS } from "@/lib/agents/site-options";
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
  };
}

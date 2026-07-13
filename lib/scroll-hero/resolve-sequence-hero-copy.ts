import * as cheerio from "cheerio";

import { isPlaceholderRatingCopy, isInvalidHeroTagline } from "@/lib/site-editor/normalize-hero-section";

import { extractSiteContent } from "@/lib/site-editor/extract-content";
import type { SiteMetadata } from "@/lib/site-editor/types";

import { stripSequenceHeroFromSiteHtml } from "./strip-sequence-hero-html";

export type SequenceHeroCopy = {
  headline: string;
  tagline: string;
  posterUrl: string;
};

function parseTitleParts(html: string): { headline: string; tagline: string } {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match?.[1]) {
    return { headline: "", tagline: "" };
  }

  const titleText = cheerio.load(`<span>${match[1]}</span>`)("span").text().trim();
  const parts = titleText.split("|").map((part) => part.trim());

  return {
    headline: parts[0] ?? "",
    tagline: parts.slice(1).join(" | ").trim(),
  };
}

function pickValidTagline(...candidates: Array<string | undefined | null>): string {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim() ?? "";
    if (trimmed && !isInvalidHeroTagline(trimmed)) {
      return trimmed;
    }
  }

  return "";
}

export function resolveSequenceHeroCopy(options: {
  html: string;
  metadata?: SiteMetadata | null;
  businessName: string;
}): SequenceHeroCopy {
  const stripped = stripSequenceHeroFromSiteHtml(options.html);
  const titleParts = parseTitleParts(options.html);
  // Ignore polluted metadata.tagline so extract can fall through to title / hero.
  const content = extractSiteContent(options.html, {
    businessName: options.businessName,
    metadata: {
      ...(options.metadata ?? {}),
      tagline: pickValidTagline(options.metadata?.tagline) || undefined,
    },
  });

  const tagline = pickValidTagline(
    options.metadata?.tagline,
    stripped.tagline,
    titleParts.tagline,
    content.tagline,
  );

  const rawHeadline =
    options.metadata?.headline?.trim() ||
    stripped.headline ||
    content.headline ||
    titleParts.headline ||
    options.businessName.trim();

  const headline =
    isPlaceholderRatingCopy(rawHeadline) || isInvalidHeroTagline(rawHeadline)
      ? options.businessName.trim()
      : rawHeadline;

  return {
    headline,
    tagline,
    posterUrl: stripped.posterUrl || options.metadata?.heroImageUrl?.trim() || "",
  };
}

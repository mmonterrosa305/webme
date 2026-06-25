import * as cheerio from "cheerio";

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

export function resolveSequenceHeroCopy(options: {
  html: string;
  metadata?: SiteMetadata | null;
  businessName: string;
}): SequenceHeroCopy {
  const stripped = stripSequenceHeroFromSiteHtml(options.html);
  const titleParts = parseTitleParts(options.html);
  const content = extractSiteContent(options.html, {
    businessName: options.businessName,
    metadata: options.metadata,
  });

  const headline =
    options.metadata?.headline?.trim() ||
    stripped.headline ||
    content.headline ||
    titleParts.headline ||
    options.businessName.trim();

  const tagline =
    options.metadata?.tagline?.trim() ||
    stripped.tagline ||
    titleParts.tagline ||
    content.tagline;

  return {
    headline,
    tagline,
    posterUrl: stripped.posterUrl || options.metadata?.heroImageUrl?.trim() || "",
  };
}

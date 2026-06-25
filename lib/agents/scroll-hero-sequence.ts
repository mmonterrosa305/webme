import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

import { stripSequenceHeroFromSiteHtml } from "@/lib/scroll-hero/strip-sequence-hero-html";

export const SCROLL_HERO_SEQUENCE_MARKER = "sequence";
export const SCROLL_HERO_SEQUENCE_ID_ATTR = "data-webme-sequence-id";

export function hasScrollHeroSequence(html: string): boolean {
  return html.includes('data-webme-scroll-hero="sequence"');
}

export function hasInlineSequenceFrames(html: string): boolean {
  return /<script[^>]*\bid=["']webme-scroll-hero-frames["'][^>]*>/i.test(html);
}

export function hasStaleSequenceInitScript(html: string): boolean {
  if (!hasScrollHeroSequence(html)) {
    return false;
  }

  return (
    html.includes("function preloadFrames") ||
    html.includes('getElementById("webme-scroll-hero-frames")') ||
    html.includes('id="webme-scroll-hero-sequence-init"')
  );
}

export function extractScrollHeroSequenceId(html: string): string | null {
  const match = html.match(
    new RegExp(
      `${SCROLL_HERO_SEQUENCE_ID_ATTR}=["']([^"']+)["']`,
      "i",
    ),
  );

  return match?.[1]?.trim() ?? null;
}

function isTrustBarSection($: cheerio.CheerioAPI, element: AnyNode): boolean {
  const className = $(element).attr("class") ?? "";
  return /trust-bar/i.test(className);
}

function findScrollHeroTargetSection(
  $: cheerio.CheerioAPI,
): cheerio.Cheerio<AnyNode> {
  const byId = $("#hero").first();
  if (byId.length) {
    return byId;
  }

  const byHeadline = $('[data-webme="headline"]').closest("section").first();
  if (byHeadline.length) {
    return byHeadline;
  }

  const byHeroImage = $('[data-webme="hero-image"]').closest("section").first();
  if (byHeroImage.length) {
    return byHeroImage;
  }

  const byHeroContent = $(".hero-content").closest("section").first();
  if (byHeroContent.length) {
    return byHeroContent;
  }

  const byHeroClass = $("section.hero").first();
  if (byHeroClass.length) {
    return byHeroClass;
  }

  const sections = $("section").filter((_index, element) => {
    if (isTrustBarSection($, element)) {
      return false;
    }

    const $section = $(element);
    const id = ($section.attr("id") ?? "").toLowerCase();
    const className = ($section.attr("class") ?? "").toLowerCase();
    return id === "hero" || className.includes("hero");
  });

  if (sections.length) {
    return sections.first();
  }

  return $("section")
    .filter((_index, element) => !isTrustBarSection($, element))
    .first();
}

/** Prepare generated HTML for an externally rendered sequence hero (metadata only). */
export function prepareSiteHtmlForSequenceBuild(html: string): string {
  const $ = cheerio.load(html);
  const $hero = findScrollHeroTargetSection($);

  if ($hero.length && !$hero.is("#webme-scroll-hero")) {
    $hero.remove();
  }

  return stripSequenceHeroFromSiteHtml($.html()).html;
}

/** @deprecated Sequence heroes render in Next.js — strips legacy injected markup. */
export function applyScrollHeroSequence(
  html: string,
  _sequenceId: string,
  _posterUrl: string,
): string {
  return prepareSiteHtmlForSequenceBuild(html);
}

export function replaceScrollHeroSequenceId(
  html: string,
  _sequenceId: string,
): string {
  return stripSequenceHeroFromSiteHtml(html).html;
}

/** @deprecated Legacy inline-frame matching for preview picker state. */
export function matchSequencePresetIdFromFrames(
  framesUrls: string[],
  presets: { id: string; frames_urls: string[] }[],
): string | null {
  if (!framesUrls.length) {
    return null;
  }

  const firstFrame = framesUrls[0];
  const match = presets.find(
    (preset) =>
      preset.frames_urls[0] === firstFrame ||
      (preset.frames_urls.length === framesUrls.length &&
        preset.frames_urls.every((url, index) => url === framesUrls[index])),
  );

  return match?.id ?? null;
}

export function extractScrollHeroSequenceFrames(html: string): string[] {
  const match = html.match(
    /<script[^>]*id="webme-scroll-hero-frames"[^>]*>([\s\S]*?)<\/script>/i,
  );

  if (!match?.[1]) {
    return [];
  }

  try {
    const parsed = JSON.parse(match[1]) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

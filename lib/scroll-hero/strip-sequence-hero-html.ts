import * as cheerio from "cheerio";

export type StrippedSequenceHero = {
  html: string;
  headline: string;
  tagline: string;
  posterUrl: string;
};

function extractHeroCopy($: cheerio.CheerioAPI): {
  headline: string;
  tagline: string;
  posterUrl: string;
} {
  const $scrollHero = $("#webme-scroll-hero");

  const headline =
    $scrollHero.find('[data-webme="headline"]').first().text().trim() ||
    $('[data-webme="headline"]').first().text().trim();

  const tagline =
    $scrollHero.find('[data-webme="tagline"]').first().text().trim() ||
    $('[data-webme="tagline"]').first().text().trim();

  const posterUrl =
    $scrollHero
      .find('canvas[data-webme-scroll-hero="sequence"]')
      .attr("data-poster")
      ?.trim() ||
    $('canvas[data-webme-scroll-hero="sequence"]').attr("data-poster")?.trim() ||
    "";

  return { headline, tagline, posterUrl };
}

const NAV_CLEARANCE_PADDING = "80px";

function mergePaddingTop(style: string, paddingTop: string): string {
  const trimmed = style.trim().replace(/;+\s*$/, "");
  if (/padding-top\s*:/i.test(trimmed)) {
    const updated = trimmed.replace(
      /padding-top\s*:\s*[^;]+/i,
      `padding-top: ${paddingTop}`,
    );
    return updated.endsWith(";") ? updated : `${updated};`;
  }

  return trimmed ? `${trimmed}; padding-top: ${paddingTop};` : `padding-top: ${paddingTop};`;
}

function addNavClearanceToFirstContentBlock($: cheerio.CheerioAPI): void {
  const skipTags = new Set(["script", "style", "link", "noscript", "header", "nav"]);

  let $target = null;

  for (const child of $("body").children().toArray()) {
    const tagName = child.tagName?.toLowerCase() ?? "";
    if (!tagName || skipTags.has(tagName)) {
      continue;
    }

    if (tagName === "section" || tagName === "div") {
      $target = $(child);
      break;
    }
  }

  if (!$target?.length) {
    $target = $("body section").first();
  }

  if (!$target?.length) {
    $target = $("body div").first();
  }

  if (!$target?.length) {
    return;
  }

  $target.attr("style", mergePaddingTop($target.attr("style") ?? "", NAV_CLEARANCE_PADDING));
}

/** Remove baked-in sequence hero markup/scripts so the hero renders in Next.js instead. */
export function stripSequenceHeroFromSiteHtml(html: string): StrippedSequenceHero {
  const $ = cheerio.load(html);
  const extracted = extractHeroCopy($);

  $("#webme-scroll-hero-init").remove();
  $("#webme-scroll-hero-sequence-init").remove();
  $("#webme-scroll-hero-frames").remove();
  $('script[src*="gsap.min.js"]').remove();
  $('script[src*="ScrollTrigger"]').remove();
  $("#webme-scroll-hero-styles").remove();
  $("html").removeClass("webme-scroll-hero-page");
  $("header, nav").removeClass("webme-scroll-hero-nav");

  const $rest = $(".webme-scroll-hero-rest").first();
  if ($rest.length) {
    $rest.children().insertAfter($rest);
    $rest.remove();
  }

  $("#webme-scroll-hero").remove();
  $('canvas[data-webme-scroll-hero="sequence"]').each((_index, element) => {
    const $section = $(element).closest("section");
    if ($section.length) {
      $section.remove();
    } else {
      $(element).remove();
    }
  });

  addNavClearanceToFirstContentBlock($);

  return {
    html: $.html(),
    ...extracted,
  };
}

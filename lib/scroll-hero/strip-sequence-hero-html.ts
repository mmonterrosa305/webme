import * as cheerio from "cheerio";

export type StrippedSequenceHero = {
  html: string;
  headline: string;
  tagline: string;
  posterUrl: string;
};

const SEQUENCE_SITE_LAYOUT_STYLE_ID = "webme-sequence-site-layout";

const SEQUENCE_SITE_LAYOUT_STYLES = `<style id="${SEQUENCE_SITE_LAYOUT_STYLE_ID}">
body.webme-sequence-site {
  margin: 0 !important;
  overflow-x: visible !important;
  overflow-y: visible !important;
}
body.webme-sequence-site.webme-sequence-site-has-nav .webme-sequence-first-section {
  margin-top: 0 !important;
  padding-top: var(--webme-sequence-nav-offset, 88px) !important;
  position: relative !important;
  z-index: 1 !important;
  overflow: visible !important;
}
body.webme-sequence-site > section:first-child,
body.webme-sequence-site > header + section,
body.webme-sequence-site > nav + section,
body.webme-sequence-site > .webme-sequence-first-section {
  margin-top: 0 !important;
  position: relative !important;
  z-index: 1 !important;
  overflow: visible !important;
}
</style>`;

function stripNegativeMarginFromStyle(style: string): string {
  return style
    .replace(/margin-top\s*:\s*[^;]+;?/gi, "")
    .replace(/margin\s*:\s*[^;]+;?/gi, (match) => {
      if (/^-/.test(match)) {
        return "";
      }
      return match;
    })
    .trim();
}

function normalizePostSequenceHeroLayout($: cheerio.CheerioAPI): void {
  $("body").addClass("webme-sequence-site");

  $(`#${SEQUENCE_SITE_LAYOUT_STYLE_ID}`).remove();
  const head = $("head");
  if (head.length) {
    head.append(SEQUENCE_SITE_LAYOUT_STYLES);
  }

  const $firstSection = $("body")
    .children("section")
    .filter((_index, element) => {
      const id = $(element).attr("id") ?? "";
      return id !== "webme-scroll-hero";
    })
    .first();

  if (!$firstSection.length) {
    return;
  }

  $firstSection.addClass("webme-sequence-first-section");

  const existingStyle = $firstSection.attr("style") ?? "";
  if (/margin-top\s*:\s*-|margin\s*:\s*-/i.test(existingStyle)) {
    $firstSection.attr("style", stripNegativeMarginFromStyle(existingStyle));
  }

  const $nav = $("body").children("header, nav").first();
  if (!$nav.length) {
    const $nestedNav = $("body header, body nav").first();
    if ($nestedNav.length) {
      $("body").addClass("webme-sequence-site-has-nav");
    }
  } else {
    $("body").addClass("webme-sequence-site-has-nav");
  }
}

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

  normalizePostSequenceHeroLayout($);

  return {
    html: $.html(),
    ...extracted,
  };
}

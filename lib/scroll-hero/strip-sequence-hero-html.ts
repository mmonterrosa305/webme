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

  return {
    html: $.html(),
    ...extracted,
  };
}

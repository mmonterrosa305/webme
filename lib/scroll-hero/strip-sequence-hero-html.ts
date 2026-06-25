import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";

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

const MIN_NAV_CLEARANCE_PX = 120;

function parsePx(value: string): number | null {
  const match = value.trim().match(/^([\d.]+)px$/i);
  return match ? Number.parseFloat(match[1]) : null;
}

function parsePaddingVertical(ruleBody: string): { top: number; bottom: number } {
  let top = 20;
  let bottom = 20;

  const shorthand = ruleBody.match(/padding:\s*([^;]+)/i)?.[1]?.trim();
  if (shorthand) {
    const parts = shorthand.split(/\s+/);
    const values = parts.map((part) => parsePx(part)).filter((v): v is number => v !== null);

    if (values.length === 1) {
      top = bottom = values[0];
    } else if (values.length === 2) {
      top = bottom = values[0];
    } else if (values.length === 3) {
      top = values[0];
      bottom = values[2] ?? values[0];
    } else if (values.length >= 4) {
      top = values[0];
      bottom = values[2];
    }
  }

  const paddingTop = ruleBody.match(/padding-top:\s*([^;]+)/i)?.[1];
  const paddingBottom = ruleBody.match(/padding-bottom:\s*([^;]+)/i)?.[1];

  if (paddingTop) {
    top = parsePx(paddingTop.trim()) ?? top;
  }

  if (paddingBottom) {
    bottom = parsePx(paddingBottom.trim()) ?? bottom;
  }

  return { top, bottom };
}

function isFixedOrStickyNav(ruleBody: string): boolean {
  return /position\s*:\s*(fixed|sticky)/i.test(ruleBody);
}

function estimateNavClearancePx($: cheerio.CheerioAPI): number {
  const $nav = $("body").children("header, nav").first().length
    ? $("body").children("header, nav").first()
    : $("header, nav").first();

  if (!$nav.length) {
    return MIN_NAV_CLEARANCE_PX;
  }

  const tagName = ($nav.prop("tagName") ?? "header").toLowerCase();
  const css = $("style").first().text();
  const ruleMatch = css.match(
    new RegExp(`(?:^|[\\n\\r])${tagName}\\s*\\{([^}]+)\\}`, "i"),
  );
  const ruleBody = ruleMatch?.[1] ?? "";

  const { top, bottom } = parsePaddingVertical(ruleBody);

  const logoStyle = $nav.find('[data-webme="logo"]').attr("style") ?? "";
  const logoHeightMatch = logoStyle.match(/height:\s*(\d+)px/i);
  const logoHeight = logoHeightMatch
    ? Number.parseInt(logoHeightMatch[1], 10)
    : 60;

  const estimated = top + logoHeight + bottom;

  return Math.max(MIN_NAV_CLEARANCE_PX, estimated);
}

function isHeroSection($: cheerio.Cheerio<AnyNode>): boolean {
  const id = ($.attr("id") ?? "").toLowerCase();
  const className = ($.attr("class") ?? "").toLowerCase();

  if (id === "hero" || id === "webme-scroll-hero") {
    return true;
  }

  if (className.split(/\s+/).includes("hero")) {
    return !className.includes("trust");
  }

  if (
    $.find('[data-webme="headline"], [data-webme="hero-image"], [data-webme="tagline"]').length >
    0
  ) {
    return !className.includes("trust");
  }

  return false;
}

function removeOrphanHeroSection($: cheerio.CheerioAPI): void {
  $("#hero, #webme-scroll-hero").remove();

  $("section").each((_index, element) => {
    const $section = $(element);
    if (isHeroSection($section)) {
      $section.remove();
    }
  });
}

function describeElement($: cheerio.Cheerio<AnyNode>): string {
  const tag = ($.prop("tagName") ?? "unknown").toLowerCase();
  const id = $.attr("id");
  const className = $.attr("class");
  const parts = [tag];
  if (id) {
    parts.push(`#${id}`);
  }
  if (className) {
    parts.push(`.${className.trim().split(/\s+/).join(".")}`);
  }
  return parts.join("");
}

function findNavClearanceTarget(
  $: cheerio.CheerioAPI,
): cheerio.Cheerio<AnyNode> | null {
  const $nav = $("body").children("header, nav").first();

  const $trustBar = $(
    "section.trust-bar, section[class*='trust-bar'], section[class*='trust-bar ']",
  ).first();
  if ($trustBar.length) {
    return $trustBar;
  }

  if ($nav.length) {
    const $afterNav = $nav
      .nextAll("section, div")
      .filter((_index, element) => !isHeroSection($(element)))
      .first();

    if ($afterNav.length) {
      return $afterNav;
    }
  }

  for (const child of $("body").children().toArray()) {
    const $child = $(child);
    const tagName = (child as Element).tagName?.toLowerCase() ?? "";

    if (["script", "style", "link", "noscript", "header", "nav"].includes(tagName)) {
      continue;
    }

    if ((tagName === "section" || tagName === "div") && !isHeroSection($child)) {
      return $child;
    }
  }

  const $fallbackSection = $("body section")
    .filter((_index, element) => !isHeroSection($(element)))
    .first();

  return $fallbackSection.length ? $fallbackSection : null;
}

function mergeNavClearanceStyle(existing: string, paddingTop: string): string {
  let style = existing.trim().replace(/;+\s*$/, "");

  if (/padding-top\s*:/i.test(style)) {
    style = style.replace(/padding-top\s*:\s*[^;]+/i, `padding-top: ${paddingTop}`);
  } else {
    style = style ? `${style}; padding-top: ${paddingTop}` : `padding-top: ${paddingTop}`;
  }

  if (/margin-top\s*:/i.test(style)) {
    style = style.replace(/margin-top\s*:\s*[^;]+/i, "margin-top: 0");
  } else {
    style = `${style}; margin-top: 0`;
  }

  return style.endsWith(";") ? style : `${style};`;
}

function addNavClearanceToFirstContentBlock($: cheerio.CheerioAPI): void {
  const $target = findNavClearanceTarget($);
  if (!$target?.length) {
    console.log("[strip-sequence-hero] nav clearance: no target element found");
    return;
  }

  const clearancePx = estimateNavClearancePx($);
  const paddingTop = `${clearancePx}px`;
  const previousStyle = $target.attr("style") ?? "";
  const nextStyle = mergeNavClearanceStyle(previousStyle, paddingTop);

  $target.attr("style", nextStyle);

  const $nav = $("body").children("header, nav").first();
  const navCss = $("style").first().text();
  const navTag = ($nav.prop("tagName") ?? "none").toLowerCase();
  const navRule = navCss.match(
    new RegExp(`(?:^|[\\n\\r])${navTag}\\s*\\{([^}]+)\\}`, "i"),
  )?.[1];

  console.log("[strip-sequence-hero] nav clearance applied:", {
    target: describeElement($target),
    previousStyle: previousStyle || "(none)",
    appliedStyle: nextStyle,
    clearancePx,
    navElement: $nav.length ? describeElement($nav) : null,
    navIsFixedOrSticky: navRule ? isFixedOrStickyNav(navRule) : null,
    navRule: navRule?.trim().slice(0, 160) ?? null,
  });
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

  removeOrphanHeroSection($);
  addNavClearanceToFirstContentBlock($);

  return {
    html: $.html(),
    ...extracted,
  };
}

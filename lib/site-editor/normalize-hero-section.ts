import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

export type HeroRatingOptions = {
  rating?: number | null;
  reviewCount?: number | null;
};

const PLACEHOLDER_RATING_CORE = "star rating";

const HERO_RATING_SELECTOR =
  "h1, h2, h3, h4, h5, h6, p, span, div, strong, label, li, dt, dd, small, em, b, i, a, td, th, figcaption";

const HERO_STAT_BLOCK_SELECTOR =
  ".trust-item, .hero-stat, .hero-badge, .stat, .stat-badge, [class*='stat-item'], [class*='hero-rating'], [class*='hero-stat'], [class*='hero-stats'], [class*='hero-badge'], [class*='trust-stat']";

function isTrustBarSection($: cheerio.CheerioAPI, element: AnyNode): boolean {
  const className = $(element).attr("class") ?? "";
  return /trust-bar/i.test(className);
}

function findHeroSection($: cheerio.CheerioAPI): cheerio.Cheerio<AnyNode> {
  const byId = $("#hero, #webme-scroll-hero").first();
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

export function formatHeroRatingText(
  rating: number,
  reviewCount?: number | null,
): string {
  const display = Number.isInteger(rating) ? String(rating) : rating.toFixed(1);

  if (reviewCount && reviewCount > 0) {
    return `⭐ ${display} (${reviewCount.toLocaleString("en-US")} reviews)`;
  }

  return `⭐ ${display}`;
}

function hasRealRating(options?: HeroRatingOptions): options is {
  rating: number;
  reviewCount?: number | null;
} {
  return typeof options?.rating === "number" && Number.isFinite(options.rating);
}

function normalizePlaceholderRatingText(text: string): string {
  return text
    .trim()
    .replace(/^[\s⭐★✩✪✫✬✭✮✯✰🌟]+/gu, "")
    .replace(/^[\s:.\-–—,;!?]+/g, "")
    .replace(/[\s:.\-–—,;!?]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isPlaceholderRatingText(text: string): boolean {
  return normalizePlaceholderRatingText(text) === PLACEHOLDER_RATING_CORE;
}

function elementHasOnlyPlaceholderDescendants(
  $: cheerio.CheerioAPI,
  $element: cheerio.Cheerio<AnyNode>,
): boolean {
  const childElements = $element.children();

  if (!childElements.length) {
    return isPlaceholderRatingText($element.text());
  }

  return childElements.toArray().every((child) => {
    const $child = $(child);
    return (
      isPlaceholderRatingText($child.text()) ||
      elementHasOnlyPlaceholderDescendants($, $child)
    );
  });
}

/** Remove any element whose entire visible text is the Star Rating placeholder. */
function stripExactPlaceholderRatingElements(
  $: cheerio.CheerioAPI,
  $scope?: cheerio.Cheerio<AnyNode>,
): void {
  const $roots = $scope?.length ? $scope.toArray() : [$("body").get(0)].filter(Boolean);

  for (const root of $roots) {
    if (!root) {
      continue;
    }

    $(root)
      .find(HERO_RATING_SELECTOR)
      .each((_index, element) => {
        const $element = $(element);
        const tagName = ($element.prop("tagName") ?? "").toLowerCase();

        if (["html", "body", "head", "script", "style"].includes(tagName)) {
          return;
        }

        if (!isPlaceholderRatingText($element.text().trim())) {
          return;
        }

        if (!elementHasOnlyPlaceholderDescendants($, $element)) {
          return;
        }

        $element.remove();
      });
  }
}

function blockHasPlaceholderRatingLabel(
  $: cheerio.CheerioAPI,
  $block: cheerio.Cheerio<AnyNode>,
): boolean {
  return $block
    .find(HERO_RATING_SELECTOR)
    .addBack()
    .filter((_index, element) => {
      const $element = $(element);
      if ($element.find(HERO_RATING_SELECTOR).length > 0) {
        return false;
      }

      return isPlaceholderRatingText($element.text());
    })
    .length > 0;
}

function removePlaceholderStatBlocks(
  $: cheerio.CheerioAPI,
  $hero: cheerio.Cheerio<AnyNode>,
): void {
  $hero.find(HERO_STAT_BLOCK_SELECTOR).each((_index, element) => {
    const $block = $(element);

    if (!blockHasPlaceholderRatingLabel($, $block)) {
      return;
    }

    if (hasRealRatingValue($block)) {
      return;
    }

    $block.remove();
  });
}

function hasRealRatingValue($block: cheerio.Cheerio<AnyNode>): boolean {
  const text = $block.text().trim();
  if (!text) {
    return false;
  }

  if (isPlaceholderRatingText(text)) {
    return false;
  }

  return /⭐|\b\d(?:\.\d)?\s*(?:stars?|reviews?)?\b/i.test(text);
}

function findRatingStatRoot(
  $: cheerio.CheerioAPI,
  element: AnyNode,
): cheerio.Cheerio<AnyNode> {
  const $element = $(element);
  const statRoot = $element.closest(HERO_STAT_BLOCK_SELECTOR);

  if (statRoot.length) {
    return statRoot.first();
  }

  if ($element.is("h3, h4, p, span, div")) {
    return $element;
  }

  return $element.parent();
}

function upsertHeroRatingElement(
  $: cheerio.CheerioAPI,
  $hero: cheerio.Cheerio<AnyNode>,
  $content: cheerio.Cheerio<AnyNode>,
  ratingText: string,
): void {
  const $existing = $hero.find('[data-webme="hero-rating"], .hero-rating').first();

  if ($existing.length) {
    $existing.text(ratingText);
    return;
  }

  const $tagline = $content.find('[data-webme="tagline"]').first();
  const $rating = $(`<p class="hero-rating" data-webme="hero-rating"></p>`).text(
    ratingText,
  );

  if ($tagline.length) {
    $tagline.after($rating);
    return;
  }

  const $headline = $content.find('[data-webme="headline"], h1').first();
  if ($headline.length) {
    $headline.after($rating);
    return;
  }

  $content.prepend($rating);
}

function normalizeHeroRating(
  $: cheerio.CheerioAPI,
  $hero: cheerio.Cheerio<AnyNode>,
  options?: HeroRatingOptions,
): void {
  const $content = $hero
    .find(".hero-content, .webme-scroll-hero-content, [class*='hero-content']")
    .first();

  const $copyScope = $content.length ? $content : $hero;

  $hero.find(HERO_RATING_SELECTOR).each((_index, element) => {
    const $element = $(element);
    const text = $element.text().trim();

    if (!isPlaceholderRatingText(text)) {
      return;
    }

    const $statRoot = findRatingStatRoot($, element);
    if (!$statRoot.length) {
      $element.remove();
      return;
    }

    if (hasRealRating(options)) {
      const ratingText = formatHeroRatingText(options.rating, options.reviewCount);
      $statRoot.empty();
      $statRoot.attr("class", "hero-rating");
      $statRoot.attr("data-webme", "hero-rating");
      $statRoot.text(ratingText);
      return;
    }

    $statRoot.remove();
  });

  removePlaceholderStatBlocks($, $hero);

  $copyScope
    .find('[data-webme="tagline"], [data-webme="headline"]')
    .each((_index, element) => {
      const $element = $(element);
      if (isPlaceholderRatingText($element.text().trim())) {
        $element.remove();
      }
    });

  if (hasRealRating(options) && $content.length) {
    const ratingText = formatHeroRatingText(options.rating, options.reviewCount);
    const hasVisibleRating = $hero
      .find('[data-webme="hero-rating"], .hero-rating')
      .toArray()
      .some((element) => $(element).text().trim().length > 0);

    if (!hasVisibleRating) {
      upsertHeroRatingElement($, $hero, $content, ratingText);
    }
  }
}

function stripPlaceholderTrustBarSections($: cheerio.CheerioAPI): void {
  $("section.trust-bar, section[class*='trust-bar']").each((_index, element) => {
    const $section = $(element);

    if (!blockHasPlaceholderRatingLabel($, $section)) {
      return;
    }

    if (hasRealRatingValue($section)) {
      return;
    }

    const onlyPlaceholders = $section
      .find(".trust-item, [class*='trust-item']")
      .toArray()
      .every((item) => {
        const $item = $(item);
        return (
          blockHasPlaceholderRatingLabel($, $item) && !hasRealRatingValue($item)
        );
      });

    if (onlyPlaceholders) {
      $section.remove();
    }
  });
}

const HERO_CTA_SCROLL_STYLE_ID = "webme-hero-cta-scroll-styles";
const HERO_CTA_SCROLL_INIT_ID = "webme-hero-cta-scroll-init";

const HERO_CTA_SCROLL_STYLES = `<style id="${HERO_CTA_SCROLL_STYLE_ID}">
html { scroll-behavior: smooth; }
</style>`;

const HERO_CTA_SCROLL_INIT_SCRIPT = `<script id="${HERO_CTA_SCROLL_INIT_ID}">
(function () {
  function findContactTarget() {
    var byId = document.getElementById("contact");
    if (byId) {
      return byId;
    }

    var phone = document.querySelector('[data-webme="phone"]');
    if (phone && phone.closest) {
      var phoneSection = phone.closest("section");
      if (phoneSection) {
        return phoneSection;
      }
    }

    var forms = document.querySelectorAll("section form");
    for (var i = 0; i < forms.length; i++) {
      var formSection = forms[i].closest("section");
      if (formSection) {
        return formSection;
      }
    }

    return null;
  }

  function scrollToContact(event) {
    var target = findContactTarget();
    if (!target) {
      return;
    }

    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function bindHeroCtas() {
    var selectors = [
      ".hero-content a[href='#contact']",
      ".webme-scroll-hero-content a[href='#contact']",
      ".hero-content a.btn",
      ".hero-content button.btn",
      ".hero-content .btn-primary",
      ".hero-content .cta",
      ".hero-content .hero-cta",
      ".webme-scroll-hero-content a.btn",
      ".webme-scroll-hero-content button.btn",
      ".webme-scroll-hero-content .btn-primary",
      ".webme-scroll-hero-content .cta",
      ".webme-scroll-hero-content .hero-cta",
    ];

    document.querySelectorAll(selectors.join(",")).forEach(function (element) {
      if (element.getAttribute("data-webme-hero-cta-bound") === "true") {
        return;
      }

      element.setAttribute("data-webme-hero-cta-bound", "true");
      element.addEventListener("click", scrollToContact);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindHeroCtas);
  } else {
    bindHeroCtas();
  }
})();
</script>`;

function findContactSection($: cheerio.CheerioAPI): cheerio.Cheerio<AnyNode> {
  const byId = $("#contact").first();
  if (byId.length) {
    return byId;
  }

  return $("section")
    .filter((_index, element) => {
      const $section = $(element);
      return (
        $section.find('[data-webme="phone"]').length > 0 ||
        $section.find("form").length > 0 ||
        /contact/i.test($section.attr("id") ?? "") ||
        /contact/i.test($section.attr("class") ?? "")
      );
    })
    .first();
}

function ensureContactSectionId($: cheerio.CheerioAPI): void {
  const $contact = findContactSection($);
  if (!$contact.length || $contact.attr("id") === "contact") {
    return;
  }

  if (!$contact.attr("id")?.trim()) {
    $contact.attr("id", "contact");
  }
}

function wireHeroCtaLinks(
  $: cheerio.CheerioAPI,
  $hero: cheerio.Cheerio<AnyNode>,
): void {
  $hero.find("a, button").each((_index, element) => {
    if (!isHeroCta($, element)) {
      return;
    }

    const $cta = $(element);

    if ($cta.is("button")) {
      $cta.attr("type", "button");
      return;
    }

    $cta.attr("href", "#contact");
  });
}

function ensureHeroCtaScrollAssets($: cheerio.CheerioAPI): void {
  if ($(`#${HERO_CTA_SCROLL_INIT_ID}`).length) {
    return;
  }

  $(`#${HERO_CTA_SCROLL_STYLE_ID}`).remove();
  $("head").append(HERO_CTA_SCROLL_STYLES);
  $("body").append(HERO_CTA_SCROLL_INIT_SCRIPT);
}

function isHeroCta($: cheerio.CheerioAPI, element: AnyNode): boolean {
  const $element = $(element);
  const className = ($element.attr("class") ?? "").toLowerCase();
  const href = ($element.attr("href") ?? "").toLowerCase();

  if ($element.is("a.btn, button.btn, .btn, .btn-primary, .cta, .hero-cta")) {
    return true;
  }

  return $element.is("a") && (className.includes("btn") || href === "#contact");
}

function ensureHeroContentWrapper(
  $: cheerio.CheerioAPI,
  $hero: cheerio.Cheerio<AnyNode>,
): cheerio.Cheerio<AnyNode> {
  let $content = $hero
    .find(".hero-content, .webme-scroll-hero-content, [class*='hero-content']")
    .first();

  if ($content.length) {
    return $content;
  }

  const parts: string[] = ['<div class="hero-content">'];
  const $headline = $hero.find('[data-webme="headline"], h1').first();
  const $tagline = $hero.find('[data-webme="tagline"], p').first();

  if ($headline.length) {
    parts.push($.html($headline));
    $headline.remove();
  }

  if ($tagline.length) {
    parts.push($.html($tagline));
    $tagline.remove();
  }

  $hero.find("a.btn, button.btn, .btn, .btn-primary, .cta, .hero-cta, a[href='#contact']").each(
    (_index, element) => {
      if (isHeroCta($, element)) {
        parts.push($.html($(element)));
        $(element).remove();
      }
    },
  );

  parts.push("</div>");
  $hero.append(parts.join(""));
  $content = $hero.find(".hero-content").first();
  return $content;
}

function mergeHeroContentStyles(existing: string): string {
  let style = existing.trim().replace(/;+\s*$/, "");

  const ensure = (property: string, value: string) => {
    const pattern = new RegExp(`${property}\\s*:\\s*[^;]+`, "i");
    if (pattern.test(style)) {
      style = style.replace(pattern, `${property}: ${value}`);
      return;
    }

    style = style ? `${style}; ${property}: ${value}` : `${property}: ${value}`;
  };

  ensure("display", "flex");
  ensure("flex-direction", "column");
  ensure("align-items", "center");
  ensure("gap", "1rem");
  ensure("padding-top", "120px");

  return style.endsWith(";") ? style : `${style};`;
}

function relocateHeroCta(
  $: cheerio.CheerioAPI,
  $hero: cheerio.Cheerio<AnyNode>,
): void {
  const $content = ensureHeroContentWrapper($, $hero);
  if (!$content.length) {
    return;
  }

  $hero.find("a, button").each((_index, element) => {
    if (!isHeroCta($, element)) {
      return;
    }

    const $cta = $(element);
    if ($content[0] && $.contains($content[0], element)) {
      return;
    }

    $content.append($cta);
  });

  const $tagline = $content.find('[data-webme="tagline"]').first();
  const $rating = $content.find('[data-webme="hero-rating"], .hero-rating').first();
  const $ctas = $content.find("a.btn, button.btn, .btn, .btn-primary, .cta, .hero-cta");

  $ctas.each((_index, element) => {
    const $cta = $(element);
    if ($rating.length) {
      $rating.after($cta);
      return;
    }

    if ($tagline.length) {
      $tagline.after($cta);
      return;
    }

    const $headline = $content.find('[data-webme="headline"], h1').first();
    if ($headline.length) {
      $headline.after($cta);
    }
  });

  const existingStyle = $content.attr("style") ?? "";
  $content.attr("style", mergeHeroContentStyles(existingStyle));
  $content.addClass("hero-content");
}

/** Normalize hero rating placeholders and keep the CTA inside the hero content stack. */
export function normalizeHeroSection(
  html: string,
  options?: HeroRatingOptions,
): string {
  const $ = cheerio.load(html);
  const $hero = findHeroSection($);

  if ($hero.length) {
    normalizeHeroRating($, $hero, options);
    ensureContactSectionId($);
    relocateHeroCta($, $hero);
    wireHeroCtaLinks($, $hero);
    ensureHeroCtaScrollAssets($);
  }

  stripPlaceholderTrustBarSections($);
  stripExactPlaceholderRatingElements($);

  return $.html();
}

export function isPlaceholderRatingCopy(text: string): boolean {
  return isPlaceholderRatingText(text);
}

const KNOWN_TRUST_BAR_STAT_LABELS = new Set([
  "customer reviews",
  "google reviews",
  "verified reviews",
  "average rating",
  "overall rating",
  "star rating",
  "years experience",
  "years of experience",
  "happy customers",
  "satisfied customers",
  "projects completed",
  "homes serviced",
  "jobs completed",
  "open 6 days",
  "open 7 days",
  "5-star reviews",
  "5 star reviews",
]);

/**
 * True when copy looks like a trust-bar stat label (e.g. "Customer Reviews")
 * rather than a real hero tagline.
 */
export function isTrustBarStatLabel(text: string): boolean {
  const normalized = text
    .trim()
    .replace(/^[\s⭐★✩✪✫✬✭✮✯✰🌟]+/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  if (!normalized) {
    return false;
  }

  if (isPlaceholderRatingText(normalized)) {
    return true;
  }

  if (KNOWN_TRUST_BAR_STAT_LABELS.has(normalized)) {
    return true;
  }

  if (/^(customer|google|verified)?\s*reviews?$/i.test(normalized)) {
    return true;
  }

  if (/^(average|overall)?\s*rating$/i.test(normalized)) {
    return true;
  }

  if (/^years?\s+(of\s+)?experience$/i.test(normalized)) {
    return true;
  }

  if (/^(happy|satisfied)\s+customers?$/i.test(normalized)) {
    return true;
  }

  return false;
}

/** Rejects placeholder rating copy and trust-bar stat labels. */
export function isInvalidHeroTagline(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return true;
  }

  return isPlaceholderRatingCopy(trimmed) || isTrustBarStatLabel(trimmed);
}

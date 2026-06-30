import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

export const HERO_PARALLAX_BG_RATE = 0.45;
export const HERO_PARALLAX_INIT_ID = "webme-hero-parallax-init";
export const HERO_PARALLAX_STYLE_ID = "webme-hero-parallax-styles";

const HERO_PARALLAX_STYLES = `<style id="${HERO_PARALLAX_STYLE_ID}">
.webme-hero-parallax {
  position: relative;
  z-index: 0;
  isolation: isolate;
}
.webme-hero-parallax-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  z-index: 0;
  overflow: hidden;
  will-change: transform;
  pointer-events: none;
}
.webme-hero-parallax-bg video,
.webme-hero-parallax-bg [data-webme="hero-image"] {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  min-width: 100% !important;
  min-height: 100% !important;
  object-fit: cover !important;
  object-position: center !important;
  margin: 0 !important;
  padding: 0 !important;
  border: none !important;
}
.webme-hero-parallax-bg .hero-overlay,
.webme-hero-parallax-bg [class*="overlay"] {
  position: absolute !important;
  inset: 0 !important;
  z-index: 1 !important;
  pointer-events: none !important;
}
.webme-hero-parallax-content,
.webme-hero-parallax .hero-content {
  position: relative !important;
  z-index: 2 !important;
  min-height: 100vh;
  min-height: 100dvh;
}
#webme-scroll-hero.webme-hero-parallax .webme-scroll-hero-content.webme-hero-parallax-content {
  margin-top: -100vh;
  margin-top: -100dvh;
  min-height: 100vh;
  min-height: 100dvh;
  position: relative !important;
  z-index: 2 !important;
  pointer-events: none;
}
#webme-scroll-hero.webme-hero-parallax .webme-scroll-hero-content.webme-hero-parallax-content a,
#webme-scroll-hero.webme-hero-parallax .webme-scroll-hero-content.webme-hero-parallax-content button {
  pointer-events: auto;
}
#webme-scroll-hero.webme-hero-parallax .webme-scroll-hero-pin .webme-hero-parallax-media {
  will-change: transform;
}
</style>`;

const HERO_PARALLAX_INIT_SCRIPT = `<script id="${HERO_PARALLAX_INIT_ID}">
(function () {
  var BG_RATE = ${HERO_PARALLAX_BG_RATE};
  var DELAY_RATIO = 0.12;

  function isScrollHeroSection(section) {
    return section.id === "webme-scroll-hero";
  }

  function getParallaxBg(section) {
    if (isScrollHeroSection(section)) {
      var pin = section.querySelector(".webme-scroll-hero-pin");
      if (!pin) return null;
      var media = pin.querySelector(".webme-hero-parallax-media");
      if (media) return media;
      var video = pin.querySelector('video[data-webme-scroll-hero="true"], video[data-webme="hero-image"]');
      return video || pin;
    }

    return section.querySelector(".webme-hero-parallax-bg");
  }

  function updateSection(section) {
    var bg = getParallaxBg(section);
    if (!bg) return;

    var rect = section.getBoundingClientRect();
    var scrollPast = -rect.top;
    var viewport = window.innerHeight || 1;
    var sectionHeight = section.offsetHeight || viewport;

    if (scrollPast < 0) {
      bg.style.transform = "";
      if (bg.style.visibility) bg.style.visibility = "";
      return;
    }

    var heroEnd = sectionHeight - viewport;
    if (scrollPast > heroEnd + viewport * 0.5) {
      bg.style.visibility = "hidden";
      return;
    }

    bg.style.visibility = "";

    var delay = viewport * DELAY_RATIO;
    var adjusted = Math.max(0, scrollPast - delay);
    var lagY = adjusted * -BG_RATE;
    bg.style.transform = "translate3d(0," + lagY + "px,0)";
  }

  function tick() {
    var sections = document.querySelectorAll(".webme-hero-parallax");
    sections.forEach(updateSection);
  }

  function init() {
    tick();
    window.addEventListener("scroll", tick, { passive: true });
    window.addEventListener("resize", tick);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
</script>`;

function isScrollHeroSite(html: string): boolean {
  return (
    html.includes('id="webme-scroll-hero"') ||
    html.includes("id='webme-scroll-hero'")
  );
}

function isSequenceHeroSite(html: string): boolean {
  return html.includes('data-webme-scroll-hero="sequence"');
}

function findStandardHeroSection(
  $: cheerio.CheerioAPI,
): cheerio.Cheerio<AnyNode> | null {
  const byId = $("#hero").first();
  if (byId.length) {
    return byId;
  }

  const byHeroClass = $("section.hero").first();
  if (byHeroClass.length) {
    return byHeroClass;
  }

  const byHeadline = $('[data-webme="headline"]').closest("section").first();
  if (byHeadline.length) {
    return byHeadline;
  }

  const byHeroImage = $('[data-webme="hero-image"]').closest("section").first();
  if (byHeroImage.length) {
    return byHeroImage;
  }

  return null;
}

function wrapScrollHeroMedia($: cheerio.CheerioAPI): void {
  const $pin = $("#webme-scroll-hero .webme-scroll-hero-pin").first();
  if (!$pin.length || $pin.find(".webme-hero-parallax-media").length) {
    return;
  }

  const $video = $pin
    .find('video[data-webme-scroll-hero="true"], video[data-webme="hero-image"]')
    .first();
  const $overlay = $pin
    .find(".hero-overlay, [class*='overlay']")
    .filter((_index, element) => /overlay/i.test($(element).attr("class") ?? ""))
    .first();

  const $media = $('<div class="webme-hero-parallax-media"></div>');

  if ($video.length) {
    $media.append($video);
  }

  if ($overlay.length) {
    $media.append($overlay);
  }

  if ($media.children().length) {
    $pin.prepend($media);
  }
}

function detachScrollHeroContentFromPin($: cheerio.CheerioAPI): void {
  const $hero = $("#webme-scroll-hero");
  if (!$hero.length) {
    return;
  }

  const $pin = $hero.find(".webme-scroll-hero-pin").first();
  const $content = $pin
    .find(".webme-scroll-hero-content, .hero-content")
    .first();

  if (!$content.length) {
    return;
  }

  $content.addClass("webme-hero-parallax-content");
  $hero.addClass("webme-hero-parallax");
  $pin.after($content);
}

function restructureStandardHero($: cheerio.CheerioAPI): boolean {
  const $hero = findStandardHeroSection($);
  if (!$hero || !$hero.length || $hero.is("#webme-scroll-hero")) {
    return false;
  }

  const $existingBg = $hero.find(".webme-hero-parallax-bg").first();
  if ($existingBg.length) {
    $hero.addClass("webme-hero-parallax");

    const $content = $hero.find(".hero-content, [class*='hero-content']").first();
    if ($content.length) {
      $content.addClass("webme-hero-parallax-content");
    }

    $hero.find(".webme-hero-parallax-runway").remove();
    return true;
  }

  if ($hero.hasClass("webme-hero-parallax")) {
    $hero.removeClass("webme-hero-parallax");
    $hero
      .find(".webme-hero-parallax-content")
      .removeClass("webme-hero-parallax-content");
  }

  const $video = $hero
    .find('video[data-webme="hero-image"]')
    .filter((_index, element) => $(element).attr("data-webme-scroll-hero") !== "true")
    .first();
  const $bgImage = $hero.find('[data-webme="hero-image"]').not("video").first();
  const $overlay = $hero
    .find(".hero-overlay, [class*='overlay']")
    .filter((_index, element) => /overlay/i.test($(element).attr("class") ?? ""))
    .first();

  if (!$video.length && !$bgImage.length) {
    return false;
  }

  const $bg = $('<div class="webme-hero-parallax-bg"></div>');

  if ($video.length) {
    $bg.append($video);
  } else if ($bgImage.length) {
    $bg.append($bgImage);
  }

  if ($overlay.length && !$.contains($bg.get(0)!, $overlay.get(0)!)) {
    $bg.append($overlay);
  }

  $hero.prepend($bg);
  $hero.addClass("webme-hero-parallax");

  const $content = $hero.find(".hero-content, [class*='hero-content']").first();
  if ($content.length) {
    $content.addClass("webme-hero-parallax-content");
  }

  $hero.find(".webme-hero-parallax-runway").remove();

  return true;
}

function ensureParallaxAssets($: cheerio.CheerioAPI): void {
  $(`#${HERO_PARALLAX_STYLE_ID}`).remove();
  $("head").append(HERO_PARALLAX_STYLES);

  $(`#${HERO_PARALLAX_INIT_ID}`).remove();
  $("body").append(HERO_PARALLAX_INIT_SCRIPT);
}

/** Inject hero parallax markup, styles, and scroll script. Idempotent. */
export function injectHeroParallax(html: string): string {
  if (!html.trim() || isSequenceHeroSite(html)) {
    return html;
  }

  const $ = cheerio.load(html);

  if (isScrollHeroSite(html)) {
    detachScrollHeroContentFromPin($);
    wrapScrollHeroMedia($);
  } else {
    restructureStandardHero($);
  }

  const hasParallax = $(".webme-hero-parallax").length > 0;

  if (!hasParallax) {
    return html;
  }

  $(".webme-hero-parallax-runway").remove();
  ensureParallaxAssets($);
  return $.html();
}

export function prepareScrollHeroParallax($: cheerio.CheerioAPI): void {
  detachScrollHeroContentFromPin($);
  wrapScrollHeroMedia($);
  if ($("#webme-scroll-hero").hasClass("webme-hero-parallax")) {
    $(".webme-hero-parallax-runway").remove();
    ensureParallaxAssets($);
  }
}

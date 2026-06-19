import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

import { fetchPexelsVideoUrls } from "./fetch-pexels-video";
import { getIndustrySearchQueries } from "./fetch-pixabay-photos";

export const GSAP_CDN =
  "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js";
export const SCROLL_TRIGGER_CDN =
  "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js";

const SCROLL_HERO_STYLES = `<style id="webme-scroll-hero-styles">
html.webme-scroll-hero-page,
html.webme-scroll-hero-page body {
  margin: 0 !important;
  padding: 0 !important;
  overflow-x: hidden;
  width: 100%;
}
#webme-scroll-hero {
  margin: 0 !important;
  padding: 0 !important;
  border: none !important;
  max-width: none !important;
  width: 100% !important;
  box-sizing: border-box;
}
.webme-scroll-hero-pin {
  position: sticky;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  min-height: 100vh;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
.webme-scroll-hero-pin video[data-webme-scroll-hero="true"] {
  position: absolute;
  inset: 0;
  width: 100vw;
  height: 100vh;
  max-width: none;
  object-fit: cover;
  z-index: 0;
  margin: 0;
  padding: 0;
  border: none;
}
.webme-scroll-hero-pin .hero-overlay,
.webme-scroll-hero-pin [class*="overlay"] {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}
.webme-scroll-hero-nav {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  width: 100% !important;
  z-index: 10 !important;
  margin: 0 !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  background: rgba(0, 0, 0, 0.35) !important;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border: none !important;
  box-shadow: none !important;
}
.webme-scroll-hero-content {
  position: relative !important;
  z-index: 2 !important;
  width: 100%;
  max-width: 960px;
  margin: 0 auto !important;
  padding: 24px !important;
  text-align: center;
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}
</style>`;

const SCROLL_VIDEO_SEARCH_TERMS: Record<string, string[]> = {
  "Pool Service": ["pool splash", "swimming pool", "pool cleaning"],
  Landscaping: ["lawn mowing", "landscaping", "garden maintenance"],
  Plumbing: ["plumber pipe", "plumbing repair", "plumber work"],
  Roofing: ["roof repair", "roofing contractor", "roofer"],
  Electrician: ["electrician wiring", "electrical repair"],
  HVAC: ["hvac technician", "air conditioning repair"],
  "Cleaning Service": ["house cleaning", "cleaning service"],
  "Pest Control": ["pest control", "exterminator"],
  Painting: ["house painting", "painter wall"],
  "General Contractor": ["construction worker", "renovation"],
};

const SCROLL_HERO_INIT_SCRIPT = `<script id="webme-scroll-hero-init">
(function () {
  function initScrollHeroVideo() {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;

    gsap.registerPlugin(ScrollTrigger);

    var section = document.getElementById("webme-scroll-hero");
    var video = document.querySelector('video[data-webme-scroll-hero="true"]');
    if (!section || !video) return;

    video.pause();
    video.removeAttribute("autoplay");
    video.removeAttribute("loop");

    var existing = ScrollTrigger.getById("webme-scroll-hero");
    if (existing) existing.kill();

    function bindScrub() {
      if (!video.duration || !isFinite(video.duration)) return;

      ScrollTrigger.create({
        id: "webme-scroll-hero",
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        onUpdate: function (self) {
          var targetTime = self.progress * video.duration;
          if (Math.abs(video.currentTime - targetTime) > 0.03) {
            video.currentTime = targetTime;
          }
        },
      });
    }

    if (video.readyState >= 1) {
      bindScrub();
    } else {
      video.addEventListener("loadedmetadata", bindScrub, { once: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initScrollHeroVideo);
  } else {
    initScrollHeroVideo();
  }
})();
</script>`;

export function hasScrollHeroVideo(html: string): boolean {
  return (
    html.includes('data-webme-scroll-hero="true"') ||
    html.includes("id=\"webme-scroll-hero\"")
  );
}

/** Search Pexels for a cinematic hero video matching the business industry. */
export async function fetchScrollHeroVideoFromPexels(
  industry: string,
): Promise<string | null> {
  const trimmed = industry.trim();
  const queries =
    SCROLL_VIDEO_SEARCH_TERMS[trimmed] ??
    getIndustrySearchQueries(trimmed);
  const searchQueries =
    queries.length > 0 ? queries : trimmed ? [trimmed] : ["small business"];

  for (const query of searchQueries) {
    const urls = await fetchPexelsVideoUrls(query);
    if (urls.length > 0) {
      return urls[Math.floor(Math.random() * urls.length)];
    }
  }

  const fallbackUrls = await fetchPexelsVideoUrls("small business");
  if (fallbackUrls.length === 0) {
    return null;
  }

  return fallbackUrls[Math.floor(Math.random() * fallbackUrls.length)];
}

function ensureGsapScripts($: cheerio.CheerioAPI): void {
  const head = $("head");
  if (head.length === 0) {
    return;
  }

  if (!$(`script[src="${GSAP_CDN}"]`).length) {
    head.append(`<script src="${GSAP_CDN}"></script>`);
  }

  if (!$(`script[src="${SCROLL_TRIGGER_CDN}"]`).length) {
    head.append(`<script src="${SCROLL_TRIGGER_CDN}"></script>`);
  }
}

function ensureScrollHeroInitScript($: cheerio.CheerioAPI): void {
  $("#webme-scroll-hero-init").remove();
  $("body").append(SCROLL_HERO_INIT_SCRIPT);
}

function ensureScrollHeroStyles($: cheerio.CheerioAPI): void {
  $("#webme-scroll-hero-styles").remove();
  const head = $("head");
  if (head.length === 0) {
    return;
  }

  head.append(SCROLL_HERO_STYLES);
  $("html").addClass("webme-scroll-hero-page");
}

function findSiteNav($: cheerio.CheerioAPI): cheerio.Cheerio<AnyNode> {
  const heroElement = $("#webme-scroll-hero").get(0);

  for (const element of $("body").children().toArray()) {
    const tagName = element.tagName?.toLowerCase();
    if (tagName === "header" || tagName === "nav") {
      return $(element);
    }

    if (heroElement && element === heroElement) {
      break;
    }
  }

  return $("header, nav").first();
}

function ensureScrollHeroNav($: cheerio.CheerioAPI): void {
  const $nav = findSiteNav($);
  if (!$nav.length) {
    return;
  }

  const existingClass = $nav.attr("class") ?? "";
  if (!existingClass.includes("webme-scroll-hero-nav")) {
    $nav.attr("class", `${existingClass} webme-scroll-hero-nav`.trim());
  }
}

function ensureScrollHeroPinLayout($: cheerio.CheerioAPI): void {
  const $heroSection = $("#webme-scroll-hero");
  if (!$heroSection.length) {
    return;
  }

  $heroSection.attr(
    "style",
    "position:relative;height:300vh;width:100%;margin:0;padding:0;border:none;",
  );

  const $pin = $heroSection.find(".webme-scroll-hero-pin").first();
  if ($pin.length) {
    $pin.removeAttr("style");
  }

  const $video = $heroSection.find('video[data-webme-scroll-hero="true"]').first();
  if ($video.length) {
    $video.attr(
      "style",
      "position:absolute;inset:0;width:100vw;height:100vh;max-width:none;object-fit:cover;z-index:0;margin:0;padding:0;border:none;",
    );
  }

  $heroSection
    .find(".hero-overlay, [class*='overlay']")
    .filter((_index, element) => {
      const className = $(element).attr("class") ?? "";
      return /overlay/i.test(className);
    })
    .each((_index, element) => {
      const $overlay = $(element);
      const style = $overlay.attr("style") ?? "";
      if (!/position\s*:\s*absolute/i.test(style)) {
        $overlay.attr(
          "style",
          `${style};position:absolute;inset:0;background:rgba(0,0,0,0.5);z-index:1;pointer-events:none;`.replace(
            /^;/,
            "",
          ),
        );
      }
    });
}

function ensureScrollHeroContentLayout($: cheerio.CheerioAPI): void {
  const $heroSection = $("#webme-scroll-hero");
  if (!$heroSection.length) {
    return;
  }

  const $content = $heroSection
    .find(".webme-scroll-hero-content, .hero-content, [class*='hero-content']")
    .first();

  if (!$content.length) {
    return;
  }

  const existingClass = $content.attr("class") ?? "";
  if (!existingClass.includes("webme-scroll-hero-content")) {
    $content.attr("class", `${existingClass} webme-scroll-hero-content`.trim());
  }

  $content.removeAttr("style");
}

/** Idempotent fullscreen layout fixes for scroll-hero sites (new and existing HTML). */
export function prepareScrollHeroSiteHtml(html: string): string {
  if (!hasScrollHeroVideo(html)) {
    return html;
  }

  const $ = cheerio.load(html);
  ensureScrollHeroStyles($);
  ensureScrollHeroNav($);
  ensureScrollHeroPinLayout($);
  ensureScrollHeroContentLayout($);
  ensureGsapScripts($);
  ensureScrollHeroInitScript($);
  return $.html();
}

function setVideoSrc($video: cheerio.Cheerio<AnyNode>, videoUrl: string): void {
  $video.attr("src", videoUrl);
  $video.removeAttr("autoplay");
  $video.removeAttr("loop");
  $video.attr("preload", "auto");
  $video.attr("muted", "");
  $video.attr("playsinline", "");
  $video.attr("data-webme", "hero-image");
  $video.attr("data-webme-scroll-hero", "true");

  $video.find("source").remove();
}

export function replaceScrollHeroVideoUrl(
  html: string,
  newVideoUrl: string,
): string | null {
  if (!hasScrollHeroVideo(html)) {
    return replaceHeroVideoUrl(html, newVideoUrl);
  }

  const $ = cheerio.load(html);
  const $video = $('video[data-webme-scroll-hero="true"]').first();

  if (!$video.length) {
    return null;
  }

  setVideoSrc($video, newVideoUrl);
  return prepareScrollHeroSiteHtml($.html());
}

export function replaceHeroVideoUrl(
  html: string,
  newVideoUrl: string,
): string | null {
  const videoMatch = html.match(
    /<video[^>]*data-webme="hero-image"[^>]*>[\s\S]*?<\/video>/i,
  );

  if (!videoMatch) {
    return null;
  }

  const block = videoMatch[0];
  let updatedBlock = block.replace(
    /(<video[^>]*\ssrc=")[^"]+(")/i,
    `$1${newVideoUrl}$2`,
  );

  if (
    updatedBlock === block &&
    /<video[^>]*data-webme="hero-image"[^>]*>/i.test(block)
  ) {
    updatedBlock = block.replace(
      /(<video[^>]*data-webme="hero-image")/i,
      `$1 src="${newVideoUrl}"`,
    );
  }

  updatedBlock = updatedBlock.replace(
    /(<source[^>]*\ssrc=")[^"]+(")/gi,
    `$1${newVideoUrl}$2`,
  );

  return html.replace(block, updatedBlock);
}

/** Transform generated site HTML into a GSAP ScrollTrigger scroll-scrubbed hero video. */
export function applyScrollHeroVideo(
  html: string,
  videoUrl: string,
  posterUrl: string,
): string {
  const $ = cheerio.load(html);
  let $video: cheerio.Cheerio<AnyNode> = $('video[data-webme="hero-image"]').first();

  if (!$video.length) {
    const $heroSection = $("section").first();
    if (!$heroSection.length) {
      return html;
    }

    $video = $(
      `<video data-webme="hero-image" data-webme-scroll-hero="true" muted playsinline preload="auto"></video>`,
    );
    $heroSection.prepend($video);
  }

  setVideoSrc($video, videoUrl);
  if (posterUrl) {
    $video.attr("poster", posterUrl);
  }

  const $heroSection =
    $video.closest("section").length > 0
      ? $video.closest("section")
      : $("section").first();

  if (!$heroSection.length) {
    return html;
  }

  const $overlay = $heroSection
    .find(".hero-overlay, [class*='overlay']")
    .filter((_index, element) => {
      const className = $(element).attr("class") ?? "";
      return /overlay/i.test(className);
    })
    .first();

  const $content = $heroSection
    .find(".hero-content, [class*='hero-content']")
    .first();

  const overlayHtml = $overlay.length ? $.html($overlay) : "";
  const contentHtml = $content.length ? $.html($content) : "";
  const headlineHtml = $.html($heroSection.find('[data-webme="headline"]').first());
  const taglineHtml = $.html($heroSection.find('[data-webme="tagline"]').first());
  const ctaHtml = $.html(
    $heroSection.find("a.btn, button.btn, .btn").first(),
  );
  const videoHtml = $.html($video);

  $heroSection.attr("id", "webme-scroll-hero");
  $heroSection.attr("data-webme-scroll-hero", "true");

  const pinHtml = `<div class="webme-scroll-hero-pin"></div>`;
  $heroSection.empty();
  const $pin = $(pinHtml);
  $heroSection.append($pin);

  $pin.append(videoHtml);

  if (overlayHtml) {
    $pin.append(overlayHtml);
  } else {
    $pin.append(
      `<div class="hero-overlay" style="position:absolute;inset:0;background:rgba(0,0,0,0.5);z-index:1;pointer-events:none;"></div>`,
    );
  }

  if (contentHtml) {
    const $contentEl = $(contentHtml);
    const existingClass = $contentEl.attr("class") ?? "";
    $contentEl.attr(
      "class",
      `${existingClass} webme-scroll-hero-content`.trim(),
    );
    $contentEl.removeAttr("style");
    $pin.append($contentEl);
  } else {
    const contentParts: string[] = [
      `<div class="hero-content webme-scroll-hero-content">`,
    ];

    if (headlineHtml) {
      contentParts.push(headlineHtml);
    }

    if (taglineHtml) {
      contentParts.push(taglineHtml);
    }

    if (ctaHtml) {
      contentParts.push(ctaHtml);
    }

    contentParts.push("</div>");
    $pin.append(contentParts.join(""));
  }

  return prepareScrollHeroSiteHtml($.html());
}

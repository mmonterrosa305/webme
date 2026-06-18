import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

import { fetchPexelsVideoUrls } from "./fetch-pexels-video";
import { getIndustrySearchQueries } from "./fetch-pixabay-photos";

export const GSAP_CDN =
  "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js";
export const SCROLL_TRIGGER_CDN =
  "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js";

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
  ensureGsapScripts($);
  ensureScrollHeroInitScript($);

  return $.html();
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
      `<video data-webme="hero-image" data-webme-scroll-hero="true" muted playsinline preload="auto" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;"></video>`,
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
  $heroSection.attr(
    "style",
    "position:relative;height:300vh;width:100%;margin:0;padding:0;",
  );

  const pinHtml = `<div class="webme-scroll-hero-pin" style="position:sticky;top:0;height:100vh;width:100%;overflow:hidden;display:flex;align-items:center;justify-content:center;"></div>`;
  $heroSection.empty();
  const $pin = $(pinHtml);
  $heroSection.append($pin);

  $pin.append(videoHtml);

  if (overlayHtml) {
    const $overlayEl = $(overlayHtml);
    $overlayEl.attr(
      "style",
      `${$overlayEl.attr("style") ?? ""};position:absolute;inset:0;background:rgba(0,0,0,0.5);z-index:1;pointer-events:none;`,
    );
    $pin.append($overlayEl);
  } else {
    $pin.append(
      `<div class="hero-overlay" style="position:absolute;inset:0;background:rgba(0,0,0,0.5);z-index:1;pointer-events:none;"></div>`,
    );
  }

  if (contentHtml) {
    const $contentEl = $(contentHtml);
    $contentEl.attr(
      "style",
      `${$contentEl.attr("style") ?? ""};position:relative;z-index:2;width:100%;max-width:960px;margin:0 auto;padding:120px 24px 48px;text-align:center;color:#fff;`,
    );
    $pin.append($contentEl);
  } else {
    const contentParts: string[] = [
      `<div class="hero-content" style="position:relative;z-index:2;width:100%;max-width:960px;margin:0 auto;padding:120px 24px 48px;text-align:center;color:#fff;">`,
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

  ensureGsapScripts($);
  ensureScrollHeroInitScript($);

  return $.html();
}

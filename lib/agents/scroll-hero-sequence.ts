import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

import { matchImageSequenceByFrames } from "@/lib/image-sequences/match-by-frames";

import {
  GSAP_CDN,
  SCROLL_TRIGGER_CDN,
  prepareScrollHeroVideoSiteHtml,
} from "./scroll-hero-video";

export const SCROLL_HERO_SEQUENCE_MARKER = "sequence";
export const SCROLL_HERO_SEQUENCE_ID_ATTR = "data-webme-sequence-id";

const SCROLL_HERO_SEQUENCE_CANVAS_STYLES = `
.webme-scroll-hero-pin canvas[data-webme-scroll-hero="sequence"] {
  position: absolute !important;
  inset: 0 !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  min-width: 100% !important;
  min-height: 100% !important;
  max-width: none !important;
  z-index: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  border: none !important;
  display: block !important;
}`;

const SCROLL_HERO_SEQUENCE_INIT_SCRIPT = `<script id="webme-scroll-hero-sequence-init">
(function () {
  function initScrollHeroSequence() {
    try {
      if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;

      gsap.registerPlugin(ScrollTrigger);

      var section = document.getElementById("webme-scroll-hero");
      var pin = section && section.querySelector(".webme-scroll-hero-pin");
      var canvas = document.querySelector('canvas[data-webme-scroll-hero="sequence"]');
      if (!section || !pin || !canvas) return;

      var ctx = canvas.getContext("2d");
      if (!ctx) return;

      var frameUrls = [];
      var imageCache = Object.create(null);
      var pendingLoads = Object.create(null);
      var dpr = window.devicePixelRatio || 1;
      var posterUrl = canvas.getAttribute("data-poster") || "";

      function resizeCanvas() {
        var rect = pin.getBoundingClientRect();
        var width = Math.max(1, Math.floor(rect.width));
        var height = Math.max(1, Math.floor(rect.height));
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + "px";
        canvas.style.height = height + "px";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      function drawCover(img) {
        var cw = canvas.width / dpr;
        var ch = canvas.height / dpr;
        var iw = img.naturalWidth || img.width;
        var ih = img.naturalHeight || img.height;
        if (!iw || !ih) return;

        var scale = Math.max(cw / iw, ch / ih);
        var dw = iw * scale;
        var dh = ih * scale;
        var dx = (cw - dw) / 2;
        var dy = (ch - dh) / 2;
        ctx.drawImage(img, dx, dy, dw, dh);
      }

      function loadImageAt(index) {
        if (index < 0 || index >= frameUrls.length) {
          return Promise.resolve(null);
        }
        if (imageCache[index]) {
          return Promise.resolve(imageCache[index]);
        }
        if (pendingLoads[index]) {
          return pendingLoads[index];
        }
        pendingLoads[index] = new Promise(function (resolve) {
          var img = new Image();
          img.decoding = "async";
          img.onload = function () {
            imageCache[index] = img;
            delete pendingLoads[index];
            resolve(img);
          };
          img.onerror = function () {
            delete pendingLoads[index];
            resolve(null);
          };
          img.src = frameUrls[index];
        });
        return pendingLoads[index];
      }

      function prefetchWindow(centerIndex) {
        var start = Math.max(0, centerIndex - 2);
        var end = Math.min(frameUrls.length - 1, centerIndex + 4);
        for (var i = start; i <= end; i++) {
          void loadImageAt(i);
        }
      }

      function showPosterFallback() {
        if (!posterUrl) return;

        resizeCanvas();
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        var img = new Image();
        img.onload = function () {
          drawCover(img);
        };
        img.onerror = function () {};
        img.src = posterUrl;
      }

      function drawFrame(progress) {
        if (!frameUrls.length) return;

        var maxIndex = frameUrls.length - 1;
        var exact = progress * maxIndex;
        var idx = Math.floor(exact);
        var next = Math.min(idx + 1, maxIndex);
        var blend = exact - idx;
        prefetchWindow(idx);

        loadImageAt(idx).then(function (imgA) {
          if (!imgA) {
            showPosterFallback();
            return;
          }

          resizeCanvas();
          ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
          drawCover(imgA);

          if (blend > 0.001 && next !== idx) {
            loadImageAt(next).then(function (imgB) {
              if (!imgB) return;
              ctx.globalAlpha = blend;
              drawCover(imgB);
              ctx.globalAlpha = 1;
            });
          }
        });
      }

      function bindScrollHero() {
        var existingPin = ScrollTrigger.getById("webme-scroll-hero-pin");
        if (existingPin) existingPin.kill();
        var existingScrub = ScrollTrigger.getById("webme-scroll-hero-scrub");
        if (existingScrub) existingScrub.kill();

        ScrollTrigger.create({
          id: "webme-scroll-hero-pin",
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          pin: pin,
          pinSpacing: false,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        });

        ScrollTrigger.create({
          id: "webme-scroll-hero-scrub",
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
          onUpdate: function (self) {
            drawFrame(self.progress);
          },
        });

        drawFrame(0);
        ScrollTrigger.refresh();
      }

      function beginSequence(urls) {
        frameUrls = Array.isArray(urls) ? urls : [];
        if (!frameUrls.length) {
          showPosterFallback();
          return;
        }

        loadImageAt(0).then(function (img) {
          if (img) {
            bindScrollHero();
          } else {
            showPosterFallback();
          }
        });
        prefetchWindow(0);
      }

      function loadFramesFromApi(sequenceId) {
        fetch("/api/image-sequences/" + encodeURIComponent(sequenceId))
          .then(function (response) {
            if (!response.ok) {
              throw new Error("Sequence fetch failed");
            }
            return response.json();
          })
          .then(function (data) {
            if (data.frames_urls && data.frames_urls.length) {
              beginSequence(data.frames_urls);
            } else {
              showPosterFallback();
            }
          })
          .catch(function () {
            showPosterFallback();
          });
      }

      var sequenceId = canvas.getAttribute("data-webme-sequence-id");
      if (sequenceId) {
        loadFramesFromApi(sequenceId);
      } else {
        showPosterFallback();
      }

      window.addEventListener("resize", function () {
        var scrub = ScrollTrigger.getById("webme-scroll-hero-scrub");
        if (scrub) {
          drawFrame(scrub.progress);
        }
      });
    } catch (e) {
      console.warn("[webme] scroll hero sequence init failed", e);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initScrollHeroSequence);
  } else {
    initScrollHeroSequence();
  }
})();
</script>`;

export function hasScrollHeroSequence(html: string): boolean {
  return html.includes('data-webme-scroll-hero="sequence"');
}

export function hasInlineSequenceFrames(html: string): boolean {
  return /<script[^>]*\bid=["']webme-scroll-hero-frames["'][^>]*>/i.test(html);
}

/** True when baked-in init script predates lazy frame loading (causes iframe OOM crashes). */
export function hasStaleSequenceInitScript(html: string): boolean {
  if (!hasScrollHeroSequence(html)) {
    return false;
  }

  return (
    html.includes("function preloadFrames") ||
    html.includes('getElementById("webme-scroll-hero-frames")')
  );
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

export function hasScrollHeroAnimation(html: string): boolean {
  return (
    hasScrollHeroSequence(html) ||
    html.includes('data-webme-scroll-hero="true"') ||
    html.includes('id="webme-scroll-hero"')
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

function ensureSequenceStyles($: cheerio.CheerioAPI): void {
  const styleBlock = $("#webme-scroll-hero-styles");
  if (
    styleBlock.length &&
    !styleBlock.text().includes('canvas[data-webme-scroll-hero="sequence"]')
  ) {
    styleBlock.append(SCROLL_HERO_SEQUENCE_CANVAS_STYLES);
  }
}

function ensureSequenceInitScript($: cheerio.CheerioAPI): void {
  $("#webme-scroll-hero-init").remove();
  $("#webme-scroll-hero-sequence-init").remove();
  $("body").append(SCROLL_HERO_SEQUENCE_INIT_SCRIPT);
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

function stripInlineSequenceFrames($: cheerio.CheerioAPI): void {
  $("#webme-scroll-hero-frames").remove();
}

function setCanvasSequenceId(
  $: cheerio.CheerioAPI,
  sequenceId: string,
): void {
  const $canvas = $('canvas[data-webme-scroll-hero="sequence"]').first();
  if (!$canvas.length || !sequenceId.trim()) {
    return;
  }

  $canvas.attr(SCROLL_HERO_SEQUENCE_ID_ATTR, sequenceId.trim());
  stripInlineSequenceFrames($);
}

/** Compact HTML by storing only the sequence id (removes inline frame URL blob). */
export function compactScrollHeroSequenceHtml(
  html: string,
  sequenceId?: string | null,
): string {
  if (!hasScrollHeroSequence(html)) {
    return html;
  }

  const $ = cheerio.load(html);

  if (hasInlineSequenceFrames($.html())) {
    stripInlineSequenceFrames($);
  }

  const resolvedId =
    sequenceId?.trim() ||
    extractScrollHeroSequenceId($.html()) ||
    null;

  if (resolvedId) {
    setCanvasSequenceId($, resolvedId);
  }

  return $.html();
}

/** Idempotent layout + init for scroll-scrubbed image sequence heroes. */
export function prepareScrollHeroSequenceSiteHtml(
  html: string,
  sequenceId?: string | null,
): string {
  if (!hasScrollHeroSequence(html)) {
    return html;
  }

  const compacted = compactScrollHeroSequenceHtml(html, sequenceId);
  const prepared = prepareScrollHeroVideoSiteHtml(compacted);
  const $ = cheerio.load(prepared);

  if (sequenceId?.trim()) {
    setCanvasSequenceId($, sequenceId);
  }

  ensureSequenceStyles($);
  ensureGsapScripts($);
  ensureSequenceInitScript($);
  return $.html();
}

export async function prepareScrollHeroSequenceSiteHtmlAsync(
  html: string,
  options?: {
    sequenceId?: string | null;
    industry?: string | null;
  },
): Promise<string> {
  if (!hasScrollHeroSequence(html)) {
    return html;
  }

  let sequenceId =
    options?.sequenceId?.trim() ||
    extractScrollHeroSequenceId(html) ||
    null;

  if (!sequenceId && hasInlineSequenceFrames(html)) {
    const frames = extractScrollHeroSequenceFrames(html);
    if (frames.length > 0) {
      const match = await matchImageSequenceByFrames(
        frames,
        options?.industry ?? undefined,
      );
      sequenceId = match?.id ?? null;
    }
  }

  return prepareScrollHeroSequenceSiteHtml(html, sequenceId);
}

export function replaceScrollHeroSequenceId(
  html: string,
  sequenceId: string,
): string | null {
  if (!hasScrollHeroSequence(html) || !sequenceId.trim()) {
    return null;
  }

  const $ = cheerio.load(html);
  setCanvasSequenceId($, sequenceId);
  return prepareScrollHeroSequenceSiteHtml($.html(), sequenceId);
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

/** Transform generated site HTML into a GSAP scroll-scrubbed canvas image sequence. */
export function applyScrollHeroSequence(
  html: string,
  sequenceId: string,
  posterUrl: string,
): string {
  if (!sequenceId.trim()) {
    return html;
  }

  const $ = cheerio.load(html);
  let $canvas: cheerio.Cheerio<AnyNode> = $(
    'canvas[data-webme-scroll-hero="sequence"]',
  ).first();

  if (!$canvas.length) {
    $('[data-webme="hero-image"]').remove();
    $('video[data-webme="hero-image"]').remove();

    const $heroSection = findScrollHeroTargetSection($);
    if (!$heroSection.length) {
      return html;
    }

    $canvas = $(
      `<canvas data-webme="hero-image" data-webme-scroll-hero="sequence"></canvas>`,
    );
    $heroSection.prepend($canvas);
  }

  $canvas.attr(SCROLL_HERO_SEQUENCE_ID_ATTR, sequenceId.trim());

  if (posterUrl) {
    $canvas.attr("data-poster", posterUrl);
  }

  const $heroSection =
    $canvas.closest("section").length > 0
      ? $canvas.closest("section")
      : findScrollHeroTargetSection($);

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
  const canvasHtml = $.html($canvas);

  $heroSection.attr("id", "webme-scroll-hero");
  $heroSection.attr("data-webme-scroll-hero", "true");

  const pinHtml = `<div class="webme-scroll-hero-pin"></div>`;
  $heroSection.empty();
  const $pin = $(pinHtml);
  $heroSection.append($pin);
  $pin.append(canvasHtml);

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

  stripInlineSequenceFrames($);
  return prepareScrollHeroSequenceSiteHtml($.html(), sequenceId);
}

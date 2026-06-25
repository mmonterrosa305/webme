import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

import {
  GSAP_CDN,
  SCROLL_TRIGGER_CDN,
  prepareScrollHeroVideoSiteHtml,
} from "./scroll-hero-video";

export const SCROLL_HERO_SEQUENCE_MARKER = "sequence";

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
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;

    gsap.registerPlugin(ScrollTrigger);

    var section = document.getElementById("webme-scroll-hero");
    var pin = section && section.querySelector(".webme-scroll-hero-pin");
    var canvas = document.querySelector('canvas[data-webme-scroll-hero="sequence"]');
    var framesEl = document.getElementById("webme-scroll-hero-frames");
    if (!section || !pin || !canvas || !framesEl) return;

    var frameUrls;
    try {
      frameUrls = JSON.parse(framesEl.textContent || "[]");
    } catch (e) {
      return;
    }

    if (!frameUrls.length) return;

    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var images = new Array(frameUrls.length);
    var loaded = 0;
    var dpr = window.devicePixelRatio || 1;

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

    function drawFrame(progress) {
      if (!images.length || !images[0]) return;

      resizeCanvas();
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

      var maxIndex = images.length - 1;
      var exact = progress * maxIndex;
      var idx = Math.floor(exact);
      var next = Math.min(idx + 1, maxIndex);
      var blend = exact - idx;

      var imgA = images[idx];
      if (!imgA) return;

      drawCover(imgA);

      if (blend > 0.001 && next !== idx) {
        var imgB = images[next];
        if (imgB) {
          ctx.globalAlpha = blend;
          drawCover(imgB);
          ctx.globalAlpha = 1;
        }
      }
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

    frameUrls.forEach(function (url, index) {
      var img = new Image();
      img.decoding = "async";
      img.onload = function () {
        loaded++;
        if (loaded === frameUrls.length) {
          bindScrollHero();
        }
      };
      img.onerror = function () {
        loaded++;
        if (loaded === frameUrls.length) {
          bindScrollHero();
        }
      };
      img.src = url;
      images[index] = img;
    });

    window.addEventListener("resize", function () {
      var scrub = ScrollTrigger.getById("webme-scroll-hero-scrub");
      if (scrub) {
        drawFrame(scrub.progress);
      }
    });
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

export function hasScrollHeroAnimation(html: string): boolean {
  return (
    hasScrollHeroSequence(html) ||
    html.includes('data-webme-scroll-hero="true"') ||
    html.includes('id="webme-scroll-hero"')
  );
}

function escapeJsonForScript(json: string): string {
  return json.replace(/</g, "\\u003c");
}

function ensureSequenceStyles($: cheerio.CheerioAPI): void {
  const styleBlock = $("#webme-scroll-hero-styles");
  if (
    styleBlock.length &&
    !styleBlock.text().includes("canvas[data-webme-scroll-hero=\"sequence\"]")
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

/** Idempotent layout + init for scroll-scrubbed image sequence heroes. */
export function prepareScrollHeroSequenceSiteHtml(html: string): string {
  if (!hasScrollHeroSequence(html)) {
    return html;
  }

  const prepared = prepareScrollHeroVideoSiteHtml(html);
  const $ = cheerio.load(prepared);
  ensureSequenceStyles($);
  ensureGsapScripts($);
  ensureSequenceInitScript($);
  return $.html();
}

function setSequenceFramesScript(
  $: cheerio.CheerioAPI,
  framesUrls: string[],
): void {
  const json = escapeJsonForScript(JSON.stringify(framesUrls));
  $("#webme-scroll-hero-frames").remove();
  $("body").append(
    `<script type="application/json" id="webme-scroll-hero-frames">${json}</script>`,
  );
}

export function replaceScrollHeroSequenceFrames(
  html: string,
  framesUrls: string[],
): string | null {
  if (!hasScrollHeroSequence(html) || framesUrls.length === 0) {
    return null;
  }

  const $ = cheerio.load(html);
  setSequenceFramesScript($, framesUrls);
  return prepareScrollHeroSequenceSiteHtml($.html());
}

/** Match sequence preset id by comparing first frame URL. */
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
      preset.frames_urls.length === framesUrls.length &&
        preset.frames_urls.every((url, index) => url === framesUrls[index]),
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
  framesUrls: string[],
  posterUrl: string,
): string {
  if (framesUrls.length === 0) {
    return html;
  }

  const $ = cheerio.load(html);
  let $canvas: cheerio.Cheerio<AnyNode> = $(
    'canvas[data-webme-scroll-hero="sequence"]',
  ).first();

  if (!$canvas.length) {
    $('[data-webme="hero-image"]').remove();
    $('video[data-webme="hero-image"]').remove();

    const $heroSection = $("section").first();
    if (!$heroSection.length) {
      return html;
    }

    $canvas = $(
      `<canvas data-webme="hero-image" data-webme-scroll-hero="sequence"></canvas>`,
    );
    $heroSection.prepend($canvas);
  }

  if (posterUrl) {
    $canvas.attr("data-poster", posterUrl);
  }

  const $heroSection =
    $canvas.closest("section").length > 0
      ? $canvas.closest("section")
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

  setSequenceFramesScript($, framesUrls);
  return prepareScrollHeroSequenceSiteHtml($.html());
}

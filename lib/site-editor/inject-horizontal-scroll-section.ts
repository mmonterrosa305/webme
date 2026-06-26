import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

import {
  getInlineGsapCoreSource,
  getInlineScrollTriggerSource,
  INLINE_GSAP_CORE_SCRIPT_ID,
  INLINE_SCROLL_TRIGGER_SCRIPT_ID,
} from "@/lib/gsap/inline-gsap-scripts";

const HORIZONTAL_SCROLL_SECTION_ID = "webme-horizontal-scroll";
const HORIZONTAL_SCROLL_STYLE_ID = "webme-horizontal-scroll-styles";
const HORIZONTAL_SCROLL_INIT_ID = "webme-horizontal-scroll-init";
const HORIZONTAL_SCROLL_VERSION = "3";

type ServiceSlide = {
  title: string;
  description: string;
  imageUrl: string;
};

const HORIZONTAL_SCROLL_STYLES = `<style id="${HORIZONTAL_SCROLL_STYLE_ID}">
#${HORIZONTAL_SCROLL_SECTION_ID} {
  position: relative;
  height: 100vh;
  overflow: hidden;
  background: #070b12;
  color: #fff;
}
#${HORIZONTAL_SCROLL_SECTION_ID} .webme-hscroll-pin {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
#${HORIZONTAL_SCROLL_SECTION_ID} .webme-hscroll-header {
  padding: clamp(1.5rem, 3vw, 2.5rem) clamp(1.5rem, 4vw, 3rem) clamp(0.75rem, 2vw, 1.25rem);
}
#${HORIZONTAL_SCROLL_SECTION_ID} .webme-hscroll-eyebrow {
  display: block;
  font-size: 0.72rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  opacity: 0.55;
  margin-bottom: 0.65rem;
}
#${HORIZONTAL_SCROLL_SECTION_ID} .webme-hscroll-header h2 {
  margin: 0;
  font-size: clamp(1.75rem, 3.5vw, 2.75rem);
  line-height: 1.1;
  font-weight: 700;
}
#${HORIZONTAL_SCROLL_SECTION_ID} .webme-hscroll-viewport {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}
#${HORIZONTAL_SCROLL_SECTION_ID} .webme-hscroll-track {
  display: flex;
  gap: clamp(16px, 2vw, 28px);
  height: 100%;
  padding: 0 clamp(1.5rem, 4vw, 3rem) clamp(1rem, 2vw, 1.5rem);
  will-change: transform;
}
#${HORIZONTAL_SCROLL_SECTION_ID} .webme-hscroll-card {
  flex: 0 0 clamp(260px, 28vw, 400px);
  height: 100%;
  min-height: 360px;
  border-radius: 18px;
  overflow: hidden;
  position: relative;
  box-shadow: 0 28px 70px rgba(0, 0, 0, 0.45);
  filter: none;
  backdrop-filter: none;
  background: #0a0f18;
}
#${HORIZONTAL_SCROLL_SECTION_ID} .webme-hscroll-card-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center center;
  filter: none;
  transform: none;
  pointer-events: none;
  user-select: none;
}
#${HORIZONTAL_SCROLL_SECTION_ID} .webme-hscroll-card-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.92) 0%,
    rgba(0, 0, 0, 0.55) 22%,
    rgba(0, 0, 0, 0.08) 48%,
    transparent 62%
  );
  filter: none;
  backdrop-filter: none;
  pointer-events: none;
}
#${HORIZONTAL_SCROLL_SECTION_ID} .webme-hscroll-card-content {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: clamp(1.25rem, 2.5vw, 2rem);
  z-index: 2;
}
#${HORIZONTAL_SCROLL_SECTION_ID} .webme-hscroll-card-content h3 {
  margin: 0 0 0.65rem;
  font-size: clamp(1.35rem, 2.2vw, 1.85rem);
  font-weight: 700;
  line-height: 1.15;
}
#${HORIZONTAL_SCROLL_SECTION_ID} .webme-hscroll-card-content p {
  margin: 0;
  font-size: clamp(0.9rem, 1.2vw, 1rem);
  line-height: 1.55;
  opacity: 0.9;
  max-width: 32ch;
}
#${HORIZONTAL_SCROLL_SECTION_ID} .webme-hscroll-progress {
  height: 2px;
  margin: 0 clamp(1.5rem, 4vw, 3rem) clamp(1rem, 2vw, 1.75rem);
  background: rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  overflow: hidden;
}
#${HORIZONTAL_SCROLL_SECTION_ID} .webme-hscroll-progress-fill {
  display: block;
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.45));
  border-radius: inherit;
  transform-origin: left center;
}
</style>`;

const HORIZONTAL_SCROLL_INIT_SCRIPT = `<script id="${HORIZONTAL_SCROLL_INIT_ID}">
(function () {
  function configureParentScrollProxy() {
    try {
      if (window.parent === window || !window.frameElement) {
        return false;
      }

      var parentWin = window.parent;

      ScrollTrigger.scrollerProxy(parentWin, {
        scrollTop: function (value) {
          if (arguments.length) {
            parentWin.scrollTo(parentWin.scrollX, value);
          }
          return parentWin.scrollY || parentWin.pageYOffset;
        },
        getBoundingClientRect: function () {
          return {
            top: 0,
            left: 0,
            width: parentWin.innerWidth,
            height: parentWin.innerHeight,
          };
        },
      });

      parentWin.addEventListener("scroll", function () {
        ScrollTrigger.update();
      });
      window.addEventListener("resize", function () {
        ScrollTrigger.refresh();
      });

      ScrollTrigger.defaults({ scroller: parentWin });
      return true;
    } catch (error) {
      console.warn("[webme-horizontal-scroll] parent scroll proxy unavailable", error);
      return false;
    }
  }

  function getIframeDocTopInParent() {
    var frame = window.frameElement;
    if (!frame) {
      return 0;
    }

    var parentWin = window.parent;
    return frame.getBoundingClientRect().top + (parentWin.scrollY || parentWin.pageYOffset || 0);
  }

  function getHorizontalScrollDistance(section, track, viewport) {
    return Math.max(0, track.scrollWidth - viewport.clientWidth);
  }

  function initHorizontalScroll() {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      return;
    }

    var section = document.getElementById("${HORIZONTAL_SCROLL_SECTION_ID}");
    if (!section || section.getAttribute("data-webme-hscroll-init") === "true") {
      return;
    }

    var track = section.querySelector(".webme-hscroll-track");
    var viewport = section.querySelector(".webme-hscroll-viewport");
    var fill = section.querySelector(".webme-hscroll-progress-fill");
    if (!track || !viewport) {
      return;
    }

    var distance = getHorizontalScrollDistance(section, track, viewport);
    if (distance <= 0) {
      if (fill) {
        fill.style.width = "100%";
      }
      return;
    }

    section.setAttribute("data-webme-hscroll-init", "true");
    gsap.registerPlugin(ScrollTrigger);
    configureParentScrollProxy();

    gsap.to(track, {
      x: function () {
        return -getHorizontalScrollDistance(section, track, viewport);
      },
      ease: "none",
      modifiers: {
        x: function (x) {
          return Math.round(parseFloat(x)) + "px";
        },
      },
      scrollTrigger: {
        trigger: section,
        start: function () {
          if (!window.frameElement) {
            return "top top";
          }

          return getIframeDocTopInParent() + section.offsetTop;
        },
        end: function () {
          var distance = getHorizontalScrollDistance(section, track, viewport);
          if (!window.frameElement) {
            return "+=" + distance;
          }

          return getIframeDocTopInParent() + section.offsetTop + distance;
        },
        pin: section.querySelector(".webme-hscroll-pin"),
        scrub: 0.85,
        invalidateOnRefresh: true,
        anticipatePin: 1,
        onUpdate: function (self) {
          if (fill) {
            fill.style.width = self.progress * 100 + "%";
          }
        },
      },
    });

    ScrollTrigger.refresh();
    console.log("[webme-horizontal-scroll] GSAP horizontal pin initialized", {
      cards: track.querySelectorAll(".webme-hscroll-card").length,
      distance: distance,
      inIframe: window.parent !== window && Boolean(window.frameElement),
    });
  }

  function boot() {
    initHorizontalScroll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
</script>`;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const BACKGROUND_URL_PATTERN =
  /url\(\s*['"]?(https?:\/\/[^'")\s]+|data:[^'")\s]+)['"]?\s*\)/gi;

function extractBackgroundUrls(value: string): string[] {
  const matches: string[] = [];
  let match: RegExpExecArray | null;

  BACKGROUND_URL_PATTERN.lastIndex = 0;

  while ((match = BACKGROUND_URL_PATTERN.exec(value)) !== null) {
    matches.push(match[1]);
  }

  return matches;
}

function extractImageUrlFromElement(
  $: cheerio.CheerioAPI,
  $element: cheerio.Cheerio<AnyNode>,
): string {
  const src = $element.attr("src")?.trim();
  if (src) {
    return src;
  }

  const style = $element.attr("style") ?? "";
  const fromStyle = extractBackgroundUrls(style)[0];
  if (fromStyle) {
    return fromStyle;
  }

  const childImgSrc = $element.find("img").first().attr("src")?.trim();
  if (childImgSrc) {
    return childImgSrc;
  }

  const childSourceSrc = $element.find("source").first().attr("src")?.trim();
  if (childSourceSrc) {
    return childSourceSrc;
  }

  return "";
}

function findServiceCardWrapper(
  $: cheerio.CheerioAPI,
  $element: cheerio.Cheerio<AnyNode>,
): cheerio.Cheerio<AnyNode> | null {
  let $current = $element;

  for (let depth = 0; depth < 8; depth += 1) {
    if (!$current.length) {
      break;
    }

    if (
      $current.attr("data-webme") === "service-card" ||
      $current.hasClass("service-card")
    ) {
      return $current;
    }

    const tagName = ($current.prop("tagName") ?? "").toLowerCase();
    if (tagName === "section" || tagName === "body" || tagName === "html") {
      break;
    }

    $current = $current.parent();
  }

  return null;
}

function extractServices($: cheerio.CheerioAPI): ServiceSlide[] {
  const services: ServiceSlide[] = [];
  const $orderedCards = $(
    '#services [data-webme="service-card"], #services .service-card, section#services [data-webme="service-card"], section#services .service-card, [data-webme="service-card"], .service-card',
  ).filter((_index, element) => {
    return !$(element).closest(`#${HORIZONTAL_SCROLL_SECTION_ID}`).length;
  });

  for (let index = 1; index <= 4; index += 1) {
    const $imageSlot = $(`[data-webme="service-image-${index}"]`).first();
    let imageUrl = "";
    let $card: cheerio.Cheerio<AnyNode> | null = null;

    if ($imageSlot.length) {
      imageUrl = extractImageUrlFromElement($, $imageSlot);
      $card = findServiceCardWrapper($, $imageSlot);
    }

    if (!$card?.length) {
      const $fallbackCard = $orderedCards.eq(index - 1);
      if ($fallbackCard.length) {
        $card = $fallbackCard;
      }
    }

    if (!$card?.length) {
      continue;
    }

    const title = $card.find("h3").first().text().trim();
    if (!title) {
      continue;
    }

    if (!imageUrl) {
      imageUrl = extractImageUrlFromElement($, $card);
    }

    if (!imageUrl) {
      const $nestedImageSlot = $card.find(`[data-webme="service-image-${index}"]`).first();
      if ($nestedImageSlot.length) {
        imageUrl = extractImageUrlFromElement($, $nestedImageSlot);
      }
    }

    const description = $card.find("p").first().text().trim();
    services.push({ title, description, imageUrl });
  }

  return services;
}

function extractServicesHeading($: cheerio.CheerioAPI): string {
  const fromServicesSection = $("#services h2, section#services h2, .services h2")
    .first()
    .text()
    .trim();

  if (fromServicesSection) {
    return fromServicesSection;
  }

  return "Our Services";
}

function findTrustBar($: cheerio.CheerioAPI): cheerio.Cheerio<AnyNode> | null {
  const selectors = [
    "div.trust-bar",
    "section.trust-bar",
    "[class*='trust-bar']",
  ];

  for (const selector of selectors) {
    const $element = $(selector).first();
    if ($element.length) {
      return $element;
    }
  }

  return null;
}

function buildHorizontalScrollSection(
  services: ServiceSlide[],
  heading: string,
): string {
  const cardsHtml = services
    .map((service) => {
      const imageHtml = service.imageUrl
        ? `<img class="webme-hscroll-card-image" src="${escapeHtml(service.imageUrl)}" alt="${escapeHtml(service.title)}" decoding="async" />`
        : "";

      return `<article class="webme-hscroll-card">
${imageHtml}
<div class="webme-hscroll-card-overlay" aria-hidden="true"></div>
<div class="webme-hscroll-card-content">
<h3>${escapeHtml(service.title)}</h3>
<p>${escapeHtml(service.description)}</p>
</div>
</article>`;
    })
    .join("");

  return `<section id="${HORIZONTAL_SCROLL_SECTION_ID}" class="webme-hscroll" data-webme="horizontal-scroll" data-webme-hscroll-version="${HORIZONTAL_SCROLL_VERSION}">
<div class="webme-hscroll-pin">
<div class="webme-hscroll-header">
<span class="webme-hscroll-eyebrow">Featured</span>
<h2>${escapeHtml(heading)}</h2>
</div>
<div class="webme-hscroll-viewport">
<div class="webme-hscroll-track">
${cardsHtml}
</div>
</div>
<div class="webme-hscroll-progress" aria-hidden="true">
<span class="webme-hscroll-progress-fill"></span>
</div>
</div>
</section>`;
}

function ensureGsapScripts($: cheerio.CheerioAPI): void {
  $(`#${INLINE_GSAP_CORE_SCRIPT_ID}`).remove();
  $(`#${INLINE_SCROLL_TRIGGER_SCRIPT_ID}`).remove();

  const body = $("body");
  if (body.length === 0) {
    return;
  }

  body.append(
    `<script id="${INLINE_GSAP_CORE_SCRIPT_ID}">${getInlineGsapCoreSource()}</script>`,
  );
  body.append(
    `<script id="${INLINE_SCROLL_TRIGGER_SCRIPT_ID}">${getInlineScrollTriggerSource()}</script>`,
  );
}

function ensureHorizontalScrollAssets($: cheerio.CheerioAPI): void {
  $(`#${HORIZONTAL_SCROLL_STYLE_ID}`).remove();
  $(`#${HORIZONTAL_SCROLL_INIT_ID}`).remove();

  const head = $("head");
  if (head.length) {
    head.append(HORIZONTAL_SCROLL_STYLES);
  }

  ensureGsapScripts($);
  $("body").append(HORIZONTAL_SCROLL_INIT_SCRIPT);
}

function insertAfterTrustBar($: cheerio.CheerioAPI, sectionHtml: string): boolean {
  const $trustBar = findTrustBar($);
  if (!$trustBar?.length) {
    return false;
  }

  $trustBar.after(sectionHtml);
  return true;
}

export function hasHorizontalScrollSection(html: string): boolean {
  return html.includes(`id="${HORIZONTAL_SCROLL_SECTION_ID}"`);
}

function hasCompleteHorizontalScrollSection(html: string): boolean {
  return (
    hasHorizontalScrollSection(html) &&
    html.includes(HORIZONTAL_SCROLL_INIT_ID) &&
    html.includes(INLINE_GSAP_CORE_SCRIPT_ID) &&
    html.includes("webme-hscroll-card-image") &&
    html.includes(`data-webme-hscroll-version="${HORIZONTAL_SCROLL_VERSION}"`)
  );
}

/** Inject a GSAP horizontal scroll services section after the trust bar. Idempotent. */
export function injectHorizontalScrollSection(html: string): string {
  if (!html.trim()) {
    return html;
  }

  if (hasCompleteHorizontalScrollSection(html)) {
    return html;
  }

  const $ = cheerio.load(html);
  const services = extractServices($);

  if (services.length === 0) {
    console.log("[injectHorizontalScrollSection] skipped — no service cards found");
    return html;
  }

  $(`#${HORIZONTAL_SCROLL_SECTION_ID}`).remove();

  const heading = extractServicesHeading($);
  const sectionHtml = buildHorizontalScrollSection(services, heading);
  const inserted = insertAfterTrustBar($, sectionHtml);

  if (!inserted) {
    const $body = $("body");
    const $firstSection = $("section").first();
    if ($firstSection.length) {
      $firstSection.before(sectionHtml);
    } else if ($body.length) {
      $body.prepend(sectionHtml);
    } else {
      console.log("[injectHorizontalScrollSection] skipped — no insertion point");
      return html;
    }
  }

  ensureHorizontalScrollAssets($);

  const result = $.html();
  console.log("[injectHorizontalScrollSection] injected horizontal scroll section:", {
    services: services.length,
    heading,
    imageUrls: services.map((service) => service.imageUrl.slice(0, 80)),
    hasGsap: result.includes(INLINE_GSAP_CORE_SCRIPT_ID),
    hasInit: result.includes(HORIZONTAL_SCROLL_INIT_ID),
  });

  return result;
}

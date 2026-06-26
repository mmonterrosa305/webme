import * as cheerio from "cheerio";

import { tagServiceCards } from "@/lib/agents/service-card-hover";
import {
  GSAP_CDN,
  SCROLL_TRIGGER_CDN,
} from "@/lib/agents/scroll-hero-video";

const ANIMATIONS_STYLE_ID = "webme-site-animations-styles";
const ANIMATIONS_INIT_ID = "webme-site-animations-init";

const SITE_ANIMATIONS_STYLES = `<style id="${ANIMATIONS_STYLE_ID}">
header.webme-site-nav,
nav.webme-site-nav {
  transition:
    background-color 0.4s ease,
    backdrop-filter 0.4s ease,
    box-shadow 0.4s ease;
}
header.webme-site-nav.webme-nav-at-top,
nav.webme-site-nav.webme-nav-at-top {
  background-color: transparent !important;
  box-shadow: none !important;
}
header.webme-site-nav.webme-nav-scrolled,
nav.webme-site-nav.webme-nav-scrolled {
  background-color: rgba(0, 0, 0, 0.88) !important;
  backdrop-filter: blur(14px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
}
.webme-heading-word {
  display: inline-block;
  overflow: hidden;
  vertical-align: top;
}
.webme-heading-word-inner {
  display: inline-block;
  will-change: transform, opacity;
}
.webme-about-parallax-wrap {
  overflow: hidden;
  position: relative;
}
.webme-about-parallax-target {
  will-change: transform;
  transform: translateZ(0);
}
</style>`;

const SITE_ANIMATIONS_INIT_SCRIPT = `<script id="${ANIMATIONS_INIT_ID}">
(function () {
  function isScrollHeroSection(section) {
    if (!section) return false;
    if (section.id === "webme-scroll-hero") return true;
    if (section.getAttribute("data-webme-scroll-hero") === "true") return true;
    return Boolean(
      section.querySelector(
        'video[data-webme-scroll-hero="true"], canvas[data-webme-scroll-hero="sequence"]',
      ),
    );
  }

  function splitHeroHeading(heading) {
    if (!heading || heading.getAttribute("data-webme-heading-split") === "true") {
      return;
    }

    var text = heading.textContent.trim();
    if (!text) return;

    heading.setAttribute("data-webme-heading-split", "true");
    heading.innerHTML = text
      .split(/\\s+/)
      .map(function (word) {
        return (
          '<span class="webme-heading-word">' +
          '<span class="webme-heading-word-inner">' +
          word +
          "</span></span>"
        );
      })
      .join(" ");
  }

  function initNavigationFade() {
    var nav =
      document.querySelector("header.webme-site-nav") ||
      document.querySelector("nav.webme-site-nav") ||
      document.querySelector("header") ||
      document.querySelector("nav");

    if (!nav) return;

    nav.classList.add("webme-site-nav", "webme-nav-at-top");

    ScrollTrigger.create({
      id: "webme-nav-scroll",
      start: "top -80",
      end: 99999,
      onEnter: function () {
        nav.classList.remove("webme-nav-at-top");
        nav.classList.add("webme-nav-scrolled");
      },
      onLeaveBack: function () {
        nav.classList.add("webme-nav-at-top");
        nav.classList.remove("webme-nav-scrolled");
      },
    });
  }

  function initHeroHeading() {
    var heading = document.querySelector('[data-webme="headline"]');
    if (!heading) return;

    splitHeroHeading(heading);

    var words = heading.querySelectorAll(".webme-heading-word-inner");
    if (!words.length) return;

    gsap.set(words, { yPercent: 110, opacity: 0 });
    gsap.to(words, {
      yPercent: 0,
      opacity: 1,
      duration: 0.85,
      stagger: 0.06,
      ease: "power3.out",
      delay: 0.15,
    });
  }

  function initSectionReveals(serviceSection) {
    var sections = gsap.utils.toArray("section");

    sections.forEach(function (section) {
      if (isScrollHeroSection(section)) return;
      if (section === serviceSection) return;

      gsap.from(section, {
        opacity: 0,
        y: 60,
        duration: 0.9,
        ease: "power2.out",
        scrollTrigger: {
          trigger: section,
          start: "top 80%",
          toggleActions: "play none none none",
        },
      });
    });
  }

  function initServiceCards() {
    var cards = gsap.utils.toArray('[data-webme="service-card"]');
    if (!cards.length) return null;

    var section = cards[0].closest("section") || cards[0].parentElement;
    if (!section) return null;

    gsap.from(section, {
      opacity: 0,
      y: 40,
      duration: 0.7,
      ease: "power2.out",
      scrollTrigger: {
        trigger: section,
        start: "top 80%",
        toggleActions: "play none none none",
      },
    });

    gsap.from(cards, {
      opacity: 0,
      y: 40,
      scale: 0.95,
      duration: 0.65,
      stagger: 0.15,
      ease: "power2.out",
      scrollTrigger: {
        trigger: section,
        start: "top 80%",
        toggleActions: "play none none none",
      },
    });

    return section;
  }

  function parseCounterValue(text) {
    var match = text.match(/(-?\\d+(?:\\.\\d+)?)/);
    if (!match) return null;

    var end = parseFloat(match[1]);
    if (Number.isNaN(end)) return null;

    return {
      end: end,
      prefix: text.slice(0, match.index),
      suffix: text.slice(match.index + match[1].length),
      decimals: match[1].includes(".") ? match[1].split(".")[1].length : 0,
    };
  }

  function initCounters() {
    var counters = document.querySelectorAll('[data-webme-counter="true"]');
    counters.forEach(function (el) {
      if (el.getAttribute("data-webme-counter-init") === "true") return;
      el.setAttribute("data-webme-counter-init", "true");

      var parsed = parseCounterValue(el.textContent.trim());
      if (!parsed) return;

      var state = { value: 0 };
      gsap.to(state, {
        value: parsed.end,
        duration: 2,
        ease: "power1.out",
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
          toggleActions: "play none none none",
        },
        onUpdate: function () {
          var display =
            parsed.decimals > 0
              ? state.value.toFixed(parsed.decimals)
              : String(Math.round(state.value));
          el.textContent = parsed.prefix + display + parsed.suffix;
        },
      });
    });
  }

  function initAboutParallax() {
    var target = document.querySelector('[data-webme="about-image"]');
    if (!target) return;

    var section = target.closest("section") || target.parentElement;
    if (!section) return;

    gsap.to(target, {
      yPercent: 30,
      ease: "none",
      scrollTrigger: {
        trigger: section,
        start: "top bottom",
        end: "bottom top",
        scrub: true,
      },
    });
  }

  function initWebmeSiteAnimations() {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      return;
    }

    if (document.documentElement.getAttribute("data-webme-animations-init") === "true") {
      return;
    }

    document.documentElement.setAttribute("data-webme-animations-init", "true");
    gsap.registerPlugin(ScrollTrigger);

    console.log("[webme-site-animations] initializing scroll animations");

    initNavigationFade();
    initHeroHeading();
    var serviceSection = initServiceCards();
    initSectionReveals(serviceSection);
    initAboutParallax();
    initCounters();

    ScrollTrigger.refresh();
  }

  function waitForGsap(callback, attempts) {
    if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
      callback();
      return;
    }

    if (attempts <= 0) return;
    setTimeout(function () {
      waitForGsap(callback, attempts - 1);
    }, 50);
  }

  function boot() {
    waitForGsap(initWebmeSiteAnimations, 120);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
</script>`;

const COUNTER_TEXT_PATTERN = /^\D*\d[\d.,+%/]*\D*$/;

function isLikelyCounterText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 24 || !/\d/.test(trimmed)) {
    return false;
  }

  return COUNTER_TEXT_PATTERN.test(trimmed);
}

function tagCounterElements($: cheerio.CheerioAPI): void {
  const sections = $("section").toArray();

  for (const section of sections) {
    const $section = $(section);

    if (
      $section.attr("id") === "webme-scroll-hero" ||
      $section.attr("data-webme-scroll-hero") === "true"
    ) {
      continue;
    }

    $section.find("h2, h3, h4, p, span, strong, div").each((_index, element) => {
      const $el = $(element);

      if ($el.attr("data-webme-counter") === "true") {
        return;
      }

      if ($el.find('[data-webme-counter="true"]').length > 0) {
        return;
      }

      const directText = $el
        .contents()
        .filter((_i, node) => node.type === "text")
        .text()
        .trim();

      const text = directText || $el.text().trim();
      if (!isLikelyCounterText(text)) {
        return;
      }

      if ($el.children().length > 0 && !directText) {
        return;
      }

      $el.attr("data-webme-counter", "true");
    });
  }
}

function prepareAboutParallax($: cheerio.CheerioAPI): void {
  const $aboutImage = $('[data-webme="about-image"]').first();
  if (!$aboutImage.length) {
    return;
  }

  $aboutImage.addClass("webme-about-parallax-target");

  const $parent = $aboutImage.parent();
  if ($parent.length && !$parent.hasClass("webme-about-parallax-wrap")) {
    $parent.addClass("webme-about-parallax-wrap");
  }
}

function prepareNavigation($: cheerio.CheerioAPI): void {
  const $header = $("header").first();
  const $nav = $("nav").first();

  if ($header.length) {
    $header.addClass("webme-site-nav");
    return;
  }

  if ($nav.length) {
    $nav.addClass("webme-site-nav");
  }
}

function ensureGsapScripts($: cheerio.CheerioAPI): void {
  $(`script[src="${GSAP_CDN}"]`).remove();
  $(`script[src="${SCROLL_TRIGGER_CDN}"]`).remove();

  const body = $("body");
  if (body.length === 0) {
    return;
  }

  body.append(`<script src="${GSAP_CDN}"></script>`);
  body.append(`<script src="${SCROLL_TRIGGER_CDN}"></script>`);
}

function ensureAnimationStyles($: cheerio.CheerioAPI): void {
  $(`#${ANIMATIONS_STYLE_ID}`).remove();
  const head = $("head");
  if (head.length === 0) {
    return;
  }

  head.append(SITE_ANIMATIONS_STYLES);
}

function ensureAnimationInitScript($: cheerio.CheerioAPI): void {
  $(`#${ANIMATIONS_INIT_ID}`).remove();
  $("body").append(SITE_ANIMATIONS_INIT_SCRIPT);
}

export function hasSiteAnimations(html: string): boolean {
  return html.includes(`id="${ANIMATIONS_INIT_ID}"`);
}

function hasCompleteSiteAnimations(html: string): boolean {
  return (
    hasSiteAnimations(html) &&
    html.includes("gsap.min.js") &&
    html.includes("ScrollTrigger")
  );
}

/** Inject premium GSAP scroll animations into generated site HTML. Idempotent. */
export function injectSiteAnimations(html: string): string {
  if (!html.trim()) {
    return html;
  }

  if (hasCompleteSiteAnimations(html)) {
    return html;
  }

  const $ = cheerio.load(html);

  prepareNavigation($);
  prepareAboutParallax($);
  tagServiceCards($);
  tagCounterElements($);
  ensureAnimationStyles($);
  ensureGsapScripts($);
  ensureAnimationInitScript($);

  const result = $.html();
  console.log("[injectSiteAnimations] injected GSAP scroll animations:", {
    hadInitScript: hasSiteAnimations(html),
    hadGsap: html.includes("gsap.min.js"),
    resultHasGsap: result.includes("gsap.min.js"),
    resultHasScrollTrigger: result.includes("ScrollTrigger"),
    resultHasInitScript: result.includes(ANIMATIONS_INIT_ID),
    serviceCards: $('[data-webme="service-card"]').length,
    counters: $('[data-webme-counter="true"]').length,
  });

  return result;
}

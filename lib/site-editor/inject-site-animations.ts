import * as cheerio from "cheerio";

import { tagServiceCards } from "@/lib/agents/service-card-hover";

const ANIMATIONS_STYLE_ID = "webme-site-animations-styles";
const ANIMATIONS_INIT_ID = "webme-site-animations-init";

const REVEAL_EASING = "cubic-bezier(0.16, 1, 0.3, 1)";

const SITE_ANIMATIONS_STYLES = `<style id="${ANIMATIONS_STYLE_ID}">
.webme-reveal-root {
  perspective: 1000px;
}

.webme-section-animate {
  opacity: 0;
  transform: translateY(120px) scale(0.92) rotateX(8deg);
  transform-origin: center top;
  transform-style: preserve-3d;
  transition:
    opacity 1s ${REVEAL_EASING},
    transform 1s ${REVEAL_EASING};
  will-change: opacity, transform;
}
.webme-section-animate.visible {
  opacity: 1;
  transform: translateY(0) scale(1) rotateX(0deg);
}

.webme-service-card {
  opacity: 0;
  transform: translateY(100px) scale(0.88);
  box-shadow: 0 8px 0 rgba(15, 23, 42, 0);
  transition:
    opacity 0.95s ${REVEAL_EASING},
    transform 0.95s ${REVEAL_EASING},
    box-shadow 0.95s ${REVEAL_EASING};
  transition-delay: var(--webme-stagger, 0ms);
  will-change: opacity, transform, box-shadow;
}
.webme-service-card.visible {
  opacity: 1;
  transform: translateY(0) scale(1);
  box-shadow: 0 28px 56px rgba(15, 23, 42, 0.22);
}

.webme-heading-line {
  display: block;
  width: 0;
  height: 2px;
  background: linear-gradient(90deg, currentColor 0%, rgba(15, 23, 42, 0.15) 100%);
  opacity: 0.7;
  margin: 0 0 18px 0;
  transition: width 0.9s ${REVEAL_EASING};
}
.webme-heading-line.is-centered {
  margin-left: auto;
  margin-right: auto;
}
.webme-heading-line.visible {
  width: 60px;
}

.webme-heading-split {
  overflow: visible;
}
.webme-heading-word {
  display: inline-block;
  overflow: hidden;
  vertical-align: top;
  margin-right: 0.28em;
}
.webme-heading-word:last-child {
  margin-right: 0;
}
.webme-heading-word-inner {
  display: inline-block;
  transform: translateY(115%);
  opacity: 0;
  transition:
    transform 0.75s ${REVEAL_EASING},
    opacity 0.75s ${REVEAL_EASING};
  transition-delay: var(--webme-word-delay, 0ms);
  will-change: transform, opacity;
}
.webme-heading-split.visible .webme-heading-word-inner {
  transform: translateY(0);
  opacity: 1;
}

.webme-stat-animate {
  display: inline-block;
  transform: scale(0);
  opacity: 0;
  transform-origin: center bottom;
}
.webme-stat-animate.visible {
  animation: webme-stat-slam 0.72s ${REVEAL_EASING} forwards;
  animation-delay: var(--webme-stat-delay, 0ms);
}
@keyframes webme-stat-slam {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  55% {
    transform: scale(1.2);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.webme-image-animate {
  opacity: 0;
  transform: translateX(60px);
  transition:
    opacity 1s ${REVEAL_EASING},
    transform 1s ${REVEAL_EASING};
  will-change: opacity, transform;
}
.webme-image-animate.visible {
  opacity: 1;
  transform: translateX(0);
}
</style>`;

const SITE_ANIMATIONS_INIT_SCRIPT = `<script id="${ANIMATIONS_INIT_ID}">
(function () {
  if (document.documentElement.getAttribute("data-webme-animations-init") === "true") {
    return;
  }
  document.documentElement.setAttribute("data-webme-animations-init", "true");
  document.body.classList.add("webme-reveal-root");

  function isCenteredHeading(heading) {
    if (heading.classList.contains("section-title")) {
      return true;
    }
    var parent = heading.parentElement;
    if (!parent) {
      return false;
    }
    var align = window.getComputedStyle(parent).textAlign;
    return align === "center";
  }

  function prepareHeading(heading) {
    if (heading.getAttribute("data-webme-heading-prepared") === "true") {
      return heading.previousElementSibling &&
        heading.previousElementSibling.classList.contains("webme-heading-line")
        ? heading.previousElementSibling
        : null;
    }

    var text = heading.textContent.trim();
    if (!text) {
      return null;
    }

    heading.setAttribute("data-webme-heading-prepared", "true");

    var line = document.createElement("span");
    line.className = "webme-heading-line";
    if (isCenteredHeading(heading)) {
      line.classList.add("is-centered");
    }
    heading.parentNode.insertBefore(line, heading);

    heading.classList.add("webme-heading-split");
    heading.innerHTML = text
      .split(/\\s+/)
      .map(function (word, index) {
        return (
          '<span class="webme-heading-word" style="--webme-word-delay:' +
          index * 80 +
          'ms">' +
          '<span class="webme-heading-word-inner">' +
          word +
          "</span></span>"
        );
      })
      .join(" ");

    return line;
  }

  function boot() {
    document.querySelectorAll("section h2").forEach(function (heading) {
      prepareHeading(heading);
    });

    document.querySelectorAll("section img").forEach(function (el) {
      el.classList.add("webme-image-animate");
    });

    document.querySelectorAll("section").forEach(function (el) {
      el.classList.add("webme-section-animate");
    });

    document.querySelectorAll('[data-webme="service-card"]').forEach(function (el, index) {
      el.classList.add("webme-service-card");
      var delay = Math.min(index, 2) * 200;
      el.style.setProperty("--webme-stagger", delay + "ms");
    });

    document.querySelectorAll(".trust-bar .trust-item h3").forEach(function (el, index) {
      el.classList.add("webme-stat-animate");
      el.style.setProperty("--webme-stat-delay", index * 200 + "ms");
    });

    var sectionObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.08 },
    );

    var headingObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) {
            return;
          }
          e.target.classList.add("visible");
          var line = e.target.previousElementSibling;
          if (line && line.classList.contains("webme-heading-line")) {
            line.classList.add("visible");
          }
        });
      },
      { threshold: 0, rootMargin: "120px 0px 0px 0px" },
    );

    var imageObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.05, rootMargin: "40px 0px 0px 0px" },
    );

    var cardObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.12 },
    );

    var statObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.2 },
    );

    document.querySelectorAll(".webme-section-animate").forEach(function (el) {
      sectionObserver.observe(el);
    });
    document.querySelectorAll(".webme-heading-split").forEach(function (el) {
      headingObserver.observe(el);
    });
    document.querySelectorAll(".webme-image-animate").forEach(function (el) {
      imageObserver.observe(el);
    });
    document.querySelectorAll(".webme-service-card").forEach(function (el) {
      cardObserver.observe(el);
    });
    document.querySelectorAll(".webme-stat-animate").forEach(function (el) {
      statObserver.observe(el);
    });

    console.log("[webme-site-animations] premium cinematic reveals initialized", {
      sections: document.querySelectorAll(".webme-section-animate").length,
      headings: document.querySelectorAll(".webme-heading-split").length,
      serviceCards: document.querySelectorAll(".webme-service-card").length,
      stats: document.querySelectorAll(".webme-stat-animate").length,
      images: document.querySelectorAll(".webme-image-animate").length,
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
</script>`;

const LEGACY_GSAP_SCRIPT_IDS = [
  "webme-gsap-inline-core",
  "webme-gsap-inline-scrolltrigger",
  "webme-iframe-scripts-probe",
];

function removeLegacyGsapScripts($: cheerio.CheerioAPI): void {
  for (const id of LEGACY_GSAP_SCRIPT_IDS) {
    $(`#${id}`).remove();
  }
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
    html.includes("webme-section-animate") &&
    html.includes("webme-stat-slam") &&
    html.includes("rotateX(8deg)")
  );
}

/** Inject scroll reveal animations into generated site HTML. Idempotent. */
export function injectSiteAnimations(html: string): string {
  if (!html.trim()) {
    return html;
  }

  if (hasCompleteSiteAnimations(html)) {
    return html;
  }

  const $ = cheerio.load(html);

  tagServiceCards($);
  removeLegacyGsapScripts($);
  ensureAnimationStyles($);
  ensureAnimationInitScript($);

  const result = $.html();
  console.log("[injectSiteAnimations] injected premium cinematic scroll animations:", {
    hadInitScript: hasSiteAnimations(html),
    resultHasStyles: result.includes(ANIMATIONS_STYLE_ID),
    resultHasInitScript: result.includes(ANIMATIONS_INIT_ID),
    serviceCards: $('[data-webme="service-card"]').length,
    sections: $("section").length,
    headings: $("section h2").length,
    trustStats: $(".trust-bar .trust-item h3").length,
    images: $("section img").length,
  });

  return result;
}

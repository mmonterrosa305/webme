import * as cheerio from "cheerio";

import { tagServiceCards } from "@/lib/agents/service-card-hover";

const ANIMATIONS_STYLE_ID = "webme-site-animations-styles";
const ANIMATIONS_INIT_ID = "webme-site-animations-init";

const REVEAL_EASING = "cubic-bezier(0.16, 1, 0.3, 1)";

const SITE_ANIMATIONS_STYLES = `<style id="${ANIMATIONS_STYLE_ID}">
.webme-animate {
  opacity: 0;
  transform: translateY(80px) scale(0.95);
  transition:
    opacity 0.9s ${REVEAL_EASING},
    transform 0.9s ${REVEAL_EASING};
  will-change: opacity, transform;
}
.webme-animate.visible {
  opacity: 1;
  transform: translateY(0) scale(1);
}
.webme-service-card.webme-animate {
  transition-delay: var(--webme-stagger, 0ms);
}
.webme-service-card.webme-animate.visible {
  transition-delay: var(--webme-stagger, 0ms);
}
.webme-heading-animate {
  opacity: 0;
  transform: translateY(30px);
  transition:
    opacity 0.7s ${REVEAL_EASING},
    transform 0.7s ${REVEAL_EASING};
  will-change: opacity, transform;
}
.webme-heading-animate.visible {
  opacity: 1;
  transform: translateY(0);
}
.webme-image-animate {
  opacity: 0;
  transition: opacity 1.2s ${REVEAL_EASING};
  will-change: opacity;
}
.webme-image-animate.visible {
  opacity: 1;
}
</style>`;

const SITE_ANIMATIONS_INIT_SCRIPT = `<script id="${ANIMATIONS_INIT_ID}">
(function () {
  if (document.documentElement.getAttribute("data-webme-animations-init") === "true") {
    return;
  }
  document.documentElement.setAttribute("data-webme-animations-init", "true");

  function boot() {
    document.querySelectorAll("section h2").forEach(function (el) {
      el.classList.add("webme-heading-animate");
    });

    document.querySelectorAll("section img").forEach(function (el) {
      el.classList.add("webme-image-animate");
    });

    document.querySelectorAll("section").forEach(function (el) {
      el.classList.add("webme-animate");
    });

    document.querySelectorAll('[data-webme="service-card"]').forEach(function (el, index) {
      el.classList.add("webme-animate", "webme-service-card");
      var delay = Math.min(index, 2) * 150;
      el.style.setProperty("--webme-stagger", delay + "ms");
    });

    var sectionObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1 },
    );

    var headingObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
          }
        });
      },
      { threshold: 0, rootMargin: "100px 0px 0px 0px" },
    );

    var imageObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.05 },
    );

    document.querySelectorAll(".webme-animate").forEach(function (el) {
      sectionObserver.observe(el);
    });
    document.querySelectorAll(".webme-heading-animate").forEach(function (el) {
      headingObserver.observe(el);
    });
    document.querySelectorAll(".webme-image-animate").forEach(function (el) {
      imageObserver.observe(el);
    });

    console.log("[webme-site-animations] cinematic scroll reveals initialized", {
      sections: document.querySelectorAll(".webme-animate").length,
      headings: document.querySelectorAll(".webme-heading-animate").length,
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
    html.includes("webme-heading-animate") &&
    html.includes("webme-image-animate") &&
    html.includes("scale(0.95)")
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
  console.log("[injectSiteAnimations] injected cinematic scroll animations:", {
    hadInitScript: hasSiteAnimations(html),
    resultHasStyles: result.includes(ANIMATIONS_STYLE_ID),
    resultHasInitScript: result.includes(ANIMATIONS_INIT_ID),
    serviceCards: $('[data-webme="service-card"]').length,
    sections: $("section").length,
    headings: $("section h2").length,
    images: $("section img").length,
  });

  return result;
}

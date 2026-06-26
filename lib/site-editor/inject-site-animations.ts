import * as cheerio from "cheerio";

import { tagServiceCards } from "@/lib/agents/service-card-hover";

const ANIMATIONS_STYLE_ID = "webme-site-animations-styles";
const ANIMATIONS_INIT_ID = "webme-site-animations-init";

const SITE_ANIMATIONS_STYLES = `<style id="${ANIMATIONS_STYLE_ID}">
.webme-animate {
  opacity: 0;
  transform: translateY(40px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.webme-animate.visible {
  opacity: 1;
  transform: translateY(0);
}
</style>`;

const SITE_ANIMATIONS_INIT_SCRIPT = `<script id="${ANIMATIONS_INIT_ID}">
(function () {
  if (document.documentElement.getAttribute("data-webme-animations-init") === "true") {
    return;
  }
  document.documentElement.setAttribute("data-webme-animations-init", "true");

  function boot() {
    document
      .querySelectorAll('section, [data-webme="service-card"]')
      .forEach(function (el) {
        el.classList.add("webme-animate");
      });

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1 },
    );

    document.querySelectorAll(".webme-animate").forEach(function (el) {
      observer.observe(el);
    });

    console.log("[webme-site-animations] IntersectionObserver reveal initialized", {
      targets: document.querySelectorAll(".webme-animate").length,
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
    html.includes(".webme-animate") &&
    html.includes("IntersectionObserver")
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
  console.log("[injectSiteAnimations] injected IntersectionObserver scroll animations:", {
    hadInitScript: hasSiteAnimations(html),
    resultHasStyles: result.includes(ANIMATIONS_STYLE_ID),
    resultHasInitScript: result.includes(ANIMATIONS_INIT_ID),
    serviceCards: $('[data-webme="service-card"]').length,
    sections: $("section").length,
  });

  return result;
}

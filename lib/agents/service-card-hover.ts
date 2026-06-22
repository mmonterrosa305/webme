import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

import { GSAP_CDN } from "./scroll-hero-video";

const SERVICE_CARD_HOVER_STYLES = `<style id="webme-service-card-hover-styles">
[data-webme="service-card"] {
  position: relative;
  overflow: hidden;
  transform-style: preserve-3d;
  will-change: transform;
}
.webme-service-card-shine {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
  opacity: 0;
  border-radius: inherit;
  background: radial-gradient(
    circle at 50% 50%,
    rgba(255, 255, 255, 0.4) 0%,
    transparent 65%
  );
  transition: opacity 0.25s ease;
}
</style>`;

const SERVICE_CARD_HOVER_INIT_SCRIPT = `<script id="webme-service-card-hover-init">
(function () {
  var MAX_TILT = 14;

  function initServiceCardHover() {
    if (typeof gsap === "undefined") return;

    var cards = document.querySelectorAll('[data-webme="service-card"]');
    if (!cards.length) return;

    cards.forEach(function (card) {
      if (card.getAttribute("data-webme-card-hover-init") === "true") return;
      card.setAttribute("data-webme-card-hover-init", "true");

      gsap.set(card, {
        transformPerspective: 900,
        transformOrigin: "center center",
      });

      var shine = card.querySelector(".webme-service-card-shine");
      if (!shine) {
        shine = document.createElement("div");
        shine.className = "webme-service-card-shine";
        shine.setAttribute("aria-hidden", "true");
        card.appendChild(shine);
      }

      card.addEventListener("mousemove", function (event) {
        var rect = card.getBoundingClientRect();
        var x = event.clientX - rect.left;
        var y = event.clientY - rect.top;
        var centerX = rect.width / 2;
        var centerY = rect.height / 2;
        var rotateY = ((x - centerX) / centerX) * MAX_TILT;
        var rotateX = ((centerY - y) / centerY) * MAX_TILT;

        gsap.to(card, {
          rotationX: rotateX,
          rotationY: rotateY,
          duration: 0.45,
          ease: "power2.out",
          overwrite: "auto",
        });

        var shineX = (x / rect.width) * 100;
        var shineY = (y / rect.height) * 100;
        gsap.to(shine, {
          opacity: 0.35,
          background:
            "radial-gradient(circle at " +
            shineX +
            "% " +
            shineY +
            "%, rgba(255,255,255,0.55) 0%, transparent 62%)",
          duration: 0.35,
          ease: "power2.out",
          overwrite: "auto",
        });
      });

      card.addEventListener("mouseleave", function () {
        gsap.to(card, {
          rotationX: 0,
          rotationY: 0,
          duration: 0.75,
          ease: "elastic.out(1, 0.55)",
          overwrite: "auto",
        });

        gsap.to(shine, {
          opacity: 0,
          duration: 0.4,
          ease: "power2.out",
          overwrite: "auto",
        });
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initServiceCardHover);
  } else {
    initServiceCardHover();
  }
})();
</script>`;

export function hasServiceCardHover(html: string): boolean {
  return html.includes('id="webme-service-card-hover-init"');
}

function ensureGsapCoreScript($: cheerio.CheerioAPI): void {
  const head = $("head");
  if (head.length === 0) {
    return;
  }

  if (!$(`script[src="${GSAP_CDN}"]`).length) {
    head.append(`<script src="${GSAP_CDN}"></script>`);
  }
}

function ensureServiceCardHoverStyles($: cheerio.CheerioAPI): void {
  $("#webme-service-card-hover-styles").remove();
  const head = $("head");
  if (head.length === 0) {
    return;
  }

  head.append(SERVICE_CARD_HOVER_STYLES);
}

function ensureServiceCardHoverInitScript($: cheerio.CheerioAPI): void {
  $("#webme-service-card-hover-init").remove();
  $("body").append(SERVICE_CARD_HOVER_INIT_SCRIPT);
}

function findServiceCardWrapper(
  $: cheerio.CheerioAPI,
  $element: cheerio.Cheerio<AnyNode>,
): cheerio.Cheerio<AnyNode> | null {
  let $current = $element;

  for (let depth = 0; depth < 6; depth += 1) {
    if (!$current.length) {
      break;
    }

    const webme = $current.attr("data-webme");
    if (webme === "service-card") {
      return $current;
    }

    const tagName = ($current.prop("tagName") ?? "").toLowerCase();
    if (tagName === "section" || tagName === "body" || tagName === "html") {
      break;
    }

    const className = ($current.attr("class") ?? "").toLowerCase();
    const isLikelyCard =
      className.includes("card") ||
      className.includes("service") ||
      tagName === "article" ||
      (depth >= 1 && $current.find("h2, h3, h4").length > 0);

    if (isLikelyCard) {
      return $current;
    }

    $current = $current.parent();
  }

  const $parent = $element.parent();
  return $parent.length ? $parent : null;
}

function tagServiceCards($: cheerio.CheerioAPI): void {
  for (let index = 1; index <= 4; index += 1) {
    const $serviceImage = $(`[data-webme="service-image-${index}"]`).first();
    if (!$serviceImage.length) {
      continue;
    }

    const $card = findServiceCardWrapper($, $serviceImage);
    if (!$card?.length) {
      continue;
    }

    const existingWebme = $card.attr("data-webme");
    if (existingWebme?.startsWith("service-image")) {
      $card.removeAttr("data-webme");
    }

    if ($card.attr("data-webme") !== "service-card") {
      $card.attr("data-webme", "service-card");
    }
  }
}

/** Inject GSAP 3D tilt + shine hover on service cards. Idempotent. */
export function applyServiceCardHoverEffect(html: string): string {
  const $ = cheerio.load(html);
  tagServiceCards($);

  if ($('[data-webme="service-card"]').length === 0) {
    return html;
  }

  ensureServiceCardHoverStyles($);
  ensureGsapCoreScript($);
  ensureServiceCardHoverInitScript($);
  return $.html();
}

import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

const HORIZONTAL_SCROLL_SECTION_ID = "webme-horizontal-scroll";
const HORIZONTAL_SCROLL_STYLE_ID = "webme-horizontal-scroll-styles";
const HORIZONTAL_SCROLL_VERSION = "4";

const LEGACY_GSAP_SCRIPT_IDS = [
  "webme-gsap-inline-core",
  "webme-gsap-inline-scrolltrigger",
  "webme-horizontal-scroll-init",
];

type ServiceSlide = {
  title: string;
  description: string;
  imageUrl: string;
};

const HORIZONTAL_SCROLL_STYLES = `<style id="${HORIZONTAL_SCROLL_STYLE_ID}">
#${HORIZONTAL_SCROLL_SECTION_ID} {
  width: 100%;
  height: 100vh;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  background: #000;
  scrollbar-width: none;
}
#${HORIZONTAL_SCROLL_SECTION_ID}::-webkit-scrollbar {
  display: none;
}
#${HORIZONTAL_SCROLL_SECTION_ID} .webme-hscroll-rail {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 16px;
  height: 100vh;
  width: max-content;
  margin: 0;
  padding: 0;
}
#${HORIZONTAL_SCROLL_SECTION_ID} .webme-hscroll-card {
  flex: 0 0 380px;
  width: 380px;
  height: 100vh;
  position: relative;
  scroll-snap-align: start;
  scroll-snap-stop: always;
  background-color: #111;
  background-size: cover;
  background-position: center center;
  background-repeat: no-repeat;
  overflow: hidden;
}
#${HORIZONTAL_SCROLL_SECTION_ID} .webme-hscroll-card-overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 50%;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.35) 55%, transparent 100%);
  pointer-events: none;
}
#${HORIZONTAL_SCROLL_SECTION_ID} .webme-hscroll-card-text {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 28px 24px 32px;
  z-index: 2;
  color: #fff;
}
#${HORIZONTAL_SCROLL_SECTION_ID} .webme-hscroll-card-text h3 {
  margin: 0 0 10px;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
  color: #fff;
}
#${HORIZONTAL_SCROLL_SECTION_ID} .webme-hscroll-card-text p {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.92);
  max-width: 30ch;
}
</style>`;

const BACKGROUND_URL_PATTERN =
  /url\(\s*['"]?(https?:\/\/[^'")\s]+|data:[^'")\s]+)['"]?\s*\)/gi;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeCssUrl(url: string): string {
  return url.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

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

  return "";
}

function extractServices($: cheerio.CheerioAPI): ServiceSlide[] {
  const services: ServiceSlide[] = [];

  const $cards = $('[data-webme="service-card"], .service-card').filter(
    (_index, element) => {
      return !$(element).closest(`#${HORIZONTAL_SCROLL_SECTION_ID}`).length;
    },
  );

  $cards.each((_index, element) => {
    const $card = $(element);
    const title = $card.find("h3").first().text().trim();
    if (!title) {
      return;
    }

    const description = $card.find("p").first().text().trim();
    const $imageSlot = $card.find('[data-webme^="service-image-"]').first();
    const imageUrl =
      extractImageUrlFromElement($, $imageSlot) ||
      extractImageUrlFromElement($, $card);

    services.push({ title, description, imageUrl });
  });

  return services;
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

function buildHorizontalScrollSection(services: ServiceSlide[]): string {
  const cardsHtml = services
    .map((service) => {
      const styleAttr = service.imageUrl
        ? ` style="background-image:url('${escapeCssUrl(service.imageUrl)}')"`
        : "";

      return `<article class="webme-hscroll-card"${styleAttr}>
<div class="webme-hscroll-card-overlay" aria-hidden="true"></div>
<div class="webme-hscroll-card-text">
<h3>${escapeHtml(service.title)}</h3>
<p>${escapeHtml(service.description)}</p>
</div>
</article>`;
    })
    .join("");

  return `<section id="${HORIZONTAL_SCROLL_SECTION_ID}" class="webme-hscroll" data-webme="horizontal-scroll" data-webme-hscroll-version="${HORIZONTAL_SCROLL_VERSION}">
<div class="webme-hscroll-rail">
${cardsHtml}
</div>
</section>`;
}

function removeLegacyHorizontalScrollAssets($: cheerio.CheerioAPI): void {
  for (const id of LEGACY_GSAP_SCRIPT_IDS) {
    $(`#${id}`).remove();
  }
}

function ensureHorizontalScrollStyles($: cheerio.CheerioAPI): void {
  $(`#${HORIZONTAL_SCROLL_STYLE_ID}`).remove();
  const head = $("head");
  if (head.length) {
    head.append(HORIZONTAL_SCROLL_STYLES);
  }
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
    html.includes("scroll-snap-type: x mandatory") &&
    html.includes(`data-webme-hscroll-version="${HORIZONTAL_SCROLL_VERSION}"`)
  );
}

/** Inject a CSS scroll-snap horizontal services section after the trust bar. Idempotent. */
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
  removeLegacyHorizontalScrollAssets($);

  const sectionHtml = buildHorizontalScrollSection(services);
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

  ensureHorizontalScrollStyles($);

  const result = $.html();
  console.log("[injectHorizontalScrollSection] injected CSS scroll-snap section:", {
    services: services.length,
    titles: services.map((service) => service.title),
  });

  return result;
}

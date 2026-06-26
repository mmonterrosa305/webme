import * as cheerio from "cheerio";

const HORIZONTAL_SCROLL_SECTION_ID = "webme-horizontal-scroll";
const HORIZONTAL_SCROLL_STYLE_ID = "webme-horizontal-scroll-styles";

const LEGACY_HORIZONTAL_SCROLL_ASSET_IDS = [
  "webme-horizontal-scroll-init",
  "webme-gsap-inline-core",
  "webme-gsap-inline-scrolltrigger",
];

/** Remove injected horizontal scroll section and related assets from site HTML. */
export function stripHorizontalScrollSection(html: string): string {
  if (!html.trim()) {
    return html;
  }

  const hasHorizontalScroll =
    html.includes(HORIZONTAL_SCROLL_SECTION_ID) ||
    html.includes(HORIZONTAL_SCROLL_STYLE_ID) ||
    LEGACY_HORIZONTAL_SCROLL_ASSET_IDS.some((id) => html.includes(id));

  if (!hasHorizontalScroll) {
    return html;
  }

  const $ = cheerio.load(html);

  $(`#${HORIZONTAL_SCROLL_SECTION_ID}`).remove();
  $(`#${HORIZONTAL_SCROLL_STYLE_ID}`).remove();
  $('[data-webme="horizontal-scroll"]').remove();

  for (const id of LEGACY_HORIZONTAL_SCROLL_ASSET_IDS) {
    $(`#${id}`).remove();
  }

  const result = $.html();
  console.log("[stripHorizontalScrollSection] removed horizontal scroll markup");

  return result;
}

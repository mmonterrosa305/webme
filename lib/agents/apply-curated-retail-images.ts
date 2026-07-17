import * as cheerio from "cheerio";

import { resolveIndustryImages } from "./industry-images";
import { prefersCuratedIndustryImages } from "./retail-industry";

const SLOT_SELECTORS: Array<{
  key: keyof ReturnType<typeof resolveIndustryImages>;
  selectors: string[];
}> = [
  {
    key: "about",
    selectors: ['[data-webme="about-image"]'],
  },
  {
    key: "service1",
    selectors: [
      '[data-webme="service-image-1"]',
      '[data-webme-image-slot="service-image-1"]',
    ],
  },
  {
    key: "service2",
    selectors: [
      '[data-webme="service-image-2"]',
      '[data-webme-image-slot="service-image-2"]',
    ],
  },
  {
    key: "service3",
    selectors: [
      '[data-webme="service-image-3"]',
      '[data-webme-image-slot="service-image-3"]',
    ],
  },
  {
    key: "service4",
    selectors: [
      '[data-webme="service-image-4"]',
      '[data-webme-image-slot="service-image-4"]',
    ],
  },
  {
    key: "gallery1",
    selectors: ['[data-webme="gallery-image-1"]'],
  },
  {
    key: "gallery2",
    selectors: ['[data-webme="gallery-image-2"]'],
  },
  {
    key: "gallery3",
    selectors: ['[data-webme="gallery-image-3"]'],
  },
];

function setElementImageUrl(
  $: cheerio.CheerioAPI,
  selectorList: string[],
  url: string,
): boolean {
  for (const selector of selectorList) {
    const $el = $(selector).first();
    if (!$el.length) {
      continue;
    }

    if ($el.is("img")) {
      $el.attr("src", url);
      return true;
    }

    if ($el.is("video")) {
      continue;
    }

    const $img = $el.find("img").first();
    if ($img.length) {
      $img.attr("src", url);
      return true;
    }

    const style = $el.attr("style") ?? "";
    if (/url\(/i.test(style)) {
      $el.attr(
        "style",
        style.replace(/url\((['"]?)([^'")]+)\1\)/gi, `url('${url}')`),
      );
      return true;
    }

    const nextStyle = style.trim().replace(/;?\s*$/, "");
    $el.attr(
      "style",
      `${nextStyle}${nextStyle ? ";" : ""}background-image:url('${url}');background-size:cover;background-position:center;`,
    );
    return true;
  }

  return false;
}

/**
 * Swap about/service/gallery slots to curated Unsplash retail images.
 * Leaves the hero video alone.
 */
export function applyCuratedRetailImagesToHtml(
  html: string,
  industry: string,
): { html: string; images: ReturnType<typeof resolveIndustryImages> | null } {
  if (!prefersCuratedIndustryImages(industry)) {
    return { html, images: null };
  }

  const images = resolveIndustryImages(industry);
  const $ = cheerio.load(html);
  let changed = false;

  for (const slot of SLOT_SELECTORS) {
    const url = images[slot.key];
    if (typeof url !== "string" || !url) {
      continue;
    }
    if (setElementImageUrl($, slot.selectors, url)) {
      changed = true;
    }
  }

  return { html: changed ? $.html() : html, images };
}

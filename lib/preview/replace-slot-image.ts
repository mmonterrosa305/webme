import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

import {
  SERVICE_CARD_ATTR,
  SERVICE_IMAGE_SLOT_ATTR,
} from "@/lib/agents/service-card-hover";
import type { SiteImageSlot, SiteMetadata } from "@/lib/site-editor/types";

export const VALID_PHOTO_SLOTS = new Set([
  "hero-image",
  "about-image",
  "service-image-1",
  "service-image-2",
  "service-image-3",
  "service-image-4",
  "gallery-image-1",
  "gallery-image-2",
  "gallery-image-3",
]);

export type PhotoReplaceSlot =
  | "hero-image"
  | "about-image"
  | "service-image-1"
  | "service-image-2"
  | "service-image-3"
  | "service-image-4"
  | "gallery-image-1"
  | "gallery-image-2"
  | "gallery-image-3";

const SLOT_TO_UPLOAD_FOLDER: Record<PhotoReplaceSlot, SiteImageSlot> = {
  "hero-image": "hero",
  "about-image": "about",
  "service-image-1": "service1",
  "service-image-2": "service2",
  "service-image-3": "service3",
  "service-image-4": "service4",
  "gallery-image-1": "gallery1",
  "gallery-image-2": "gallery2",
  "gallery-image-3": "gallery3",
};

export function photoSlotToUploadFolder(
  slot: string,
): SiteImageSlot | null {
  if (!VALID_PHOTO_SLOTS.has(slot)) {
    return null;
  }
  return SLOT_TO_UPLOAD_FOLDER[slot as PhotoReplaceSlot];
}

export function extractCurrentImageUrl(
  $: cheerio.CheerioAPI,
  slot: string,
): string | null {
  const $el = findSlotElement($, slot);
  if (!$el?.length) {
    return null;
  }

  if ($el.is("img") || $el.is("video")) {
    return $el.attr("src")?.trim() || null;
  }

  const childImg = $el.find("img").first().attr("src")?.trim();
  if (childImg) {
    return childImg;
  }

  const style = $el.attr("style") ?? "";
  const match = style.match(/url\((['"]?)([^'")]+)\1\)/i);
  return match?.[2]?.trim() || null;
}

/** Prefer service-image-N; fall back to image-slot attr or Nth service card. */
export function findSlotElement(
  $: cheerio.CheerioAPI,
  slot: string,
): cheerio.Cheerio<AnyNode> | null {
  const $direct = $(`[data-webme="${slot}"]`).first();
  if ($direct.length) {
    return $direct;
  }

  const $byImageSlot = $(`[${SERVICE_IMAGE_SLOT_ATTR}="${slot}"]`).first();
  if ($byImageSlot.length) {
    return $byImageSlot;
  }

  if (!slot.startsWith("service-image-")) {
    return null;
  }

  const index = Number.parseInt(slot.replace("service-image-", ""), 10) - 1;
  if (index < 0 || index > 3) {
    return null;
  }

  const $cards = $(
    `[data-webme="service-card"], [${SERVICE_CARD_ATTR}="true"]`,
  );
  const $card = $cards.eq(index);
  return $card.length ? $card : null;
}

export function replaceSlotImageHtml(
  html: string,
  slot: string,
  newPhotoUrl: string,
): { html: string; replaced: boolean } {
  const $ = cheerio.load(html);
  const $el = findSlotElement($, slot);

  if (!$el?.length) {
    return { html, replaced: false };
  }

  // Keep service-card hover working while recording the replaceable slot.
  if (slot.startsWith("service-image-")) {
    if (($el.attr("data-webme") ?? "") === "service-card") {
      $el.attr(SERVICE_IMAGE_SLOT_ATTR, slot);
    } else if (!$el.attr("data-webme")?.startsWith("service-image")) {
      $el.attr("data-webme", slot);
      $el.attr(SERVICE_CARD_ATTR, "true");
    }
  }

  let replaced = false;

  if ($el.is("img")) {
    $el.attr("src", newPhotoUrl);
    replaced = true;
  } else if ($el.is("video")) {
    $el.attr("src", newPhotoUrl);
    $el.find("source").attr("src", newPhotoUrl);
    replaced = true;
  } else {
    const $img = $el.find("img").first();
    if ($img.length) {
      $img.attr("src", newPhotoUrl);
      replaced = true;
    }

    const style = $el.attr("style") ?? "";
    if (/url\(/i.test(style)) {
      $el.attr(
        "style",
        style.replace(/url\((['"]?)([^'")]+)\1\)/gi, `url(${newPhotoUrl})`),
      );
      replaced = true;
    } else if (!$img.length) {
      const nextStyle = style.trim().replace(/;?\s*$/, "");
      $el.attr(
        "style",
        `${nextStyle}${nextStyle ? ";" : ""}background-image:url('${newPhotoUrl}');background-size:cover;background-position:center;`,
      );
      replaced = true;
    }
  }

  return { html: $.html(), replaced };
}

export function updateMetadataForSlot(
  metadata: SiteMetadata | null,
  slot: string,
  newPhotoUrl: string,
): SiteMetadata {
  const next: SiteMetadata = { ...(metadata ?? {}) };

  if (slot === "hero-image") {
    next.heroImageUrl = newPhotoUrl;
  } else if (slot === "about-image") {
    next.aboutImageUrl = newPhotoUrl;
  } else if (slot.startsWith("service-image-")) {
    const index = Number.parseInt(slot.replace("service-image-", ""), 10) - 1;
    const urls = [...(next.serviceImageUrls ?? [])];
    while (urls.length < 4) {
      urls.push("");
    }
    if (index >= 0 && index < 4) {
      urls[index] = newPhotoUrl;
      next.serviceImageUrls = urls;
    }
  } else if (slot.startsWith("gallery-image-")) {
    const index = Number.parseInt(slot.replace("gallery-image-", ""), 10) - 1;
    const urls = [...(next.galleryImageUrls ?? [])];
    while (urls.length < 3) {
      urls.push("");
    }
    if (index >= 0 && index < 3) {
      urls[index] = newPhotoUrl;
      next.galleryImageUrls = urls;
    }
  }

  return next;
}

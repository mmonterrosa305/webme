import * as cheerio from "cheerio";

import type { SiteContent, SiteImageSlot, SiteMetadata } from "./types";
import { IMAGE_SLOTS } from "./types";

const BACKGROUND_URL_PATTERN =
  /url\(\s*['"]?(https?:\/\/[^'")\s]+|data:[^'")\s]+)['"]?\s*\)/gi;

function uniqueUrls(urls: string[]): string[] {
  return [...new Set(urls.filter(Boolean))];
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

function getAttrValue(
  $: cheerio.CheerioAPI,
  selector: string,
  attr: string,
): string {
  return $(selector).first().attr(attr)?.trim() ?? "";
}

function extractHeadline($: cheerio.CheerioAPI): string {
  const tagged = $('[data-webme="headline"]').first().text().trim();
  if (tagged) {
    return tagged;
  }

  const heroHeading = $("section").first().find("h1").first().text().trim();
  if (heroHeading) {
    return heroHeading;
  }

  return $("h1").first().text().trim();
}

function extractTagline($: cheerio.CheerioAPI): string {
  const tagged = $('[data-webme="tagline"]').first().text().trim();
  if (tagged) {
    return tagged;
  }

  const heroSection = $("section").first();
  const heroParagraph = heroSection.find("p").first().text().trim();
  if (heroParagraph) {
    return heroParagraph;
  }

  return heroSection.find("h2").first().text().trim();
}

function extractLogoUrl($: cheerio.CheerioAPI): string {
  const tagged = $('[data-webme="logo"]').first().attr("src")?.trim();
  if (tagged) {
    return tagged;
  }

  const headerLogo = $("header img").first().attr("src")?.trim();
  if (headerLogo) {
    return headerLogo;
  }

  return $("nav img").first().attr("src")?.trim() ?? "";
}

function extractHours($: cheerio.CheerioAPI): string {
  const tagged = $('[data-webme="hours"]').first().text().trim();
  if (tagged) {
    return tagged.replace(/\s+/g, " ").trim();
  }

  const hoursBlock = $('[data-webme="hours-block"]').first();
  if (hoursBlock.length) {
    return hoursBlock
      .find("li")
      .map((_, element) => $(element).text().trim())
      .get()
      .filter(Boolean)
      .join("\n");
  }

  const contactSection = $("section")
    .filter((_, element) => /contact|hours/i.test($(element).text()))
    .last();

  const listItems = contactSection.find("li").map((_, element) =>
    $(element).text().trim(),
  );

  const hoursLines = listItems
    .get()
    .filter((line) => /\d/.test(line) && /(am|pm|mon|tue|wed|thu|fri|sat|sun|hour|open|close)/i.test(line));

  if (hoursLines.length > 0) {
    return hoursLines.join("\n");
  }

  return "";
}

function extractPhone($: cheerio.CheerioAPI, fallback: string): string {
  const tagged = $('[data-webme="phone"]').first().text().trim();
  if (tagged) {
    return tagged;
  }

  const telLink = $('a[href^="tel:"]').first().attr("href");
  if (telLink) {
    return telLink.replace(/^tel:/i, "").trim();
  }

  return fallback;
}

function extractAddress($: cheerio.CheerioAPI, fallback: string): string {
  const tagged = $('[data-webme="address"]').first().text().trim();
  if (tagged) {
    return tagged;
  }

  const addressNode = $('[data-webme="address-block"]').first().text().trim();
  if (addressNode) {
    return addressNode.replace(/\s+/g, " ").trim();
  }

  return fallback;
}

function classifyImageUrls(
  $: cheerio.CheerioAPI,
  html: string,
  metadata?: SiteMetadata | null,
): Record<SiteImageSlot, string> {
  const images = Object.fromEntries(
    IMAGE_SLOTS.map((slot) => [slot, ""]),
  ) as Record<SiteImageSlot, string>;

  if (metadata?.heroImageUrl) images.hero = metadata.heroImageUrl;
  if (metadata?.aboutImageUrl) images.about = metadata.aboutImageUrl;
  metadata?.serviceImageUrls?.forEach((url, index) => {
    const slot = `service${index + 1}` as SiteImageSlot;
    if (IMAGE_SLOTS.includes(slot) && url) {
      images[slot] = url;
    }
  });
  metadata?.galleryImageUrls?.forEach((url, index) => {
    const slot = `gallery${index + 1}` as SiteImageSlot;
    if (IMAGE_SLOTS.includes(slot) && url) {
      images[slot] = url;
    }
  });

  const taggedSlots: Array<[SiteImageSlot, string]> = [
    ["hero", '[data-webme="hero-image"]'],
    ["about", '[data-webme="about-image"]'],
    ["service1", '[data-webme="service-image-1"]'],
    ["service2", '[data-webme="service-image-2"]'],
    ["service3", '[data-webme="service-image-3"]'],
    ["service4", '[data-webme="service-image-4"]'],
    ["gallery1", '[data-webme="gallery-image-1"]'],
    ["gallery2", '[data-webme="gallery-image-2"]'],
    ["gallery3", '[data-webme="gallery-image-3"]'],
  ];

  for (const [slot, selector] of taggedSlots) {
    if (images[slot]) {
      continue;
    }

    const element = $(selector).first();
    const src = element.attr("src")?.trim();
    if (src) {
      images[slot] = src;
      continue;
    }

    const style = element.attr("style") ?? "";
    const background = extractBackgroundUrls(style)[0];
    if (background) {
      images[slot] = background;
    }
  }

  const backgroundUrls = uniqueUrls(extractBackgroundUrls(html));
  const imgUrls = uniqueUrls(
    $("img")
      .map((_, element) => $(element).attr("src")?.trim() ?? "")
      .get()
      .filter(Boolean),
  );

  if (!images.hero && backgroundUrls[0]) {
    images.hero = backgroundUrls[0];
  }

  if (!images.about) {
    const aboutImg = imgUrls.find((url) => url !== images.hero);
    if (aboutImg) {
      images.about = aboutImg;
    }
  }

  const remainingBackgrounds = backgroundUrls.filter(
    (url) => url !== images.hero,
  );

  for (const slot of ["service1", "service2", "service3", "service4"] as SiteImageSlot[]) {
    if (!images[slot]) {
      const next = remainingBackgrounds.shift();
      if (next) {
        images[slot] = next;
      }
    }
  }

  const remainingImgs = imgUrls.filter(
    (url) =>
      !Object.values(images).includes(url) &&
      url !== images.hero &&
      url !== images.about,
  );

  for (const slot of ["gallery1", "gallery2", "gallery3"] as SiteImageSlot[]) {
    if (!images[slot]) {
      const next = remainingImgs.shift();
      if (next) {
        images[slot] = next;
      }
    }
  }

  return images;
}

export function extractSiteContent(
  siteHtml: string,
  {
    businessName,
    phone,
    address,
    metadata,
  }: {
    businessName: string;
    phone?: string | null;
    address?: string | null;
    metadata?: SiteMetadata | null;
  },
): SiteContent {
  const $ = cheerio.load(siteHtml);

  return {
    businessName,
    phone: extractPhone($, phone?.trim() ?? ""),
    address: extractAddress($, address?.trim() ?? ""),
    hours: metadata?.hours?.trim() ?? extractHours($),
    headline: metadata?.headline?.trim() ?? extractHeadline($),
    tagline: metadata?.tagline?.trim() ?? extractTagline($),
    logoUrl: metadata?.logoUrl?.trim() ?? extractLogoUrl($),
    images: classifyImageUrls($, siteHtml, metadata),
  };
}

export function contentToMetadata(content: SiteContent): SiteMetadata {
  return {
    headline: content.headline,
    tagline: content.tagline,
    hours: content.hours,
    logoUrl: content.logoUrl || undefined,
    heroImageUrl: content.images.hero || undefined,
    aboutImageUrl: content.images.about || undefined,
    serviceImageUrls: [
      content.images.service1,
      content.images.service2,
      content.images.service3,
      content.images.service4,
    ].filter(Boolean),
    galleryImageUrls: [
      content.images.gallery1,
      content.images.gallery2,
      content.images.gallery3,
    ].filter(Boolean),
  };
}

import * as cheerio from "cheerio";

import type { SiteContent, SiteImageSlot } from "./types";
import { IMAGE_SLOTS } from "./types";

function replaceGlobalUrl(html: string, oldUrl: string, newUrl: string): string {
  if (!oldUrl || !newUrl || oldUrl === newUrl) {
    return html;
  }

  return html.split(oldUrl).join(newUrl);
}

function setText($: cheerio.CheerioAPI, selector: string, value: string) {
  const element = $(selector).first();
  if (element.length) {
    element.text(value);
  }
}

function replaceGlobalText(html: string, search: string, replace: string): string {
  if (!search || search.trim() === replace.trim()) {
    return html;
  }

  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.replace(new RegExp(escaped, "gi"), () => replace);
}

function getBusinessNameReplaceTargets(
  $: cheerio.CheerioAPI,
  previousContent: SiteContent,
): string[] {
  const targets = new Set<string>();

  function add(value: string | undefined | null) {
    const trimmed = value?.trim();
    if (trimmed) {
      targets.add(trimmed);
    }
  }

  add(previousContent.businessName);

  add($('[data-webme="business-name"]').first().text());
  $(".logo-text").each((_, element) => {
    add($(element).text());
  });

  const title = $("title").first().text().trim();
  if (title) {
    add(title.split("|")[0]?.trim());
  }

  return [...targets].sort((left, right) => right.length - left.length);
}

function applyBusinessName(
  $: cheerio.CheerioAPI,
  nextContent: SiteContent,
) {
  if (!nextContent.businessName) {
    return;
  }

  setText($, '[data-webme="business-name"]', nextContent.businessName);

  $(".logo-text").each((_, element) => {
    $(element).text(nextContent.businessName);
  });

  const titleElement = $("title").first();
  const title = titleElement.text().trim();
  if (title.includes("|")) {
    titleElement.text(
      `${nextContent.businessName}${title.slice(title.indexOf("|"))}`,
    );
  } else if (title) {
    titleElement.text(nextContent.businessName);
  } else {
    titleElement.text(nextContent.businessName);
  }

  const headerLink = $("header a").first();
  if (headerLink.length && headerLink.find("img").length === 0) {
    headerLink.text(nextContent.businessName);
  }
}

function applyPhone($: cheerio.CheerioAPI, nextContent: SiteContent) {
  if (!nextContent.phone) {
    return;
  }

  setText($, '[data-webme="phone"]', nextContent.phone);

  const normalizedPhone = nextContent.phone.replace(/\s+/g, "");

  $('a[href^="tel:"]').each((_, element) => {
    $(element).attr("href", `tel:${normalizedPhone}`);
    $(element).text(nextContent.phone);
  });
}

function applyAddress($: cheerio.CheerioAPI, nextContent: SiteContent) {
  if (!nextContent.address) {
    return;
  }

  setText($, '[data-webme="address"]', nextContent.address);
  setText($, '[data-webme="address-block"]', nextContent.address);
}

function applyHeadline($: cheerio.CheerioAPI, nextContent: SiteContent) {
  if (!nextContent.headline) {
    return;
  }

  setText($, '[data-webme="headline"]', nextContent.headline);

  const heroHeading = $("section").first().find("h1").first();
  if (heroHeading.length) {
    heroHeading.text(nextContent.headline);
  }
}

function applyTagline($: cheerio.CheerioAPI, nextContent: SiteContent) {
  if (!nextContent.tagline) {
    return;
  }

  setText($, '[data-webme="tagline"]', nextContent.tagline);

  const heroSection = $("section").first();
  const heroParagraph = heroSection.find("p").first();
  if (heroParagraph.length) {
    heroParagraph.text(nextContent.tagline);
  }
}

function setImageSrc($: cheerio.CheerioAPI, selector: string, url: string) {
  const element = $(selector).first();
  if (element.length && url) {
    element.attr("src", url);
  }
}

function applyHours($: cheerio.CheerioAPI, hours: string) {
  const lines = hours
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const tagged = $('[data-webme="hours"]').first();
  if (tagged.length) {
    tagged.text(lines.join(" · "));
    return;
  }

  const block = $('[data-webme="hours-block"]').first();
  if (block.length) {
    block.empty();
    for (const line of lines) {
      block.append(`<li>${line}</li>`);
    }
    return;
  }

  const contactSection = $("section")
    .filter((_, element) => /contact|hours/i.test($(element).text()))
    .last();

  const list = contactSection.find("ul").last();
  if (list.length && lines.length > 0) {
    list.empty();
    for (const line of lines) {
      list.append(`<li>${line}</li>`);
    }
  }
}

const IMAGE_SELECTOR_MAP: Record<SiteImageSlot, string> = {
  hero: '[data-webme="hero-image"]',
  about: '[data-webme="about-image"]',
  service1: '[data-webme="service-image-1"]',
  service2: '[data-webme="service-image-2"]',
  service3: '[data-webme="service-image-3"]',
  service4: '[data-webme="service-image-4"]',
  gallery1: '[data-webme="gallery-image-1"]',
  gallery2: '[data-webme="gallery-image-2"]',
  gallery3: '[data-webme="gallery-image-3"]',
};

export function applySiteContent(
  siteHtml: string,
  previousContent: SiteContent,
  nextContent: SiteContent,
): string {
  const $ = cheerio.load(siteHtml);
  const businessNameTargets = getBusinessNameReplaceTargets($, previousContent);

  applyHeadline($, nextContent);
  applyTagline($, nextContent);
  applyBusinessName($, nextContent);
  applyPhone($, nextContent);
  applyAddress($, nextContent);
  applyHours($, nextContent.hours);

  if (nextContent.logoUrl) {
    setImageSrc($, '[data-webme="logo"]', nextContent.logoUrl);
    const headerLogo = $("header img").first();
    if (headerLogo.length) {
      headerLogo.attr("src", nextContent.logoUrl);
    } else {
      const navLogo = $("nav img").first();
      if (navLogo.length) {
        navLogo.attr("src", nextContent.logoUrl);
      }
    }
  }

  for (const slot of IMAGE_SLOTS) {
    const selector = IMAGE_SELECTOR_MAP[slot];
    const element = $(selector).first();
    const nextUrl = nextContent.images[slot];

    if (!element.length || !nextUrl) {
      continue;
    }

    if (element.is("img")) {
      element.attr("src", nextUrl);
    } else {
      const style = element.attr("style") ?? "";
      const oldUrl = previousContent.images[slot];
      element.attr(
        "style",
        oldUrl
          ? style.split(oldUrl).join(nextUrl)
          : `${style};background-image:url('${nextUrl}')`,
      );
    }
  }

  let html = $.html();

  for (const target of businessNameTargets) {
    html = replaceGlobalText(
      html,
      target,
      nextContent.businessName,
    );
  }

  html = replaceGlobalText(html, previousContent.headline, nextContent.headline);
  html = replaceGlobalText(html, previousContent.tagline, nextContent.tagline);
  html = replaceGlobalText(html, previousContent.phone, nextContent.phone);
  html = replaceGlobalText(html, previousContent.address, nextContent.address);

  if (
    nextContent.logoUrl &&
    previousContent.logoUrl &&
    nextContent.logoUrl !== previousContent.logoUrl
  ) {
    html = replaceGlobalUrl(html, previousContent.logoUrl, nextContent.logoUrl);
  }

  for (const slot of IMAGE_SLOTS) {
    html = replaceGlobalUrl(
      html,
      previousContent.images[slot],
      nextContent.images[slot],
    );
  }

  return html;
}

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
  if (element.length && value) {
    element.text(value);
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

  if (nextContent.headline) {
    setText($, '[data-webme="headline"]', nextContent.headline);
    const heroHeading = $("section").first().find("h1").first();
    if (heroHeading.length) {
      heroHeading.text(nextContent.headline);
    }
  }

  if (nextContent.tagline) {
    setText($, '[data-webme="tagline"]', nextContent.tagline);
    const heroSection = $("section").first();
    const heroParagraph = heroSection.find("p").first();
    if (heroParagraph.length) {
      heroParagraph.text(nextContent.tagline);
    }
  }

  if (nextContent.businessName) {
    setText($, '[data-webme="business-name"]', nextContent.businessName);
    $("title").text(nextContent.businessName);
    $("footer").find("*").each((_, element) => {
      const text = $(element).text();
      if (
        previousContent.businessName &&
        text.includes(previousContent.businessName)
      ) {
        $(element).text(
          text.replaceAll(previousContent.businessName, nextContent.businessName),
        );
      }
    });
  }

  if (nextContent.phone) {
    setText($, '[data-webme="phone"]', nextContent.phone);
    $('a[href^="tel:"]').each((_, element) => {
      $(element).attr("href", `tel:${nextContent.phone.replace(/\s+/g, "")}`);
      if (
        previousContent.phone &&
        $(element).text().includes(previousContent.phone)
      ) {
        $(element).text(nextContent.phone);
      }
    });
  }

  if (nextContent.address) {
    setText($, '[data-webme="address"]', nextContent.address);
    setText($, '[data-webme="address-block"]', nextContent.address);
  }

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

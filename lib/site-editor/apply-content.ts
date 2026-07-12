import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";

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

export const LOGO_IMG_INLINE_STYLE =
  "height: auto; min-height: 48px; max-height: 80px; width: auto;";

const LOGO_CONTAINER_SELECTORS = [
  "header .logo",
  "nav .logo",
  ".logo",
  "header .brand",
  "header .nav-brand",
  "header .site-logo",
  "header a.logo",
];

function buildLogoImgMarkup(logoUrl: string): string {
  return `<img src="${logoUrl}" style="${LOGO_IMG_INLINE_STYLE}" data-webme="logo" alt="logo" />`;
}

function setLogoImgAttributes(
  $img: cheerio.Cheerio<AnyNode>,
  logoUrl: string,
) {
  $img.attr("src", logoUrl);
  $img.attr("style", LOGO_IMG_INLINE_STYLE);
  $img.attr("data-webme", "logo");
  $img.attr("alt", "logo");
}

function isLogoPlaceholderElement(
  $: cheerio.CheerioAPI,
  element: Element,
  keep?: cheerio.Cheerio<AnyNode>,
): boolean {
  const $el = $(element);
  if (keep?.length && $el.is(keep)) {
    return false;
  }

  const tag = element.tagName?.toLowerCase();
  if (tag === "nav" || tag === "ul" || tag === "ol" || tag === "form") {
    return false;
  }

  if ($el.attr("data-webme") === "logo") {
    return !(keep?.length && $el.is(keep));
  }

  if (tag === "svg" || tag === "span") {
    return true;
  }

  if (tag === "img") {
    return !(keep?.length && $el.is(keep));
  }

  if (tag === "div" || tag === "a") {
    const cls = $el.attr("class") ?? "";
    if (/logo|brand-mark|brand-icon/i.test(cls)) {
      return true;
    }
  }

  return false;
}

function stripLogoPlaceholdersInContainer(
  $: cheerio.CheerioAPI,
  container: cheerio.Cheerio<AnyNode>,
  keep?: cheerio.Cheerio<AnyNode>,
) {
  container.children().each((_, child) => {
    if (isLogoPlaceholderElement($, child, keep)) {
      $(child).remove();
    }
  });
}

function removeGlobalHeaderLogoPlaceholders($: cheerio.CheerioAPI) {
  $("header .logo-text, nav .logo-text").remove();
  $(
    "header .logo-icon, nav .logo-icon, .logo-circle, .logo-mark, .brand-icon, .brand-mark",
  ).remove();
  $(".logo svg, .brand svg, header .logo svg, header a.logo svg").remove();
  $("header > div > svg").remove();

  $('[data-webme="logo"]').slice(1).remove();
}

function findLogoContainer($: cheerio.CheerioAPI) {
  for (const selector of LOGO_CONTAINER_SELECTORS) {
    const element = $(selector).first();
    if (element.length) {
      return element;
    }
  }

  return null;
}

function applyLogo($: cheerio.CheerioAPI, logoUrl: string) {
  if (!logoUrl) {
    return;
  }

  removeGlobalHeaderLogoPlaceholders($);

  let taggedLogo = $('[data-webme="logo"]').first();
  const taggedTag = taggedLogo.prop("tagName")?.toLowerCase();

  if (taggedLogo.length && taggedTag === "svg") {
    taggedLogo.replaceWith(buildLogoImgMarkup(logoUrl));
    taggedLogo = $('[data-webme="logo"]').first();
  }

  if (taggedLogo.length && taggedLogo.is("img")) {
    const parent = taggedLogo.parent();
    stripLogoPlaceholdersInContainer($, parent, taggedLogo);

    const logoAncestor = taggedLogo.closest(".logo, .brand, header > a");
    if (logoAncestor.length) {
      stripLogoPlaceholdersInContainer($, logoAncestor, taggedLogo);
    }

    setLogoImgAttributes(taggedLogo, logoUrl);
    return;
  }

  const container = findLogoContainer($);
  if (container) {
    if (container.is("nav")) {
      container.find(".logo-text, svg, img[data-webme='logo']").remove();
      container.prepend(buildLogoImgMarkup(logoUrl));
      return;
    }

    container.empty();
    container.append(buildLogoImgMarkup(logoUrl));
    return;
  }

  const headerLogo = $("header img")
    .filter((_, img) => $(img).closest("nav").length === 0)
    .first();

  if (headerLogo.length) {
    stripLogoPlaceholdersInContainer($, headerLogo.parent(), headerLogo);
    setLogoImgAttributes(headerLogo, logoUrl);
    return;
  }

  const logoText = $("header .logo-text, nav .logo-text, .logo-text").first();
  if (logoText.length) {
    const parent = logoText.parent();
    parent.children().each((_, child) => {
      if (!$(child).is(logoText)) {
        $(child).remove();
      }
    });
    logoText.replaceWith(buildLogoImgMarkup(logoUrl));
    return;
  }

  const navWrapper = $("header .nav-wrapper, header > div").first();
  if (navWrapper.length) {
    stripLogoPlaceholdersInContainer($, navWrapper);
    navWrapper.prepend(buildLogoImgMarkup(logoUrl));
    return;
  }

  const headerBrandLink = $("header a")
    .filter((_, anchor) => {
      const $anchor = $(anchor);
      if ($anchor.closest("nav").length) {
        return false;
      }

      const href = $anchor.attr("href") ?? "";
      if (/^#(services|about|contact|home)/i.test(href)) {
        return false;
      }

      const cls = $anchor.attr("class") ?? "";
      return /logo|brand/i.test(cls) || href === "/" || href === "#";
    })
    .first();

  if (headerBrandLink.length) {
    headerBrandLink.html(buildLogoImgMarkup(logoUrl));
    return;
  }

  const header = $("header").first();
  if (header.length) {
    header.prepend(buildLogoImgMarkup(logoUrl));
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
  service1: '[data-webme="service-image-1"], [data-webme-image-slot="service-image-1"]',
  service2: '[data-webme="service-image-2"], [data-webme-image-slot="service-image-2"]',
  service3: '[data-webme="service-image-3"], [data-webme-image-slot="service-image-3"]',
  service4: '[data-webme="service-image-4"], [data-webme-image-slot="service-image-4"]',
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
    applyLogo($, nextContent.logoUrl);
  }

  for (const slot of IMAGE_SLOTS) {
    const selector = IMAGE_SELECTOR_MAP[slot];
    const element = $(selector).first();
    const nextUrl = nextContent.images[slot];

    if (!element.length || !nextUrl) {
      continue;
    }

    if (element.is("video")) {
      const source = element.find("source").first();
      if (source.length) {
        source.attr("src", nextUrl);
      }
      element.attr("src", nextUrl);
    } else if (element.is("img")) {
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

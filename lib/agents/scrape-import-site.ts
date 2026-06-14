import * as cheerio from "cheerio";

import type { BusinessProfile } from "@/lib/agents/scrapeBusinessData";
import { INDUSTRIES } from "@/lib/agents/site-options";

const PHONE_REGEX =
  /(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}/g;

const FETCH_TIMEOUT_MS = 20_000;

export type ImportedSiteData = {
  sourceUrl: string;
  businessName: string;
  phone: string | null;
  headline: string | null;
  tagline: string | null;
  services: string[];
  description: string | null;
  address: string | null;
  adCopy: string[];
  industry: string;
  city: string;
  logoUrl: string | null;
};

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = value.replace(/\s+/g, " ").trim();
    if (!trimmed || trimmed.length < 2 || seen.has(trimmed.toLowerCase())) {
      continue;
    }

    seen.add(trimmed.toLowerCase());
    result.push(trimmed);
  }

  return result;
}

function normalizeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new Error("URL is required.");
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  const parsed = new URL(withProtocol);

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only HTTP and HTTPS URLs are supported.");
  }

  return parsed.toString();
}

function resolveAssetUrl(rawUrl: string | undefined, baseUrl: string): string | null {
  if (!rawUrl?.trim()) {
    return null;
  }

  try {
    return new URL(rawUrl.trim(), baseUrl).toString();
  } catch {
    return null;
  }
}

function extractLogoImageUrl($: cheerio.CheerioAPI, sourceUrl: string): string | null {
  const candidates = [
    $("header img").first().attr("src"),
    $("nav img").first().attr("src"),
    $(".logo img").first().attr("src"),
    $('[class*="logo"] img').first().attr("src"),
    $('meta[property="og:image"]').attr("content"),
    $('link[rel="apple-touch-icon"]').attr("href"),
    $('link[rel="icon"]').attr("href"),
  ];

  for (const candidate of candidates) {
    const resolved = resolveAssetUrl(candidate, sourceUrl);
    if (resolved && !resolved.endsWith(".ico")) {
      return resolved;
    }
  }

  return null;
}

function extractBusinessName($: cheerio.CheerioAPI): string {
  const candidates = [
    $('meta[property="og:site_name"]').attr("content"),
    $('meta[name="application-name"]').attr("content"),
    $("title").first().text(),
    $("header h1").first().text(),
    $("header a").first().text(),
    $("h1").first().text(),
    $(".logo").first().text(),
    $("header img").first().attr("alt"),
  ];

  for (const candidate of candidates) {
    const text = candidate?.trim();
    if (!text) {
      continue;
    }

    const cleaned = text
      .split("|")[0]
      ?.split("-")[0]
      ?.split("–")[0]
      ?.trim();

    if (cleaned && cleaned.length >= 2 && cleaned.length <= 80) {
      return cleaned;
    }
  }

  return "";
}

function extractHeadline($: cheerio.CheerioAPI): string | null {
  const candidates = [
    $("section").first().find("h1").first().text(),
    $(".hero h1").first().text(),
    $('[class*="hero"] h1').first().text(),
    $("main h1").first().text(),
    $("h1").first().text(),
  ];

  for (const candidate of candidates) {
    const text = candidate?.trim();
    if (text && text.length >= 4) {
      return text;
    }
  }

  return null;
}

function extractTagline($: cheerio.CheerioAPI): string | null {
  const candidates = [
    $("section").first().find("h2").first().text(),
    $(".hero p").first().text(),
    $('[class*="hero"] p').first().text(),
    $('meta[name="description"]').attr("content"),
    $('meta[property="og:description"]').attr("content"),
    $("main p").first().text(),
  ];

  for (const candidate of candidates) {
    const text = candidate?.trim();
    if (text && text.length >= 8) {
      return text;
    }
  }

  return null;
}

function extractDescription($: cheerio.CheerioAPI): string | null {
  const candidates = [
    $("#about").text(),
    $('[id*="about"]').text(),
    $('[class*="about"]').text(),
    $("section").eq(1).text(),
    $("main p").slice(0, 3).text(),
  ];

  for (const candidate of candidates) {
    const text = candidate?.replace(/\s+/g, " ").trim();
    if (text && text.length >= 40) {
      return text.slice(0, 1200);
    }
  }

  const meta =
    $('meta[name="description"]').attr("content")?.trim() ??
    $('meta[property="og:description"]').attr("content")?.trim();

  return meta && meta.length >= 20 ? meta.slice(0, 1200) : null;
}

function extractServices($: cheerio.CheerioAPI): string[] {
  const services: string[] = [];
  const selectors = [
    '#services li',
    '.services li',
    '[id*="service"] li',
    '[class*="service"] h3',
    '[class*="service"] h4',
    '[class*="service"] li',
    'section[id*="service"] h3',
    'section[id*="service"] h4',
    ".card h3",
    ".grid h3",
  ];

  for (const selector of selectors) {
    $(selector).each((_, element) => {
      const text = $(element).text().trim();
      if (text && text.length <= 80) {
        services.push(text);
      }
    });
  }

  return uniqueStrings(services).slice(0, 8);
}

function extractAdCopy($: cheerio.CheerioAPI): string[] {
  const copy: string[] = [];
  const selectors = [
    ".cta",
    '[class*="cta"]',
    '[class*="banner"]',
    '[class*="promo"]',
    '[class*="hero"] h2',
    '[class*="hero"] strong',
    '[class*="hero"] button',
    $("section").first().find("button"),
  ];

  for (const selector of selectors) {
    $(selector).each((_, element) => {
      const text = $(element).text().trim();
      if (text && text.length >= 4 && text.length <= 160) {
        copy.push(text);
      }
    });
  }

  return uniqueStrings(copy).slice(0, 6);
}

function extractPhone($: cheerio.CheerioAPI, pageText: string): string | null {
  const telHref = $('a[href^="tel:"]').first().attr("href");
  if (telHref) {
    return telHref.replace(/^tel:/i, "").trim();
  }

  const matches = pageText.match(PHONE_REGEX);
  return matches?.[0]?.trim() ?? null;
}

function extractAddress($: cheerio.CheerioAPI, pageText: string): string | null {
  const tagged = $('[itemprop="streetAddress"]').text().trim();
  if (tagged) {
    return tagged;
  }

  const addressNode = $("address").first().text().trim();
  if (addressNode) {
    return addressNode.replace(/\s+/g, " ");
  }

  const addressMatch = pageText.match(
    /\d{1,5}\s+[\w\s.]+\s(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct)\b[^,\n]*/i,
  );

  return addressMatch?.[0]?.trim() ?? null;
}

function extractCity(address: string | null, pageText: string): string {
  if (address) {
    const parts = address.split(",").map((part) => part.trim());
    if (parts.length >= 2) {
      const cityPart = parts[parts.length - 2] ?? parts[0];
      const city = cityPart
        .replace(/\d{5}(?:-\d{4})?/g, "")
        .replace(/\b[A-Z]{2}\b/g, "")
        .trim();

      if (city.length >= 2) {
        return city;
      }
    }
  }

  const cityStateMatch = pageText.match(
    /\b([A-Za-z][A-Za-z\s.'-]{2,30}),\s*([A-Z]{2})\b/,
  );

  if (cityStateMatch?.[1]) {
    return cityStateMatch[1].trim();
  }

  return "Local Area";
}

function inferIndustry(
  businessName: string,
  description: string | null,
  services: string[],
): string {
  const haystack = [
    businessName,
    description ?? "",
    services.join(" "),
  ]
    .join(" ")
    .toLowerCase();

  for (const industry of INDUSTRIES) {
    if (haystack.includes(industry.toLowerCase())) {
      return industry;
    }
  }

  const keywordMap: Array<[string, string[]]> = [
    ["Plumbing", ["plumb", "drain", "sewer"]],
    ["HVAC", ["hvac", "heating", "cooling", "air condition"]],
    ["Electrician", ["electric", "wiring"]],
    ["Roofing", ["roof"]],
    ["Landscaping", ["landscape", "lawn", "garden"]],
    ["Cleaning Service", ["clean", "maid", "janitorial"]],
    ["Restaurant", ["restaurant", "dining", "menu"]],
    ["Hair Salon", ["salon", "haircut", "hair"]],
    ["Dental", ["dental", "dentist"]],
    ["Law Firm", ["law firm", "attorney", "legal"]],
    ["Auto Repair", ["auto repair", "mechanic", "automotive"]],
    ["Real Estate", ["real estate", "realtor", "homes for sale"]],
    ["Marketing Agency", ["marketing", "advertising", "seo"]],
  ];

  for (const [industry, keywords] of keywordMap) {
    if (keywords.some((keyword) => haystack.includes(keyword))) {
      return industry;
    }
  }

  return "General Contractor";
}

export function validateImportedSiteData(
  data: ImportedSiteData,
): { ok: true } | { ok: false; error: string } {
  if (!data.businessName || data.businessName.length < 2) {
    return {
      ok: false,
      error:
        "We couldn't find a business name on that page. Try a URL with a clear company name in the title or header.",
    };
  }

  const hasContent =
    Boolean(data.headline?.trim()) ||
    Boolean(data.tagline?.trim()) ||
    Boolean(data.description?.trim()) ||
    data.services.length > 0;

  if (!hasContent) {
    return {
      ok: false,
      error:
        "We couldn't extract enough information from that site — no headline, description, or services were found. Try a business homepage with more content.",
    };
  }

  return { ok: true };
}

export async function scrapeImportSite(rawUrl: string): Promise<ImportedSiteData> {
  const sourceUrl = normalizeUrl(rawUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let html = "";

  try {
    const response = await fetch(sourceUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; WebMeBot/1.0; +https://webme.io)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`Could not fetch that URL (HTTP ${response.status}).`);
    }

    html = await response.text();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("The website took too long to respond. Try again.");
    }

    throw error instanceof Error
      ? error
      : new Error("Failed to fetch the website.");
  } finally {
    clearTimeout(timeout);
  }

  const $ = cheerio.load(html);
  const pageText = $("body").text().replace(/\s+/g, " ");

  const businessName = extractBusinessName($);
  const headline = extractHeadline($);
  const tagline = extractTagline($);
  const services = extractServices($);
  const description = extractDescription($);
  const phone = extractPhone($, pageText);
  const address = extractAddress($, pageText);
  const adCopy = extractAdCopy($);
  const city = extractCity(address, pageText);
  const industry = inferIndustry(
    businessName,
    [description, headline, tagline].filter(Boolean).join(" "),
    services,
  );
  const logoUrl = extractLogoImageUrl($, sourceUrl);

  return {
    sourceUrl,
    businessName,
    phone,
    headline,
    tagline,
    services,
    description,
    address,
    adCopy,
    industry,
    city,
    logoUrl,
  };
}

export function importedSiteToBusinessProfile(
  imported: ImportedSiteData,
): BusinessProfile {
  const descriptionParts = [
    imported.description,
    imported.adCopy.length > 0
      ? `Prominent ad copy: ${imported.adCopy.join(" | ")}`
      : null,
  ].filter(Boolean);

  return {
    businessName: imported.businessName,
    address: imported.address,
    phone: imported.phone,
    hours: [],
    rating: null,
    reviewCount: null,
    topReviews: [],
    ownerName: null,
    ownerEmail: null,
    services: imported.services,
    description:
      descriptionParts.length > 0 ? descriptionParts.join("\n\n") : null,
    instagramBio: null,
    instagramPosts: [],
    facebookDescription: null,
    yelpCategories: [],
    priceRange: null,
    photos: [],
    brandImageUrls: [],
    website: imported.sourceUrl,
    facebookPosts: [],
    instagramHashtags: [],
    sourceErrors: { websiteScrape: "imported-from-url" },
  };
}

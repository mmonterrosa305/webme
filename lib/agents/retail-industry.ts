/**
 * Retail / product-business detection and search helpers.
 * Service-trade Pixabay patterns ("worker", "technician") must not be used here.
 */

const CURATED_RETAIL_INDUSTRIES = new Set([
  "Boutique",
  "Jewelry Store",
  "Florist",
  "Gift Shop",
]);

const RETAIL_KEYWORDS = [
  "boutique",
  "retail",
  "apparel",
  "clothing",
  "fashion",
  "jersey",
  "jerseys",
  "soccer",
  "sportswear",
  "athletic wear",
  "athletic",
  "merchandise",
  "gift shop",
  "jewelry",
  "florist",
  "shoe",
  "sneakers",
  "store",
  "shop",
  "outfitter",
  "sporting goods",
  "sports apparel",
];

const SERVICE_TRADE_KEYWORDS = [
  "plumb",
  "hvac",
  "electric",
  "roof",
  "landscape",
  "lawn",
  "clean",
  "pest",
  "pool",
  "paint",
  "floor",
  "contractor",
  "hvac",
  "locksmith",
  "garage door",
  "moving",
  "tow",
  "auto repair",
  "mechanic",
  "detail",
];

/** Industries that already have curated Unsplash slots — prefer those over Pixabay. */
export function prefersCuratedIndustryImages(industry: string): boolean {
  const trimmed = industry.trim();
  if (CURATED_RETAIL_INDUSTRIES.has(trimmed)) {
    return true;
  }

  const normalized = trimmed.toLowerCase();
  return (
    normalized.includes("boutique") ||
    normalized.includes("jewelry") ||
    normalized.includes("gift shop") ||
    normalized.includes("florist")
  );
}

/** True for retail / product storefronts (not local service trades). */
export function isRetailLikeIndustry(industry: string): boolean {
  const trimmed = industry.trim();
  if (!trimmed) {
    return false;
  }

  if (CURATED_RETAIL_INDUSTRIES.has(trimmed)) {
    return true;
  }

  const normalized = trimmed.toLowerCase();

  if (SERVICE_TRADE_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return false;
  }

  return RETAIL_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

/**
 * Product-oriented Pixabay queries for retail / free-text industries.
 * Never uses "worker" / "technician" phrasing.
 */
export function buildRetailOrProductSearchQueries(industry: string): string[] {
  const query = industry.trim();
  if (!query) {
    return [];
  }

  const normalized = query.toLowerCase();
  const queries: string[] = [];

  const push = (value: string) => {
    const cleaned = value.trim();
    if (cleaned && !queries.includes(cleaned)) {
      queries.push(cleaned);
    }
  };

  if (normalized.includes("soccer") || normalized.includes("jersey")) {
    push("soccer jersey");
    push("football jersey");
    push("sports apparel");
    push("athletic wear");
    push("soccer kit");
    push("sports clothing store");
  } else if (normalized.includes("boutique") || normalized === "boutique") {
    push("clothing boutique");
    push("fashion boutique store");
    push("apparel retail");
    push("clothing rack store");
    push("fashion shopping");
  } else if (normalized.includes("jewelry")) {
    push("jewelry store display");
    push("jewelry retail");
    push("necklace bracelet shop");
  } else if (normalized.includes("florist") || normalized.includes("flower")) {
    push("florist flower shop");
    push("flower bouquet store");
  } else if (normalized.includes("gift")) {
    push("gift shop retail");
    push("gift store display");
  } else {
    // Free-text product industry: use the words as product search terms.
    push(query);
    push(`${query} store`);
    push(`${query} shop`);
    push(`${query} product`);
    push(`${query} retail`);
  }

  return queries.slice(0, 6);
}

export function looksLikeServiceTradeIndustry(industry: string): boolean {
  const normalized = industry.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return SERVICE_TRADE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

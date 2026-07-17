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

/** Strong product cues in business name/tagline that beat generic curated Boutique imagery. */
const PRODUCT_CUE_PATTERNS: Array<{ match: RegExp; seed: string }> = [
  { match: /\b(soccer|football)\b.*\b(jersey|kit|shirt)s?\b|\b(jersey|kit|shirt)s?\b.*\b(soccer|football)\b/i, seed: "soccer jersey" },
  { match: /\bsoccer\b/i, seed: "soccer apparel" },
  { match: /\bjerseys?\b/i, seed: "sports jersey" },
  { match: /\b(sportswear|athletic wear|athletic apparel)\b/i, seed: "sportswear" },
  { match: /\b(sneakers?|running shoes?)\b/i, seed: "sneakers retail" },
  { match: /\b(streetwear|graphic tee|t-?shirts?)\b/i, seed: "streetwear apparel" },
  { match: /\b(apparel|clothing|fashion)\b/i, seed: "clothing apparel" },
  { match: /\b(sporting goods|sports gear)\b/i, seed: "sporting goods" },
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
 * Detect specific product keywords in business name / tagline.
 * Returns a search seed (e.g. "soccer jersey") or null.
 */
export function extractProductSearchSeed(
  ...texts: Array<string | null | undefined>
): string | null {
  const haystack = texts
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean)
    .join(" ");

  if (!haystack) {
    return null;
  }

  for (const pattern of PRODUCT_CUE_PATTERNS) {
    if (pattern.match.test(haystack)) {
      return pattern.seed;
    }
  }

  return null;
}

/**
 * When Boutique (or other curated retail) is selected but name/tagline
 * clearly describe a specific product, skip curated Unsplash and search instead.
 */
export function shouldUseProductCueImageSearch(
  industry: string,
  businessName?: string | null,
  tagline?: string | null,
): boolean {
  if (!prefersCuratedIndustryImages(industry)) {
    return false;
  }

  return Boolean(extractProductSearchSeed(businessName, tagline));
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

  if (
    normalized.includes("soccer") ||
    normalized.includes("jersey") ||
    normalized.includes("football")
  ) {
    // Prefer "soccer" wording — bare "football jersey" returns American football in Pixabay US results.
    push("soccer jersey");
    push("soccer kit");
    push("soccer shirt");
    push("soccer uniform");
    push("soccer apparel");
    push("soccer clothing");
  } else if (normalized.includes("sneaker")) {
    push("sneakers store");
    push("athletic shoes retail");
    push("sneaker shop");
  } else if (normalized.includes("streetwear")) {
    push("streetwear clothing");
    push("graphic tee apparel");
    push("fashion boutique");
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

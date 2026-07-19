import {
  buildRetailOrProductSearchQueries,
  extractProductSearchSeed,
  isRetailLikeIndustry,
  looksLikeServiceTradeIndustry,
  prefersCuratedIndustryImages,
  shouldUseProductCueImageSearch,
} from "./retail-industry";

const PIXABAY_PHOTO_SEARCH = "https://pixabay.com/api/";

const INDUSTRY_SEARCH_TERMS: Record<string, string[]> = {
  "Pool Service": ["swimming pool", "pool cleaning", "pool maintenance", "backyard pool"],
  Plumbing: ["plumber pipe", "plumbing repair", "pipe fitting", "plumber work"],
  Roofing: ["roofing contractor", "roof repair", "roofer shingles", "roof installation"],
  Electrician: ["electrician wiring", "electrical repair", "electrical panel", "electrician work"],
  HVAC: ["hvac technician", "air conditioning repair", "hvac unit", "heating cooling"],
  Landscaping: ["lawn mowing", "landscaping work", "garden maintenance", "lawn care"],
  "Cleaning Service": ["house cleaning", "cleaning service", "janitor cleaning", "maid service"],
  "Pest Control": ["pest control", "exterminator", "pest inspection", "insect control"],
  Painting: ["house painting", "painter wall", "paint brush wall", "exterior painting"],
  "General Contractor": ["construction worker", "building construction", "contractor work", "renovation"],
  // Retail — product/storefront queries only (never worker/technician).
  Boutique: [
    "clothing boutique",
    "fashion boutique store",
    "apparel retail",
    "clothing rack store",
    "fashion shopping",
  ],
  "Jewelry Store": [
    "jewelry store display",
    "jewelry retail",
    "necklace bracelet shop",
    "jewelry showcase",
  ],
  Florist: ["florist flower shop", "flower bouquet store", "florist retail"],
  "Gift Shop": ["gift shop retail", "gift store display", "souvenir shop"],
};

function getPixabayApiKey(): string | null {
  const key = process.env.PIXABAY_API_KEY?.trim();
  return key || null;
}

export type IndustryPhotoSet = {
  hero: string;
  about: string;
  service1: string;
  service2: string;
  service3: string;
  service4: string;
  gallery1: string;
  gallery2: string;
  gallery3: string;
};

export type FetchIndustryPhotosOptions = {
  businessName?: string | null;
  tagline?: string | null;
};

const GENERIC_STOCK_URL_TERMS = [
  "plant",
  "flower",
  "nature",
  "beach",
  "sunset",
  "mountain",
  "forest",
  "coffee",
  "abstract",
  "handshake",
  "meeting",
  "office",
  "laptop",
  "workspace",
  "teamwork",
  "businesswoman",
  "businessman",
  "ant",
  "insect",
  "macro",
  "bread",
  "bakery",
  "pastry",
  "cake",
  "dessert",
];

function isRelevantPhotoUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return !GENERIC_STOCK_URL_TERMS.some((term) => lower.includes(term));
}

/** Pixabay often tags US football as "football"; drop those for soccer product searches. */
const AMERICAN_FOOTBALL_TAG_RE =
  /\b(american\s*football|nfl|ncaa|quarterback|touchdown|gridiron|super\s*bowl|helmet|linebacker|wide\s*receiver|cheerleader)\b/i;

function isSoccerCompatibleHit(tags: string | undefined): boolean {
  if (!tags) return true;
  const lower = tags.toLowerCase();
  // Reject American football stock; keep if also explicitly tagged soccer.
  if (AMERICAN_FOOTBALL_TAG_RE.test(lower) && !/\bsoccer\b/.test(lower)) {
    return false;
  }
  return true;
}

type PixabayHit = {
  largeImageURL?: string;
  webformatURL?: string;
  tags?: string;
};

async function searchPixabayPhotos(
  query: string,
  count: number,
  options?: { category?: string; soccerOnly?: boolean; shuffle?: boolean },
): Promise<string[]> {
  const apiKey = getPixabayApiKey();
  if (!apiKey) return [];

  try {
    const params = new URLSearchParams({
      key: apiKey,
      q: query,
      image_type: "photo",
      orientation: "horizontal",
      safesearch: "true",
      order: "popular",
      per_page: String(Math.min(count * 3, 60)),
      min_width: "800",
    });

    if (options?.category) {
      params.set("category", options.category);
    }

    const response = await fetch(`${PIXABAY_PHOTO_SEARCH}?${params}`);
    if (!response.ok) return [];

    const data = (await response.json()) as { hits?: PixabayHit[] };

    let hits = (data.hits ?? []).filter((hit) => {
      const url = hit.largeImageURL ?? hit.webformatURL;
      if (!url || !isRelevantPhotoUrl(url)) return false;
      if (options?.soccerOnly && !isSoccerCompatibleHit(hit.tags)) return false;
      return true;
    });

    if (options?.shuffle !== false) {
      for (let i = hits.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [hits[i], hits[j]] = [hits[j], hits[i]];
      }
    }

    return hits
      // TODO(images): Pixabay largeImageURL /get/... links expire (HTTP 400 over
      // time). Prefer Unsplash permanent URLs or re-host into Supabase
      // client-assets during build so live sites don't lose their photos.
      .map((hit) => hit.largeImageURL ?? hit.webformatURL ?? null)
      .filter((url): url is string => Boolean(url))
      .slice(0, count);
  } catch {
    return [];
  }
}

export function getIndustrySearchQueries(industry: string): string[] {
  const query = industry.trim();
  if (!query) {
    return [];
  }

  if (INDUSTRY_SEARCH_TERMS[query]) {
    return INDUSTRY_SEARCH_TERMS[query];
  }

  // Retail / product businesses — never use worker/technician phrasing.
  if (isRetailLikeIndustry(query)) {
    return buildRetailOrProductSearchQueries(query);
  }

  // Unknown free-text that isn't a clear service trade: product-style queries.
  if (!looksLikeServiceTradeIndustry(query)) {
    return buildRetailOrProductSearchQueries(query);
  }

  // Service-trade fallback only.
  return [
    `${query} worker`,
    `${query} technician`,
    `${query} equipment`,
    `${query} professional work`,
  ];
}

async function collectPhotoSet(
  queries: string[],
  options?: { soccerOnly?: boolean },
): Promise<IndustryPhotoSet | null> {
  const allUrls: string[] = [];
  const soccerOnly = Boolean(options?.soccerOnly);

  for (const q of queries) {
    if (allUrls.length >= 9) break;
    const results = await searchPixabayPhotos(q, 9, {
      soccerOnly,
      // Keep popular order for product cues so top hits stay on-topic.
      shuffle: !soccerOnly,
    });
    for (const url of results) {
      if (!allUrls.includes(url)) allUrls.push(url);
    }
  }

  if (allUrls.length < 9) return null;

  return {
    hero: allUrls[0],
    about: allUrls[1],
    service1: allUrls[2],
    service2: allUrls[3],
    service3: allUrls[4],
    service4: allUrls[5],
    gallery1: allUrls[6],
    gallery2: allUrls[7],
    gallery3: allUrls[8],
  };
}

/**
 * Fetch Pixabay photos for an industry.
 * Returns null for curated retail industries (caller uses Unsplash) unless
 * business name/tagline contain strong product cues (e.g. soccer jersey).
 */
export async function fetchIndustryPhotos(
  industry: string,
  options?: FetchIndustryPhotosOptions,
): Promise<IndustryPhotoSet | null> {
  const query = industry.trim();
  if (!query) return null;

  const productSeed = extractProductSearchSeed(
    options?.businessName,
    options?.tagline,
  );

  // Boutique + "Soccer Jerseys" / "Authentic Soccer Jerseys" → product search, not curated.
  if (
    shouldUseProductCueImageSearch(
      query,
      options?.businessName,
      options?.tagline,
    ) &&
    productSeed
  ) {
    const productPhotos = await collectPhotoSet(
      buildRetailOrProductSearchQueries(productSeed),
      {
        soccerOnly: /\bsoccer\b/i.test(productSeed),
      },
    );
    if (productPhotos) {
      return productPhotos;
    }
    // Fall through to curated if product search cannot fill 9 slots.
  }

  // Prefer curated Unsplash RETAIL_STAFF (etc.) over noisy Pixabay for known retail.
  if (prefersCuratedIndustryImages(query)) {
    return null;
  }

  return collectPhotoSet(getIndustrySearchQueries(query));
}

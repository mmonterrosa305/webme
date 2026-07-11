import { getIndustrySearchQueries } from "./fetch-pixabay-photos";

const PEXELS_PHOTO_SEARCH = "https://api.pexels.com/v1/search";

function getPexelsApiKey(): string | null {
  const key = process.env.PEXELS_API_KEY?.trim();
  return key || null;
}

type PexelsPhoto = {
  id: number;
  src?: {
    original?: string;
    large2x?: string;
    large?: string;
    medium?: string;
  };
};

type PexelsSearchResponse = {
  photos?: PexelsPhoto[];
};

function pickPhotoUrl(photo: PexelsPhoto): string | null {
  return (
    photo.src?.large2x ||
    photo.src?.large ||
    photo.src?.original ||
    photo.src?.medium ||
    null
  );
}

async function searchPexelsPhotos(
  query: string,
  count: number,
): Promise<string[]> {
  const apiKey = getPexelsApiKey();
  if (!apiKey) {
    return [];
  }

  try {
    const params = new URLSearchParams({
      query,
      per_page: String(Math.min(Math.max(count * 3, 15), 40)),
      orientation: "landscape",
    });

    const response = await fetch(`${PEXELS_PHOTO_SEARCH}?${params.toString()}`, {
      headers: {
        Authorization: apiKey,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as PexelsSearchResponse;
    const urls = (data.photos ?? [])
      .map(pickPhotoUrl)
      .filter((url): url is string => Boolean(url));

    for (let i = urls.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [urls[i], urls[j]] = [urls[j], urls[i]];
    }

    return urls.slice(0, count);
  } catch {
    return [];
  }
}

const SLOT_QUERY_SUFFIX: Record<string, string> = {
  "hero-image": "professional",
  "about-image": "team work",
  "service-image-1": "service work",
  "service-image-2": "technician",
  "service-image-3": "equipment",
  "service-image-4": "maintenance",
  "gallery-image-1": "results",
  "gallery-image-2": "before after",
  "gallery-image-3": "finished work",
};

/** Fetch a single replacement photo URL for an industry image slot. */
export async function fetchReplacementPhotoUrl(options: {
  industry: string;
  slot: string;
  excludeUrl?: string | null;
}): Promise<string | null> {
  const industry = options.industry.trim();
  if (!industry) {
    return null;
  }

  const baseQueries = getIndustrySearchQueries(industry);
  const suffix = SLOT_QUERY_SUFFIX[options.slot] ?? "professional";
  const queries = [
    ...baseQueries.map((query) => `${query} ${suffix}`),
    ...baseQueries,
    `${industry} ${suffix}`,
    industry,
  ];

  const seen = new Set<string>();
  const candidates: string[] = [];

  for (const query of queries) {
    if (candidates.length >= 12) {
      break;
    }

    const results = await searchPexelsPhotos(query, 8);
    for (const url of results) {
      if (seen.has(url)) {
        continue;
      }
      if (options.excludeUrl && url === options.excludeUrl) {
        continue;
      }
      seen.add(url);
      candidates.push(url);
    }
  }

  if (!candidates.length) {
    return null;
  }

  return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
}

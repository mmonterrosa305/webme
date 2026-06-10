const PIXABAY_PHOTO_SEARCH = "https://pixabay.com/api/";

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
];

function isRelevantPhotoUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return !GENERIC_STOCK_URL_TERMS.some((term) => lower.includes(term));
}

async function searchPixabayPhotos(
  query: string,
  count: number,
  category?: string,
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

    if (category) {
      params.set("category", category);
    }

    const response = await fetch(`${PIXABAY_PHOTO_SEARCH}?${params}`);
    if (!response.ok) return [];

    const data = await response.json() as {
      hits?: Array<{ largeImageURL?: string; webformatURL?: string }>;
    };

    const urls = (data.hits ?? [])
      .map(hit => hit.largeImageURL ?? hit.webformatURL ?? null)
      .filter((url): url is string => Boolean(url))
      .filter(isRelevantPhotoUrl);

    // Shuffle and return
    for (let i = urls.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [urls[i], urls[j]] = [urls[j], urls[i]];
    }

    return urls.slice(0, count);
  } catch {
    return [];
  }
}

export async function fetchIndustryPhotos(industry: string): Promise<IndustryPhotoSet | null> {
  const query = industry.trim();
  if (!query) return null;

  // Search for 9 unique photos — try specific queries first
  const queries = [
    `${query} worker`,
    `${query} technician`,
    `${query} equipment`,
    `${query} professional work`,
  ];

  const allUrls: string[] = [];

  for (const q of queries) {
    if (allUrls.length >= 9) break;
    const results = await searchPixabayPhotos(q, 9, "industry");
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

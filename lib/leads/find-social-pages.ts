type CustomSearchItem = {
  link?: string;
  title?: string;
};

function getCustomSearchCredentials(): { apiKey: string; cx: string } | null {
  const apiKey =
    process.env.GOOGLE_CUSTOM_SEARCH_API_KEY?.trim() ??
    process.env.GOOGLE_PLACES_API_KEY?.trim() ??
    null;
  const cx = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID?.trim() ?? null;

  if (!apiKey || apiKey.startsWith("your_") || !cx || cx.startsWith("your_")) {
    return null;
  }

  return { apiKey, cx };
}

async function runCustomSearch(
  query: string,
  numResults = 3,
): Promise<CustomSearchItem[]> {
  const credentials = getCustomSearchCredentials();

  if (!credentials) {
    return [];
  }

  const params = new URLSearchParams({
    key: credentials.apiKey,
    cx: credentials.cx,
    q: query,
    num: String(Math.min(Math.max(numResults, 1), 10)),
  });

  const response = await fetch(
    `https://customsearch.googleapis.com/customsearch/v1?${params}`,
  );

  if (!response.ok) {
    throw new Error(`Custom Search failed: ${response.status}`);
  }

  const data = (await response.json()) as { items?: CustomSearchItem[] };
  return data.items ?? [];
}

const IGNORED_BUSINESS_NAME_WORDS = new Set([
  "the",
  "and",
  "inc",
  "llc",
  "co",
]);

function getSignificantBusinessNameTokens(businessName: string): string[] {
  return businessName
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(
      (token) =>
        token.length >= 2 && !IGNORED_BUSINESS_NAME_WORDS.has(token),
    );
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function socialContentMatchesBusiness(
  businessName: string,
  link: string,
  title?: string,
): boolean {
  const tokens = getSignificantBusinessNameTokens(businessName);
  const haystack = normalizeText(`${link} ${title ?? ""}`);

  if (tokens.length === 0) {
    return true;
  }

  return tokens.some((token) => haystack.includes(token));
}

function isFacebookProfileUrl(link: string): boolean {
  try {
    const url = new URL(link);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();

    if (host !== "facebook.com" && host !== "m.facebook.com") {
      return false;
    }

    const path = url.pathname.toLowerCase();
    if (
      path === "/" ||
      /^\/(login|help|watch|groups|events|marketplace|share|sharer|policies|privacy|photo\.php|story\.php)/.test(
        path,
      )
    ) {
      return false;
    }

    return /\/people\/|\/pages\/|\/pg\/|\/profile\.php|\/[a-z0-9.\-_]+/.test(
      path,
    );
  } catch {
    return false;
  }
}

function isInstagramProfileUrl(link: string): boolean {
  try {
    const url = new URL(link);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();

    if (host !== "instagram.com" && host !== "www.instagram.com") {
      return false;
    }

    const path = url.pathname.toLowerCase();
    if (
      path === "/" ||
      /^\/(explore|accounts|about|legal|developer|directory|stories|reels|p|tv)\/?/.test(
        path,
      )
    ) {
      return false;
    }

    return /^\/[a-z0-9._]+\/?$/.test(path);
  } catch {
    return false;
  }
}

function findMatchingSocialLink(
  items: CustomSearchItem[],
  businessName: string,
  network: "facebook" | "instagram",
): string | null {
  const matcher =
    network === "facebook" ? isFacebookProfileUrl : isInstagramProfileUrl;

  for (const item of items) {
    if (
      item.link &&
      matcher(item.link) &&
      socialContentMatchesBusiness(businessName, item.link, item.title)
    ) {
      return item.link;
    }
  }

  return null;
}

export async function findSocialPagesForBusiness(
  businessName: string,
): Promise<{ facebookUrl: string | null; instagramUrl: string | null }> {
  const credentials = getCustomSearchCredentials();

  if (!credentials) {
    return { facebookUrl: null, instagramUrl: null };
  }

  const [facebookItems, instagramItems] = await Promise.all([
    runCustomSearch(`${businessName} facebook`, 3),
    runCustomSearch(`${businessName} instagram`, 3),
  ]);

  return {
    facebookUrl: findMatchingSocialLink(
      facebookItems,
      businessName,
      "facebook",
    ),
    instagramUrl: findMatchingSocialLink(
      instagramItems,
      businessName,
      "instagram",
    ),
  };
}

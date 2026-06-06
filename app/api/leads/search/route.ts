import { NextResponse } from "next/server";

import type { LeadSearchResult } from "@/lib/leads/types";

const PLACES_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const PLACES_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.rating",
  "places.userRatingCount",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "nextPageToken",
].join(",");

type PlacesTextSearchPlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  nationalPhoneNumber?: string;
  websiteUri?: string;
};

type PlacesTextSearchResponse = {
  places?: PlacesTextSearchPlace[];
  nextPageToken?: string;
  error?: { message?: string; status?: string };
};

function getGooglePlacesApiKey(): string {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();

  if (!key || key.startsWith("your_")) {
    throw new Error("Missing GOOGLE_PLACES_API_KEY environment variable.");
  }

  return key;
}

function getOptionalCustomSearchApiKey(): string | null {
  const key =
    process.env.GOOGLE_CUSTOM_SEARCH_API_KEY?.trim() ??
    process.env.GOOGLE_PLACES_API_KEY?.trim() ??
    null;

  if (!key || key.startsWith("your_")) {
    return null;
  }

  return key;
}

function getOptionalCustomSearchEngineId(): string | null {
  const value = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID?.trim();

  if (!value || value.startsWith("your_")) {
    return null;
  }

  return value;
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function extractDomainStem(urlString: string): string | null {
  try {
    const url = new URL(urlString.startsWith("http") ? urlString : `https://${urlString}`);
    const hostname = url.hostname.replace(/^www\./, "");
    const parts = hostname.split(".");

    if (parts.length < 2) {
      return normalizeText(hostname);
    }

    return normalizeText(parts[parts.length - 2] ?? hostname);
  } catch {
    return null;
  }
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

function getNormalizedHostname(urlString: string): string | null {
  try {
    const url = new URL(
      urlString.startsWith("http") ? urlString : `https://${urlString}`,
    );

    return url.hostname.replace(/^www\./, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  } catch {
    return null;
  }
}

function domainContainsBusinessNameWord(
  businessName: string,
  urlString: string,
): boolean {
  const hostname = getNormalizedHostname(urlString);
  const tokens = getSignificantBusinessNameTokens(businessName);

  if (!hostname || tokens.length === 0) {
    return false;
  }

  return tokens.some((token) => hostname.includes(token));
}

function domainMatchesBusinessName(
  businessName: string,
  domainUrl: string,
): boolean {
  const domainStem = extractDomainStem(domainUrl);

  if (!domainStem) {
    return false;
  }

  const normalizedBusiness = normalizeText(businessName);

  if (normalizedBusiness.includes(domainStem) || domainStem.includes(normalizedBusiness)) {
    return true;
  }

  const businessTokens = businessName
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3);

  if (businessTokens.length === 0) {
    return false;
  }

  const matchedTokens = businessTokens.filter((token) =>
    domainStem.includes(token),
  );

  return matchedTokens.length >= Math.min(2, businessTokens.length);
}

async function runCustomSearch(
  query: string,
  numResults: number,
): Promise<Array<{ link?: string }>> {
  const apiKey = getOptionalCustomSearchApiKey();
  const cx = getOptionalCustomSearchEngineId();

  if (!apiKey || !cx) {
    return [];
  }

  const params = new URLSearchParams({
    key: apiKey,
    cx,
    q: query,
    num: String(Math.min(Math.max(numResults, 1), 10)),
  });

  const response = await fetch(
    `https://customsearch.googleapis.com/customsearch/v1?${params}`,
  );

  if (!response.ok) {
    throw new Error(`Custom Search failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    items?: Array<{ link?: string }>;
  };

  return data.items ?? [];
}

async function verifyNoWebsiteWithCustomSearch(
  businessName: string,
): Promise<string | null> {
  const items = await runCustomSearch(businessName, 3);

  for (const item of items.slice(0, 3)) {
    if (item.link && domainContainsBusinessNameWord(businessName, item.link)) {
      return item.link;
    }
  }

  return null;
}

async function verifyWebsiteWithCustomSearch(
  businessName: string,
  location: string,
): Promise<string | false | null> {
  const apiKey = getOptionalCustomSearchApiKey();
  const cx = getOptionalCustomSearchEngineId();

  if (!apiKey || !cx) {
    return null;
  }

  const items = await runCustomSearch(
    `${businessName} ${location} official website`,
    1,
  );
  const topResult = items[0]?.link;

  if (!topResult) {
    return false;
  }

  return domainMatchesBusinessName(businessName, topResult) ? topResult : false;
}

async function searchGooglePlaces(
  apiKey: string,
  query: string,
  maxPages = 3,
): Promise<PlacesTextSearchPlace[]> {
  const allResults: PlacesTextSearchPlace[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < maxPages; page++) {
    const body: { textQuery: string; pageSize: number; pageToken?: string } = {
      textQuery: query,
      pageSize: 20,
    };

    if (pageToken) {
      body.pageToken = pageToken;
    }

    const response = await fetch(PLACES_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": PLACES_FIELD_MASK,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const message = await response.text();

      throw new Error(
        `Google Places search failed: ${response.status} ${message}`,
      );
    }

    const data = (await response.json()) as PlacesTextSearchResponse;

    if (data.error?.message) {
      throw new Error(data.error.message);
    }

    allResults.push(...(data.places ?? []));
    pageToken = data.nextPageToken;

    if (!pageToken) {
      break;
    }
  }

  return allResults;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const location =
      typeof body.city === "string" ? body.city.trim() : "";
    const industry = typeof body.industry === "string" ? body.industry.trim() : "";

    if (!location || !industry) {
      return NextResponse.json(
        { error: "city or zip code and industry are required." },
        { status: 400 },
      );
    }

    const apiKey = getGooglePlacesApiKey();
    const allResults = await searchGooglePlaces(
      apiKey,
      `${industry} in ${location}`,
    );

    const customSearchFlagged: Array<{
      businessName: string;
      matchedUrl: string;
    }> = [];

    const leads: LeadSearchResult[] = await Promise.all(
      allResults.map(async (place) => {
        const businessName = place.displayName?.text ?? "Unknown Business";
        const googleWebsite = place.websiteUri ?? null;
        const phone = place.nationalPhoneNumber ?? null;

        if (!googleWebsite) {
          let customSearchMatch: string | null = null;

          try {
            customSearchMatch = await verifyNoWebsiteWithCustomSearch(
              businessName,
            );
          } catch (verifyError) {
            console.error(
              "[leads/search] Custom Search verification failed for no-website business:",
              {
                businessName,
                error:
                  verifyError instanceof Error
                    ? verifyError.message
                    : verifyError,
              },
            );
          }

          if (customSearchMatch) {
            customSearchFlagged.push({
              businessName,
              matchedUrl: customSearchMatch,
            });

            console.log(
              "[leads/search] Flagged via Custom Search (no_website → has_site_review):",
              {
                businessName,
                matchedUrl: customSearchMatch,
              },
            );

            return {
              placeId: place.id ?? crypto.randomUUID(),
              businessName,
              city: location,
              industry,
              address: place.formattedAddress ?? null,
              phone,
              rating: place.rating ?? null,
              reviewCount: place.userRatingCount ?? null,
              website: customSearchMatch,
              websiteStatus: "has_site_review",
            };
          }

          return {
            placeId: place.id ?? crypto.randomUUID(),
            businessName,
            city: location,
            industry,
            address: place.formattedAddress ?? null,
            phone,
            rating: place.rating ?? null,
            reviewCount: place.userRatingCount ?? null,
            website: null,
            websiteStatus: "no_website",
          };
        }

        let verificationResult: string | false | null = null;

        try {
          verificationResult = await verifyWebsiteWithCustomSearch(
            businessName,
            location,
          );
        } catch {
          verificationResult = null;
        }

        return {
          placeId: place.id ?? crypto.randomUUID(),
          businessName,
          city: location,
          industry,
          address: place.formattedAddress ?? null,
          phone,
          rating: place.rating ?? null,
          reviewCount: place.userRatingCount ?? null,
          website:
            typeof verificationResult === "string"
              ? verificationResult
              : googleWebsite,
          websiteStatus:
            typeof verificationResult === "string"
              ? "has_site_review"
              : "has_site",
        };
      }),
    );

    if (customSearchFlagged.length > 0) {
      console.log("[leads/search] Custom Search flagged businesses summary:", {
        count: customSearchFlagged.length,
        businesses: customSearchFlagged,
      });
    } else {
      console.log(
        "[leads/search] Custom Search flagged 0 no-website businesses for review.",
      );
    }

    return NextResponse.json({ leads });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to search leads.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

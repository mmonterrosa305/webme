import { NextResponse } from "next/server";

import type { LeadSearchResult } from "@/lib/leads/types";

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

async function verifyWebsiteWithCustomSearch(
  businessName: string,
  location: string,
): Promise<string | false | null> {
  const apiKey = getOptionalCustomSearchApiKey();
  const cx = getOptionalCustomSearchEngineId();

  if (!apiKey || !cx) {
    return null;
  }

  const params = new URLSearchParams({
    key: apiKey,
    cx,
    q: `${businessName} ${location} official website`,
    num: "1",
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

  const topResult = data.items?.[0]?.link;

  if (!topResult) {
    return false;
  }

  return domainMatchesBusinessName(businessName, topResult) ? topResult : false;
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

    const response = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": getGooglePlacesApiKey(),
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.rating,places.userRatingCount,places.websiteUri",
        },
        body: JSON.stringify({
          textQuery: `${industry} businesses in ${location}`,
          maxResultCount: 20,
        }),
      },
    );

    if (!response.ok) {
      const message = await response.text();

      throw new Error(
        `Google Places search failed: ${response.status} ${message}`,
      );
    }

    const data = (await response.json()) as {
      places?: Array<{
        id?: string;
        displayName?: { text?: string };
        formattedAddress?: string;
        nationalPhoneNumber?: string;
        rating?: number;
        userRatingCount?: number;
        websiteUri?: string;
      }>;
    };

    const leads: LeadSearchResult[] = await Promise.all(
      (data.places ?? []).map(async (place) => {
        const businessName = place.displayName?.text ?? "Unknown Business";

        if (place.websiteUri) {
          return {
            placeId: place.id ?? crypto.randomUUID(),
            businessName,
            city: location,
            industry,
            address: place.formattedAddress ?? null,
            phone: place.nationalPhoneNumber ?? null,
            rating: place.rating ?? null,
            reviewCount: place.userRatingCount ?? null,
            website: place.websiteUri,
            websiteStatus: "has_site",
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
          phone: place.nationalPhoneNumber ?? null,
          rating: place.rating ?? null,
          reviewCount: place.userRatingCount ?? null,
          website: typeof verificationResult === "string" ? verificationResult : null,
          websiteStatus:
            typeof verificationResult === "string"
              ? "has_site_review"
              : verificationResult === false
                ? "no_website"
                : "has_site_review",
        };
      }),
    );

    return NextResponse.json({ leads });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to search leads.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

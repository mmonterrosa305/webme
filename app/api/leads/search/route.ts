import { NextResponse } from "next/server";

import type { LeadSearchResult } from "@/lib/leads/types";
import { createAdminClient } from "@/lib/supabase/admin";

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

async function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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
    const allResults: Array<{
      place_id?: string;
      name?: string;
      formatted_address?: string;
      rating?: number;
      user_ratings_total?: number;
    }> = [];
    let nextPageToken: string | undefined;
    let pageCount = 0;

    do {
      const params = new URLSearchParams({
        key: apiKey,
        query: `${industry} in ${location}`,
      });

      if (nextPageToken) {
        params.set("pagetoken", nextPageToken);
      }

      if (pageCount > 0) {
        await sleep(2000);
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`,
      );

      if (!response.ok) {
        const message = await response.text();

        throw new Error(
          `Google Places search failed: ${response.status} ${message}`,
        );
      }

      const data = (await response.json()) as {
        results?: Array<{
          place_id?: string;
          name?: string;
          formatted_address?: string;
          rating?: number;
          user_ratings_total?: number;
        }>;
        next_page_token?: string;
        status?: string;
        error_message?: string;
      };

      if (
        data.status &&
        data.status !== "OK" &&
        data.status !== "ZERO_RESULTS"
      ) {
        throw new Error(
          data.error_message ?? `Google Places status: ${data.status}`,
        );
      }

      allResults.push(...(data.results ?? []));
      nextPageToken = data.next_page_token;
      pageCount += 1;
    } while (nextPageToken && pageCount < 3);

    const leads: LeadSearchResult[] = await Promise.all(
      allResults.map(async (place) => {
        const businessName = place.name ?? "Unknown Business";
        let googleWebsite: string | null = null;
        let phone: string | null = null;

        if (place.place_id) {
          try {
            const detailsParams = new URLSearchParams({
              key: apiKey,
              place_id: place.place_id,
              fields: "website,formatted_phone_number",
            });
            const detailsResponse = await fetch(
              `https://maps.googleapis.com/maps/api/place/details/json?${detailsParams}`,
            );

            if (detailsResponse.ok) {
              const detailsData = (await detailsResponse.json()) as {
                result?: {
                  website?: string;
                  formatted_phone_number?: string;
                };
              };

              googleWebsite = detailsData.result?.website ?? null;
              phone = detailsData.result?.formatted_phone_number ?? null;
            }
          } catch {
            googleWebsite = null;
          }
        }

        if (!googleWebsite) {
          return {
            placeId: place.place_id ?? crypto.randomUUID(),
            businessName,
            city: location,
            industry,
            address: place.formatted_address ?? null,
            phone,
            rating: place.rating ?? null,
            reviewCount: place.user_ratings_total ?? null,
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
          placeId: place.place_id ?? crypto.randomUUID(),
          businessName,
          city: location,
          industry,
          address: place.formatted_address ?? null,
          phone,
          rating: place.rating ?? null,
          reviewCount: place.user_ratings_total ?? null,
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

    try {
      const supabase = createAdminClient();
      const rows = leads.map((lead) => ({
        business_name: lead.businessName,
        city: lead.city,
        industry: lead.industry,
        address: lead.address,
        phone: lead.phone,
        has_website: lead.websiteStatus === "has_site",
        existing_website_url: lead.website,
        status: "new" as const,
      }));

      const { error: upsertError } = await supabase.from("leads").upsert(rows, {
        onConflict: "business_name,city",
        ignoreDuplicates: true,
      });

      if (upsertError) {
        console.error("Failed to save leads to Supabase:", upsertError.message);
      }
    } catch (saveError) {
      console.error(
        "Failed to save leads to Supabase:",
        saveError instanceof Error ? saveError.message : saveError,
      );
    }

    return NextResponse.json({ leads });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to search leads.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

import type { LeadSearchResult } from "@/lib/leads/types";

function getGooglePlacesApiKey(): string {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();

  if (!key || key.startsWith("your_")) {
    throw new Error("Missing GOOGLE_PLACES_API_KEY environment variable.");
  }

  return key;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const city = typeof body.city === "string" ? body.city.trim() : "";
    const industry = typeof body.industry === "string" ? body.industry.trim() : "";

    if (!city || !industry) {
      return NextResponse.json(
        { error: "city and industry are required." },
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
          textQuery: `${industry} businesses in ${city}`,
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

    const leads: LeadSearchResult[] = (data.places ?? [])
      .filter((place) => !place.websiteUri)
      .map((place) => ({
        placeId: place.id ?? crypto.randomUUID(),
        businessName: place.displayName?.text ?? "Unknown Business",
        city,
        industry,
        address: place.formattedAddress ?? null,
        phone: place.nationalPhoneNumber ?? null,
        rating: place.rating ?? null,
        reviewCount: place.userRatingCount ?? null,
        website: place.websiteUri ?? null,
      }));

    return NextResponse.json({ leads });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to search leads.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

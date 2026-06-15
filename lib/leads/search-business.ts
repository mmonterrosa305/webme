import { INDUSTRIES } from "@/lib/agents/site-options";
import { scrapeImportSite } from "@/lib/agents/scrape-import-site";

import type {
  BusinessSearchResult,
  BusinessSearchWebsiteData,
} from "./business-search-types";

const PLACES_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const PLACES_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.regularOpeningHours.weekdayDescriptions",
  "places.rating",
  "places.userRatingCount",
  "places.websiteUri",
  "places.editorialSummary",
  "places.types",
].join(",");

type PlacesSearchResponse = {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    nationalPhoneNumber?: string;
    regularOpeningHours?: { weekdayDescriptions?: string[] };
    rating?: number;
    userRatingCount?: number;
    websiteUri?: string;
    editorialSummary?: { text?: string };
    types?: string[];
  }>;
  error?: { message?: string };
};

function getGooglePlacesApiKey(): string {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();

  if (!key || key.startsWith("your_")) {
    throw new Error("Missing GOOGLE_PLACES_API_KEY environment variable.");
  }

  return key;
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed || seen.has(trimmed.toLowerCase())) {
      continue;
    }

    seen.add(trimmed.toLowerCase());
    result.push(trimmed);
  }

  return result;
}

function humanizePlaceType(type: string): string {
  return type
    .replace(/^establishment$|^point_of_interest$/i, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function inferIndustry(
  businessName: string,
  description: string | null,
  services: string[],
): string {
  const haystack = [businessName, description ?? "", services.join(" ")]
    .join(" ")
    .toLowerCase();

  for (const industry of INDUSTRIES) {
    if (haystack.includes(industry.toLowerCase())) {
      return industry;
    }
  }

  const keywordMap: Array<[string, string[]]> = [
    ["Plumbing", ["plumb", "drain", "sewer"]],
    ["HVAC", ["hvac", "heating", "cooling", "air condition"]],
    ["Electrician", ["electric", "wiring"]],
    ["Roofing", ["roof"]],
    ["Landscaping", ["landscape", "lawn", "garden"]],
    ["Pool Service", ["pool", "spa"]],
    ["Cleaning Service", ["clean", "maid", "janitorial"]],
    ["Restaurant", ["restaurant", "dining", "menu"]],
    ["Hair Salon", ["salon", "haircut", "hair"]],
    ["Dental", ["dental", "dentist"]],
    ["Law Firm", ["law firm", "attorney", "legal"]],
    ["Auto Repair", ["auto repair", "mechanic", "automotive"]],
    ["Real Estate", ["real estate", "realtor", "homes for sale"]],
    ["Marketing Agency", ["marketing", "advertising", "seo"]],
  ];

  for (const [industry, keywords] of keywordMap) {
    if (keywords.some((keyword) => haystack.includes(keyword))) {
      return industry;
    }
  }

  return "General Contractor";
}

async function scrapeWebsiteData(
  websiteUrl: string,
): Promise<BusinessSearchWebsiteData> {
  try {
    const imported = await scrapeImportSite(websiteUrl);

    return {
      headline: imported.headline,
      tagline: imported.tagline,
      services: imported.services,
      description: imported.description,
      adCopy: imported.adCopy,
      logoUrl: imported.logoUrl,
    };
  } catch (error) {
    return {
      headline: null,
      tagline: null,
      services: [],
      description: null,
      adCopy: [],
      logoUrl: null,
      scrapeError:
        error instanceof Error
          ? error.message
          : "Failed to scrape website content.",
    };
  }
}

export async function searchBusinessByNameAndCity({
  businessName,
  city,
}: {
  businessName: string;
  city: string;
}): Promise<BusinessSearchResult | null> {
  const apiKey = getGooglePlacesApiKey();

  const response = await fetch(PLACES_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": PLACES_FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: `${businessName} ${city}`,
      maxResultCount: 1,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Google Places search failed: ${response.status} ${message}`);
  }

  const data = (await response.json()) as PlacesSearchResponse;

  if (data.error?.message) {
    throw new Error(data.error.message);
  }

  const place = data.places?.[0];

  if (!place?.id) {
    return null;
  }

  const resolvedName = place.displayName?.text?.trim() || businessName.trim();
  const placeServices = uniqueStrings(
    (place.types ?? [])
      .map(humanizePlaceType)
      .filter((type) => type.length >= 3),
  );

  const website = place.websiteUri?.trim() || null;
  const websiteData = website ? await scrapeWebsiteData(website) : null;

  const services = uniqueStrings([
    ...placeServices,
    ...(websiteData?.services ?? []),
  ]);

  const description = uniqueStrings([
    place.editorialSummary?.text ?? null,
    websiteData?.description ?? null,
  ]).join("\n\n") || null;

  const industry = website
    ? inferIndustry(
        resolvedName,
        [description, websiteData?.headline, websiteData?.tagline]
          .filter(Boolean)
          .join(" "),
        services,
      )
    : inferIndustry(resolvedName, description, services);

  return {
    placeId: place.id,
    businessName: resolvedName,
    city: city.trim(),
    industry,
    phone: place.nationalPhoneNumber?.trim() || null,
    address: place.formattedAddress?.trim() || null,
    website,
    rating: place.rating ?? null,
    reviewCount: place.userRatingCount ?? null,
    hours: place.regularOpeningHours?.weekdayDescriptions ?? [],
    description,
    services,
    websiteData,
  };
}

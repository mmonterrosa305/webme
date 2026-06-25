export type GoogleReview = {
  authorName: string;
  rating: number;
  text: string;
  publishedAt: string;
};

export type FetchGoogleReviewsResult = {
  placeId: string | null;
  reviews: GoogleReview[];
};

export const MIN_DISPLAY_REVIEW_RATING = 4;

export function filterGoogleReviewsForDisplay(
  reviews: GoogleReview[],
  maxReviews = 5,
): GoogleReview[] {
  return reviews
    .filter((review) => review.rating >= MIN_DISPLAY_REVIEW_RATING)
    .slice(0, maxReviews);
}

type FetchGoogleReviewsInput = {
  placeId?: string | null;
  businessName: string;
  city: string;
  maxReviews?: number;
};

function getGooglePlacesApiKey(): string | null {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();

  if (!key || key.startsWith("your_")) {
    return null;
  }

  return key;
}

function clampRating(value?: number): number {
  const rating = Math.round(value ?? 5);
  return Math.min(5, Math.max(1, rating));
}

function formatPublishDate(
  publishTime?: string,
  relativeDescription?: string,
): string {
  if (relativeDescription?.trim()) {
    return relativeDescription.trim();
  }

  if (!publishTime?.trim()) {
    return "";
  }

  const date = new Date(publishTime);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`${response.status} ${message}`);
  }

  return (await response.json()) as T;
}

async function resolvePlaceId(
  apiKey: string,
  input: FetchGoogleReviewsInput,
): Promise<string | null> {
  if (input.placeId?.trim()) {
    return input.placeId.trim();
  }

  const searchData = await fetchJson<{
    places?: Array<{ id?: string }>;
  }>("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id",
    },
    body: JSON.stringify({
      textQuery: `${input.businessName.trim()} ${input.city.trim()}`,
      maxResultCount: 1,
    }),
  });

  return searchData.places?.[0]?.id?.trim() ?? null;
}

async function fetchReviewsForPlace(
  apiKey: string,
  placeId: string,
  maxReviews: number,
): Promise<GoogleReview[]> {
  const detailsData = await fetchJson<{
    reviews?: Array<{
      rating?: number;
      text?: { text?: string };
      originalText?: { text?: string };
      authorAttribution?: { displayName?: string };
      publishTime?: string;
      relativePublishTimeDescription?: string;
    }>;
  }>(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "reviews.rating,reviews.text,reviews.originalText,reviews.authorAttribution,reviews.publishTime,reviews.relativePublishTimeDescription",
    },
  });

  const reviews: GoogleReview[] = [];

  for (const review of detailsData.reviews ?? []) {
    const text = review.text?.text?.trim() || review.originalText?.text?.trim();
    if (!text) {
      continue;
    }

    const rating = clampRating(review.rating);
    if (rating < MIN_DISPLAY_REVIEW_RATING) {
      continue;
    }

    reviews.push({
      authorName: review.authorAttribution?.displayName?.trim() || "Google User",
      rating,
      text,
      publishedAt: formatPublishDate(
        review.publishTime,
        review.relativePublishTimeDescription,
      ),
    });

    if (reviews.length >= maxReviews) {
      break;
    }
  }

  return reviews;
}

export async function fetchGoogleReviews(
  input: FetchGoogleReviewsInput,
): Promise<FetchGoogleReviewsResult> {
  const apiKey = getGooglePlacesApiKey();
  const maxReviews = Math.min(5, Math.max(3, input.maxReviews ?? 5));

  if (!apiKey || !input.businessName.trim() || !input.city.trim()) {
    return { placeId: input.placeId?.trim() ?? null, reviews: [] };
  }

  try {
    const placeId = await resolvePlaceId(apiKey, input);
    if (!placeId) {
      return { placeId: null, reviews: [] };
    }

    const reviews = await fetchReviewsForPlace(apiKey, placeId, maxReviews);
    return { placeId, reviews };
  } catch (error) {
    console.error("[fetchGoogleReviews] Failed to load reviews:", error);
    return { placeId: input.placeId?.trim() ?? null, reviews: [] };
  }
}

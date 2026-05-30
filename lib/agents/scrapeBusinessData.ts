
import { scrapeContactInfo } from "./scrapeContactInfo";

type SourceName =
  | "googlePlaces"
  | "googleImages"
  | "facebook"
  | "instagram"
  | "yelp"
  | "hunter"
  | "websiteScrape"
  | "customSearchContact";

export type BusinessProfile = {
  businessName: string;
  address: string | null;
  phone: string | null;
  hours: string[];
  rating: number | null;
  reviewCount: number | null;
  topReviews: string[];
  ownerName: string | null;
  ownerEmail: string | null;
  services: string[];
  description: string | null;
  instagramBio: string | null;
  instagramPosts: string[];
  facebookDescription: string | null;
  yelpCategories: string[];
  priceRange: string | null;
  photos: string[];
  brandImageUrls: string[];
  website: string | null;
  facebookPosts: string[];
  instagramHashtags: string[];
  sourceErrors: Partial<Record<SourceName, string>>;
};

export type ScrapeBusinessDataInput = {
  businessName: string;
  city: string;
};

type GoogleResult = {
  businessName: string | null;
  address: string | null;
  phone: string | null;
  hours: string[];
  rating: number | null;
  reviewCount: number | null;
  topReviews: string[];
  description: string | null;
  website: string | null;
  services: string[];
};

type FacebookResult = {
  description: string | null;
  services: string[];
  posts: string[];
  reviews: string[];
  photos: string[];
  phone: string | null;
  website: string | null;
};

type InstagramResult = {
  bio: string | null;
  posts: string[];
  hashtags: string[];
};

type YelpResult = {
  businessName: string | null;
  address: string | null;
  phone: string | null;
  hours: string[];
  rating: number | null;
  reviewCount: number | null;
  topReviews: string[];
  categories: string[];
  priceRange: string | null;
  photos: string[];
  website: string | null;
};

type GoogleImageResult = {
  imageUrls: string[];
};

const DAYS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;

function getOptionalEnv(name: string): string | null {
  const value = process.env[name]?.trim();

  if (!value || value.startsWith("your_")) {
    return null;
  }

  return value;
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    if (!value) {
      continue;
    }

    const trimmed = value.trim();

    if (!trimmed) {
      continue;
    }

    const key = trimmed.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

function firstNonEmpty<T>(...values: Array<T | null | undefined>): T | null {
  for (const value of values) {
    if (value !== null && value !== undefined) {
      if (typeof value === "string" && !value.trim()) {
        continue;
      }

      return value;
    }
  }

  return null;
}

function formatReview(source: string, text: string, author?: string | null): string {
  const parts = [`${text.trim()}`];

  if (author?.trim()) {
    parts.push(`— ${author.trim()}`);
  }

  parts.push(`(${source})`);
  return parts.join(" ");
}

function formatYelpHours(hours: any[] | undefined): string[] {
  if (!hours?.[0]?.open || !Array.isArray(hours[0].open)) {
    return [];
  }

  return hours[0].open.map((entry: any) => {
    const day = DAYS[entry.day as number] ?? "Day";
    const start = String(entry.start ?? "").padStart(4, "0");
    const end = String(entry.end ?? "").padStart(4, "0");

    return `${day} ${start.slice(0, 2)}:${start.slice(2)}-${end.slice(0, 2)}:${end.slice(2)}`;
  });
}

function humanizeType(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

async function scrapeGoogleImages(
  businessName: string,
  city: string,
): Promise<GoogleImageResult> {
  const apiKey =
    getOptionalEnv("GOOGLE_CUSTOM_SEARCH_API_KEY") ??
    getOptionalEnv("GOOGLE_PLACES_API_KEY");
  const searchEngineId = getOptionalEnv("GOOGLE_CUSTOM_SEARCH_ENGINE_ID");

  if (!apiKey || !searchEngineId) {
    return { imageUrls: [] };
  }

  const queries = [`${businessName} logo`, `${businessName} ${city}`];
  const allUrls: string[] = [];

  for (const query of queries) {
    const params = new URLSearchParams({
      key: apiKey,
      cx: searchEngineId,
      q: query,
      searchType: "image",
      num: "3",
      safe: "active",
    });

    const data = await fetchJson<{
      items?: Array<{ link?: string }>;
    }>(`https://customsearch.googleapis.com/customsearch/v1?${params}`);

    allUrls.push(
      ...uniqueStrings((data.items ?? []).map((item) => item.link ?? null)),
    );
  }

  return {
    imageUrls: uniqueStrings(allUrls).slice(0, 5),
  };
}

async function scrapeGooglePlaces(
  businessName: string,
  city: string,
): Promise<GoogleResult> {
  const apiKey = getOptionalEnv("GOOGLE_PLACES_API_KEY");

  if (!apiKey) {
    return {
      businessName: null,
      address: null,
      phone: null,
      hours: [],
      rating: null,
      reviewCount: null,
      topReviews: [],
      description: null,
      website: null,
      services: [],
    };
  }

  const searchData = await fetchJson<{
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
  }>("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.regularOpeningHours.weekdayDescriptions,places.rating,places.userRatingCount,places.websiteUri,places.editorialSummary,places.types",
    },
    body: JSON.stringify({
      textQuery: `${businessName} ${city}`,
      maxResultCount: 1,
    }),
  });

  const place = searchData.places?.[0];

  if (!place?.id) {
    return {
      businessName: null,
      address: null,
      phone: null,
      hours: [],
      rating: null,
      reviewCount: null,
      topReviews: [],
      description: null,
      website: null,
      services: [],
    };
  }

  let reviews: string[] = [];

  try {
    const detailsData = await fetchJson<{
      reviews?: Array<{
        text?: { text?: string };
        originalText?: { text?: string };
        authorAttribution?: { displayName?: string };
      }>;
    }>(`https://places.googleapis.com/v1/places/${place.id}`, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "reviews.text,reviews.originalText,reviews.authorAttribution",
      },
    });

    reviews = uniqueStrings(
      (detailsData.reviews ?? []).map((review) =>
        review.text?.text || review.originalText?.text
          ? formatReview(
              "Google",
              review.text?.text ?? review.originalText?.text ?? "",
              review.authorAttribution?.displayName,
            )
          : null,
      ),
    ).slice(0, 3);
  } catch {
    reviews = [];
  }

  return {
    businessName: place.displayName?.text ?? null,
    address: place.formattedAddress ?? null,
    phone: place.nationalPhoneNumber ?? null,
    hours: place.regularOpeningHours?.weekdayDescriptions ?? [],
    rating: place.rating ?? null,
    reviewCount: place.userRatingCount ?? null,
    topReviews: reviews,
    description: place.editorialSummary?.text ?? null,
    website: place.websiteUri ?? null,
    services: uniqueStrings((place.types ?? []).map(humanizeType)).slice(0, 8),
  };
}

async function scrapeFacebook(
  businessName: string,
  city: string,
): Promise<FacebookResult> {
  const accessToken = getOptionalEnv("FACEBOOK_GRAPH_ACCESS_TOKEN");

  if (!accessToken) {
    return {
      description: null,
      services: [],
      posts: [],
      reviews: [],
      photos: [],
      phone: null,
      website: null,
    };
  }

  const params = new URLSearchParams({
    q: `${businessName} ${city}`,
    type: "page",
    limit: "1",
    fields: "id,name,about,description,phone,website,cover",
    access_token: accessToken,
  });

  const searchData = await fetchJson<{
    data?: Array<{
      id: string;
      about?: string;
      description?: string;
      phone?: string;
      website?: string;
      cover?: { source?: string };
    }>;
  }>(`https://graph.facebook.com/v20.0/search?${params}`);

  const page = searchData.data?.[0];

  if (!page?.id) {
    return {
      description: null,
      services: [],
      posts: [],
      reviews: [],
      photos: [],
      phone: null,
      website: null,
    };
  }

  let posts: string[] = [];
  let reviews: string[] = [];

  try {
    const postsData = await fetchJson<{
      data?: Array<{ message?: string; story?: string }>;
    }>(
      `https://graph.facebook.com/v20.0/${page.id}/posts?fields=message,story&limit=5&access_token=${accessToken}`,
    );

    posts = uniqueStrings(
      (postsData.data ?? []).map((post) => post.message ?? post.story ?? null),
    ).slice(0, 5);
  } catch {
    posts = [];
  }

  try {
    const ratingsData = await fetchJson<{
      data?: Array<{
        review_text?: string;
        reviewer?: { name?: string };
      }>;
    }>(
      `https://graph.facebook.com/v20.0/${page.id}/ratings?fields=review_text,reviewer&limit=5&access_token=${accessToken}`,
    );

    reviews = uniqueStrings(
      (ratingsData.data ?? []).map((rating) =>
        rating.review_text
          ? formatReview("Facebook", rating.review_text, rating.reviewer?.name)
          : null,
      ),
    ).slice(0, 3);
  } catch {
    reviews = [];
  }

  return {
    description: firstNonEmpty(page.description, page.about),
    services: [],
    posts,
    reviews,
    photos: uniqueStrings([page.cover?.source]),
    phone: page.phone ?? null,
    website: page.website ?? null,
  };
}

async function scrapeInstagram(
  businessName: string,
  city: string,
): Promise<InstagramResult> {
  const query = encodeURIComponent(`${businessName} ${city}`);
  const searchData = await fetchJson<{
    users?: Array<{ user?: { username?: string } }>;
  }>(`https://www.instagram.com/web/search/topsearch/?context=blended&query=${query}`, {
    headers: {
      "X-IG-App-ID": "936619743392459",
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  const username = searchData.users?.[0]?.user?.username;

  if (!username) {
    return {
      bio: null,
      posts: [],
      hashtags: [],
    };
  }

  const profileData = await fetchJson<{
    data?: {
      user?: {
        biography?: string;
        edge_owner_to_timeline_media?: {
          edges?: Array<{
            node?: {
              edge_media_to_caption?: {
                edges?: Array<{ node?: { text?: string } }>;
              };
            };
          }>;
        };
      };
    };
  }>(
    `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
    {
      headers: {
        "X-IG-App-ID": "936619743392459",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
      },
    },
  );

  const user = profileData.data?.user;
  const posts = uniqueStrings(
    (user?.edge_owner_to_timeline_media?.edges ?? []).map(
      (edge) => edge.node?.edge_media_to_caption?.edges?.[0]?.node?.text ?? null,
    ),
  ).slice(0, 9);

  const hashtags = uniqueStrings(
    posts.flatMap((caption) => caption.match(/#[A-Za-z0-9_]+/g) ?? []),
  ).slice(0, 20);

  return {
    bio: user?.biography ?? null,
    posts,
    hashtags,
  };
}

async function scrapeYelp(
  businessName: string,
  city: string,
): Promise<YelpResult> {
  const apiKey = getOptionalEnv("YELP_API_KEY");

  if (!apiKey) {
    return {
      businessName: null,
      address: null,
      phone: null,
      hours: [],
      rating: null,
      reviewCount: null,
      topReviews: [],
      categories: [],
      priceRange: null,
      photos: [],
      website: null,
    };
  }

  const searchParams = new URLSearchParams({
    term: businessName,
    location: city,
    limit: "1",
  });

  const searchData = await fetchJson<{
    businesses?: Array<{
      id: string;
      name?: string;
      display_phone?: string;
      rating?: number;
      review_count?: number;
      categories?: Array<{ title?: string }>;
      price?: string;
      photos?: string[];
      url?: string;
      location?: { display_address?: string[] };
    }>;
  }>(`https://api.yelp.com/v3/businesses/search?${searchParams}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const business = searchData.businesses?.[0];

  if (!business?.id) {
    return {
      businessName: null,
      address: null,
      phone: null,
      hours: [],
      rating: null,
      reviewCount: null,
      topReviews: [],
      categories: [],
      priceRange: null,
      photos: [],
      website: null,
    };
  }

  let topReviews: string[] = [];
  let hours: string[] = [];

  try {
    const reviewData = await fetchJson<{
      reviews?: Array<{ text?: string; user?: { name?: string } }>;
    }>(`https://api.yelp.com/v3/businesses/${business.id}/reviews`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    topReviews = uniqueStrings(
      (reviewData.reviews ?? []).map((review) =>
        review.text ? formatReview("Yelp", review.text, review.user?.name) : null,
      ),
    ).slice(0, 3);
  } catch {
    topReviews = [];
  }

  try {
    const detailsData = await fetchJson<{
      hours?: any[];
    }>(`https://api.yelp.com/v3/businesses/${business.id}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    hours = formatYelpHours(detailsData.hours);
  } catch {
    hours = [];
  }

  return {
    businessName: business.name ?? null,
    address: business.location?.display_address?.join(", ") ?? null,
    phone: business.display_phone ?? null,
    hours,
    rating: business.rating ?? null,
    reviewCount: business.review_count ?? null,
    topReviews,
    categories: uniqueStrings((business.categories ?? []).map((item) => item.title)),
    priceRange: business.price ?? null,
    photos: uniqueStrings(business.photos ?? []),
    website: business.url ?? null,
  };
}

export async function scrapeBusinessData(
  input: ScrapeBusinessDataInput,
): Promise<BusinessProfile> {
  const businessName = input.businessName.trim();
  const city = input.city.trim();
  const sourceErrors: Partial<Record<SourceName, string>> = {};

  if (!businessName || !city) {
    throw new Error("businessName and city are required.");
  }

  const [google, googleImages, facebook, instagram, yelp] = await Promise.all([
    scrapeGooglePlaces(businessName, city).catch((error: Error) => {
      sourceErrors.googlePlaces = error.message;
      return {
        businessName: null,
        address: null,
        phone: null,
        hours: [],
        rating: null,
        reviewCount: null,
        topReviews: [],
        description: null,
        website: null,
        services: [],
      } satisfies GoogleResult;
    }),
    scrapeGoogleImages(businessName, city).catch((error: Error) => {
      sourceErrors.googleImages = error.message;
      return {
        imageUrls: [],
      } satisfies GoogleImageResult;
    }),
    scrapeFacebook(businessName, city).catch((error: Error) => {
      sourceErrors.facebook = error.message;
      return {
        description: null,
        services: [],
        posts: [],
        reviews: [],
        photos: [],
        phone: null,
        website: null,
      } satisfies FacebookResult;
    }),
    scrapeInstagram(businessName, city).catch((error: Error) => {
      sourceErrors.instagram = error.message;
      return {
        bio: null,
        posts: [],
        hashtags: [],
      } satisfies InstagramResult;
    }),
    scrapeYelp(businessName, city).catch((error: Error) => {
      sourceErrors.yelp = error.message;
      return {
        businessName: null,
        address: null,
        phone: null,
        hours: [],
        rating: null,
        reviewCount: null,
        topReviews: [],
        categories: [],
        priceRange: null,
        photos: [],
        website: null,
      } satisfies YelpResult;
    }),
  ]);

  const website = firstNonEmpty(google.website, yelp.website, facebook.website);
  const phone = firstNonEmpty(google.phone, yelp.phone, facebook.phone);

  const contact = await scrapeContactInfo({
    businessName,
    city,
    website,
    phone,
  }).catch((error: Error) => {
    sourceErrors.customSearchContact = error.message;
    return {
      emails: [],
      ownerEmail: null,
      ownerName: null,
      phone,
      errors: [error.message],
    };
  });

  for (const message of contact.errors) {
    if (message.startsWith("websiteScrape:")) {
      sourceErrors.websiteScrape = message.replace("websiteScrape: ", "");
    } else if (message.startsWith("customSearchEmail:")) {
      sourceErrors.customSearchContact = message.replace("customSearchEmail: ", "");
    } else if (message.startsWith("hunter:")) {
      sourceErrors.hunter = message.replace("hunter: ", "");
    }
  }

  return {
    businessName: firstNonEmpty(google.businessName, yelp.businessName, businessName) ?? businessName,
    address: firstNonEmpty(google.address, yelp.address),
    phone: contact.phone ?? phone,
    hours: google.hours.length > 0 ? google.hours : yelp.hours,
    rating: firstNonEmpty(google.rating, yelp.rating),
    reviewCount: firstNonEmpty(google.reviewCount, yelp.reviewCount),
    topReviews: uniqueStrings([
      ...google.topReviews,
      ...yelp.topReviews,
      ...facebook.reviews,
    ]).slice(0, 6),
    ownerName: contact.ownerName,
    ownerEmail: contact.ownerEmail,
    services: uniqueStrings([
      ...google.services,
      ...facebook.services,
      ...yelp.categories,
    ]).slice(0, 10),
    description: firstNonEmpty(
      google.description,
      facebook.description,
      instagram.bio,
    ),
    instagramBio: instagram.bio,
    instagramPosts: instagram.posts,
    facebookDescription: facebook.description,
    yelpCategories: yelp.categories,
    priceRange: yelp.priceRange,
    photos: uniqueStrings([...yelp.photos, ...facebook.photos]).slice(0, 12),
    brandImageUrls: googleImages.imageUrls,
    website,
    facebookPosts: facebook.posts,
    instagramHashtags: instagram.hashtags,
    sourceErrors,
  };
}

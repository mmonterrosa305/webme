export type BusinessSearchWebsiteData = {
  headline: string | null;
  tagline: string | null;
  services: string[];
  description: string | null;
  adCopy: string[];
  logoUrl: string | null;
  scrapeError?: string;
};

export type BusinessSearchResult = {
  placeId: string;
  businessName: string;
  city: string;
  industry: string;
  phone: string | null;
  address: string | null;
  website: string | null;
  rating: number | null;
  reviewCount: number | null;
  hours: string[];
  description: string | null;
  services: string[];
  websiteData: BusinessSearchWebsiteData | null;
};

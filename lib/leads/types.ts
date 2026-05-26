export type LeadPreview = {
  id: string;
  business_name: string;
  city: string;
  industry: string | null;
  site_slug: string;
  site_html: string;
  owner_email: string | null;
  status: string | null;
};

export type LeadSearchResult = {
  placeId: string;
  businessName: string;
  city: string;
  industry: string;
  address: string | null;
  phone: string | null;
  rating: number | null;
  reviewCount: number | null;
  website: string | null;
  websiteStatus: "no_website" | "has_site_review" | "has_site";
};

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

export type LeadStatus =
  | "new"
  | "pending_review"
  | "site_built"
  | "approved"
  | "outreach_sent"
  | "won"
  | "lost";

export type SavedLead = {
  id: string;
  business_name: string;
  city: string;
  industry: string | null;
  status: LeadStatus | string | null;
  site_slug: string | null;
  owner_email?: string | null;
  regenerate_count?: number;
};

import type { GoogleReview } from "@/lib/google-places/fetch-google-reviews";

export type SiteImageSlot =
  | "hero"
  | "about"
  | "service1"
  | "service2"
  | "service3"
  | "service4"
  | "gallery1"
  | "gallery2"
  | "gallery3";

export type SiteContent = {
  businessName: string;
  phone: string;
  contactEmail?: string;
  address: string;
  hours: string;
  headline: string;
  tagline: string;
  logoUrl: string;
  images: Record<SiteImageSlot, string>;
};

export type SiteMetadata = {
  headline?: string;
  tagline?: string;
  hours?: string;
  logoUrl?: string;
  heroImageUrl?: string;
  aboutImageUrl?: string;
  serviceImageUrls?: string[];
  galleryImageUrls?: string[];
  scrollHeroSequenceId?: string;
  googlePlaceId?: string;
  googleReviews?: GoogleReview[];
  businessAddress?: string;
  googleMapsEmbedUrl?: string;
};

export type ClientSiteData = {
  clientId: string;
  leadId: string;
  siteSlug: string;
  siteHtml: string;
  content: SiteContent;
  plan: string;
  subscriptionStatus: string;
};

export const IMAGE_SLOT_LABELS: Record<SiteImageSlot, string> = {
  hero: "Hero background",
  about: "About section",
  service1: "Service card 1",
  service2: "Service card 2",
  service3: "Service card 3",
  service4: "Service card 4",
  gallery1: "Gallery photo 1",
  gallery2: "Gallery photo 2",
  gallery3: "Gallery photo 3",
};

export const IMAGE_SLOTS: SiteImageSlot[] = [
  "hero",
  "about",
  "service1",
  "service2",
  "service3",
  "service4",
  "gallery1",
  "gallery2",
  "gallery3",
];

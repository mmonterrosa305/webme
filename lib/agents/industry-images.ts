import {
  DEFAULT_IMAGE_SET,
  INDUSTRY_HERO_OPTIONS,
  INDUSTRY_IMAGE_SETS,
  INDUSTRY_SLOT_IDS,
  buildImageSet,
  unsplashUrl,
  type IndustryImageSet,
} from "./industry-image-sets";

/** First matching rule wins — order from most specific to broad. */
const MATCH_RULES: Array<{ keywords: string[]; label: string }> = [
  { keywords: ["pest"], label: "Pest Control" },
  { keywords: ["pool"], label: "Pool Service" },
  { keywords: ["garage door"], label: "Garage Door" },
  { keywords: ["locksmith"], label: "Locksmith" },
  { keywords: ["roof"], label: "Roofing" },
  { keywords: ["floor"], label: "Flooring" },
  { keywords: ["paint"], label: "Painting" },
  { keywords: ["moving", "mover"], label: "Moving Company" },
  { keywords: ["interior design"], label: "Interior Design" },
  { keywords: ["general contractor"], label: "General Contractor" },
  { keywords: ["nail salon", "nail "], label: "Nail Salon" },
  { keywords: ["barbershop", "barber"], label: "Barbershop" },
  { keywords: ["hair salon", "hairdress"], label: "Hair Salon" },
  { keywords: ["spa", "massage"], label: "Spa & Massage" },
  { keywords: ["tattoo"], label: "Tattoo Studio" },
  { keywords: ["personal trainer"], label: "Personal Trainer" },
  { keywords: ["yoga"], label: "Yoga Studio" },
  { keywords: ["gym", "fitness"], label: "Gym & Fitness" },
  { keywords: ["orthodont"], label: "Orthodontist" },
  { keywords: ["chiropract"], label: "Chiropractor" },
  { keywords: ["optomet", "eye care"], label: "Optometrist" },
  { keywords: ["veterinar", "vet clinic"], label: "Veterinarian" },
  { keywords: ["med spa"], label: "Med Spa" },
  { keywords: ["dental", "dentist"], label: "Dental" },
  { keywords: ["law firm", "lawyer", "attorney", "legal"], label: "Law Firm" },
  { keywords: ["accounting", "accountant", "cpa"], label: "Accounting" },
  { keywords: ["real estate", "realtor", "realty"], label: "Real Estate" },
  { keywords: ["insurance"], label: "Insurance" },
  { keywords: ["financial advisor", "financial planning"], label: "Financial Advisor" },
  { keywords: ["marketing agency", "digital marketing"], label: "Marketing Agency" },
  { keywords: ["photography", "photographer"], label: "Photography" },
  { keywords: ["videography", "videographer"], label: "Videography" },
  { keywords: ["consulting", "consultant"], label: "Consulting" },
  { keywords: ["car detail"], label: "Car Detailing" },
  { keywords: ["auto body"], label: "Auto Body Shop" },
  { keywords: ["tire"], label: "Tire Shop" },
  { keywords: ["oil change"], label: "Oil Change" },
  { keywords: ["towing", "tow truck"], label: "Towing" },
  { keywords: ["auto repair", "mechanic", "automotive"], label: "Auto Repair" },
  { keywords: ["jewelry"], label: "Jewelry Store" },
  { keywords: ["boutique"], label: "Boutique" },
  { keywords: ["gift shop"], label: "Gift Shop" },
  { keywords: ["florist", "flower shop"], label: "Florist" },
  { keywords: ["tutoring", "tutor"], label: "Tutoring" },
  { keywords: ["daycare", "child care"], label: "Daycare" },
  { keywords: ["church"], label: "Church" },
  { keywords: ["nonprofit", "non-profit", "charity"], label: "Nonprofit" },
  { keywords: ["event plan"], label: "Event Planning" },
  { keywords: ["dj", "entertainment"], label: "DJ & Entertainment" },
  { keywords: ["landscap", "lawn", "garden"], label: "Landscaping" },
  { keywords: ["plumb"], label: "Plumbing" },
  { keywords: ["hvac", "heating", "cooling", "air condition"], label: "HVAC" },
  { keywords: ["electric"], label: "Electrician" },
  { keywords: ["food truck"], label: "Food Truck" },
  { keywords: ["catering"], label: "Catering" },
  { keywords: ["pizza"], label: "Pizza" },
  { keywords: ["seafood"], label: "Seafood" },
  { keywords: ["bbq", "barbecue"], label: "BBQ" },
  { keywords: ["juice bar", "juice"], label: "Juice Bar" },
  { keywords: ["nightclub", "bar &"], label: "Bar & Nightclub" },
  { keywords: ["cafe", "coffee shop"], label: "Cafe" },
  { keywords: ["bakery", "baker"], label: "Bakery" },
  {
    keywords: ["restaurant", "dining", "bistro", "eatery"],
    label: "Restaurant",
  },
  { keywords: ["clean"], label: "Cleaning Service" },
  { keywords: ["contractor", "construction"], label: "General Contractor" },
];

export type ResolvedIndustryImages = {
  label: string;
  hero: string;
  about: string;
  service1: string;
  service2: string;
  service3: string;
  service4: string;
  gallery1: string;
  gallery2: string;
  gallery3: string;
};

function toResolved(label: string, set: IndustryImageSet): ResolvedIndustryImages {
  return {
    label,
    hero: set.hero,
    about: set.about,
    service1: set.services[0],
    service2: set.services[1],
    service3: set.services[2],
    service4: set.services[3],
    gallery1: set.gallery[0],
    gallery2: set.gallery[1],
    gallery3: set.gallery[2],
  };
}

function resolveLabel(industry: string): string {
  const trimmed = industry.trim();

  if (INDUSTRY_IMAGE_SETS[trimmed]) {
    return trimmed;
  }

  const normalized = trimmed.toLowerCase();
  for (const rule of MATCH_RULES) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return rule.label;
    }
  }

  return "Other";
}

function getHeroOptions(label: string): readonly string[] {
  return INDUSTRY_HERO_OPTIONS[label] ?? INDUSTRY_HERO_OPTIONS.Other ?? [];
}

/** Randomly pick one hero URL from the industry's verified hero options. */
export function getRandomHero(industry: string): string {
  const label = resolveLabel(industry);
  const options = getHeroOptions(label);
  const id = options[Math.floor(Math.random() * options.length)] ?? options[0]!;
  return unsplashUrl(id, 1600);
}

export function resolveIndustryImages(
  industry: string,
  heroUrl?: string,
): ResolvedIndustryImages {
  const label = resolveLabel(industry);
  const slots = INDUSTRY_SLOT_IDS[label] ?? INDUSTRY_SLOT_IDS.Other!;
  const hero = heroUrl ?? getRandomHero(industry);
  const heroId = hero.match(/photo-([^?]+)/)?.[1];

  if (!heroId) {
    const fallback = INDUSTRY_IMAGE_SETS[label] ?? DEFAULT_IMAGE_SET;
    return toResolved(label, { ...fallback, hero });
  }

  return toResolved(label, buildImageSet(heroId, slots));
}

export function formatIndustryImagePromptBlock(
  industry: string,
  heroUrl: string,
): string {
  const r = resolveIndustryImages(industry, heroUrl);

  return `## Resolved industry images for "${industry}"
- Matched category: ${r.label}
- Hero (full-screen background — use ONLY here): ${r.hero}
- About (right column image — use ONLY here): ${r.about}
- Service1 (service card 1 background — use ONLY here): ${r.service1}
- Service2 (service card 2 background — use ONLY here): ${r.service2}
- Service3 (service card 3 background — use ONLY here): ${r.service3}
- Service4 (service card 4 background — use ONLY here): ${r.service4}
- Gallery1 (gallery image 1 — use ONLY here): ${r.gallery1}
- Gallery2 (gallery image 2 — use ONLY here): ${r.gallery2}
- Gallery3 (gallery image 3 — use ONLY here): ${r.gallery3}

Use each labeled URL in its designated section only.`;
}

export function buildIndustryHeroListForPrompt(): string {
  return Object.entries(INDUSTRY_HERO_OPTIONS)
    .map(
      ([name, ids]) =>
        `- ${name}: ${ids.map((id) => unsplashUrl(id, 1600)).join(" | ")}`,
    )
    .join("\n");
}

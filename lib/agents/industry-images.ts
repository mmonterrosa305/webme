const DEFAULT_HERO =
  "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=80";

const HERO_URLS: Record<string, string> = {
  Electrician:
    "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1600&q=80",
  Plumbing:
    "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=1600&q=80",
  HVAC: "https://images.unsplash.com/photo-1631545806609-27a0d3f26e2e?w=1600&q=80",
  Restaurant:
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80",
  "Hair Salon":
    "https://images.unsplash.com/photo-1560066984-138daaa8e6d9?w=1600&q=80",
  Dental:
    "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=1600&q=80",
  Law: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1600&q=80",
  Landscaping:
    "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1600&q=80",
  Cleaning:
    "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1600&q=80",
  "Auto Repair":
    "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=1600&q=80",
  Barbershop:
    "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1600&q=80",
  Gym: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600&q=80",
  "Pest Control":
    "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=1600&q=80",
  Roofing:
    "https://images.unsplash.com/photo-1632207691143-643e2a9a9361?w=1600&q=80",
  Painting:
    "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=1600&q=80",
  Flooring:
    "https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?w=1600&q=80",
  Moving:
    "https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=1600&q=80",
  "Pool Service":
    "https://images.unsplash.com/photo-1575429198097-0414ec08e8cd?w=1600&q=80",
  "Nail Salon":
    "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=1600&q=80",
  "Real Estate":
    "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1600&q=80",
  Construction:
    "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1600&q=80",
  Florist:
    "https://images.unsplash.com/photo-1487530811015-780a2249b8c0?w=1600&q=80",
  Bakery:
    "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=1600&q=80",
  Yoga:
    "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1600&q=80",
};

const ABOUT_URLS: Record<string, string> = {
  Plumbing:
    "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=800&q=80",
  Electrician:
    "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80",
  HVAC: "https://images.unsplash.com/photo-1631545806609-27a0d3f26e2e?w=800&q=80",
  Restaurant:
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80",
  Landscaping:
    "https://images.unsplash.com/photo-1558904541-efa843a96f01?w=800&q=80",
  "Hair Salon":
    "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800&q=80",
  Dental:
    "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=800&q=80",
  Law: "https://images.unsplash.com/photo-1589994965851-a8f479c573a9?w=800&q=80",
  "Auto Repair":
    "https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?w=800&q=80",
  Cleaning:
    "https://images.unsplash.com/photo-1563453392212-326f5e854473?w=800&q=80",
};

const SERVICE_CARD_URLS: Record<string, [string, string, string, string]> = {
  Landscaping: [
    "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80",
    "https://images.unsplash.com/photo-1558904541-efa843a96f01?w=800&q=80",
    "https://images.unsplash.com/photo-1599629954294-16b7f0e8b4f0?w=800&q=80",
    "https://images.unsplash.com/photo-1592417817098-8fd3d9eb14a5?w=800&q=80",
  ],
  Plumbing: [
    "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&q=80",
    "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=800&q=80",
    "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&q=80",
    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80",
  ],
  Electrician: [
    "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80",
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=800&q=80",
    "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80",
  ],
  Restaurant: [
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
    "https://images.unsplash.com/photo-1493770348161-369560ae357d?w=800&q=80",
    "https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=800&q=80",
  ],
};

/** First matching rule wins — order from most specific to broad. */
const MATCH_RULES: Array<{ keywords: string[]; label: string }> = [
  { keywords: ["pest"], label: "Pest Control" },
  { keywords: ["pool"], label: "Pool Service" },
  { keywords: ["roof"], label: "Roofing" },
  { keywords: ["floor"], label: "Flooring" },
  { keywords: ["paint"], label: "Painting" },
  { keywords: ["moving", "mover"], label: "Moving" },
  { keywords: ["nail"], label: "Nail Salon" },
  { keywords: ["barber"], label: "Barbershop" },
  { keywords: ["hair salon", "hairdress"], label: "Hair Salon" },
  { keywords: ["real estate", "realtor", "realty"], label: "Real Estate" },
  { keywords: ["yoga"], label: "Yoga" },
  { keywords: ["bakery", "baker"], label: "Bakery" },
  { keywords: ["florist", "flower shop"], label: "Florist" },
  {
    keywords: ["construction", "contractor", "general contractor"],
    label: "Construction",
  },
  { keywords: ["landscap", "lawn", "garden"], label: "Landscaping" },
  { keywords: ["plumb"], label: "Plumbing" },
  { keywords: ["hvac", "heating", "cooling", "air condition"], label: "HVAC" },
  { keywords: ["electric"], label: "Electrician" },
  {
    keywords: [
      "restaurant",
      "cafe",
      "coffee",
      "pizza",
      "bbq",
      "seafood",
      "catering",
      "food truck",
      "juice bar",
      "bar ",
      "nightclub",
    ],
    label: "Restaurant",
  },
  { keywords: ["dental", "dentist", "orthodont"], label: "Dental" },
  { keywords: ["law firm", "lawyer", "attorney", "legal"], label: "Law" },
  { keywords: ["clean"], label: "Cleaning" },
  {
    keywords: ["auto repair", "mechanic", "automotive", "auto body"],
    label: "Auto Repair",
  },
  { keywords: ["gym", "fitness", "personal trainer"], label: "Gym" },
];

function to800(url: string): string {
  return url.replace("w=1600", "w=800");
}

function serviceCardsFromHero(heroUrl: string): [string, string, string, string] {
  const card = to800(heroUrl);
  return [card, card, card, card];
}

export type ResolvedIndustryImages = {
  label: string;
  heroUrl: string;
  aboutUrl: string;
  serviceCards: [string, string, string, string];
};

export function resolveIndustryImages(industry: string): ResolvedIndustryImages {
  const normalized = industry.toLowerCase().trim();

  let label = "Default";
  let heroUrl = DEFAULT_HERO;

  for (const rule of MATCH_RULES) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      label = rule.label;
      heroUrl = HERO_URLS[rule.label] ?? DEFAULT_HERO;
      break;
    }
  }

  if (label === "Default" && HERO_URLS[industry.trim()]) {
    label = industry.trim();
    heroUrl = HERO_URLS[industry.trim()];
  }

  const aboutUrl = ABOUT_URLS[label] ?? to800(heroUrl);
  const serviceCards =
    SERVICE_CARD_URLS[label] ?? serviceCardsFromHero(heroUrl);

  return { label, heroUrl, aboutUrl, serviceCards };
}

export function formatIndustryImagePromptBlock(industry: string): string {
  const resolved = resolveIndustryImages(industry);

  return `## Resolved industry images for "${industry}"
- Matched category: ${resolved.label}
- Hero URL (use exactly): ${resolved.heroUrl}
- About URL (use exactly): ${resolved.aboutUrl}
- Service card 1: ${resolved.serviceCards[0]}
- Service card 2: ${resolved.serviceCards[1]}
- Service card 3: ${resolved.serviceCards[2]}
- Service card 4: ${resolved.serviceCards[3]}
- Gallery: use About URL, Hero URL, and Service card 3 URL in that order`;
}

export function buildIndustryHeroListForPrompt(): string {
  return Object.entries(HERO_URLS)
    .map(([name, url]) => `- ${name}: ${url}`)
    .concat([`- Default: ${DEFAULT_HERO}`])
    .join("\n");
}

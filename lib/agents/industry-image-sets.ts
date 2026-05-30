import { INDUSTRIES } from "./site-options";

export type IndustryImageSet = {
  hero: string;
  about: string;
  services: [string, string, string, string];
  gallery: [string, string, string];
};

/** HTTP-verified Unsplash photo IDs (images.unsplash.com returns 200). */
export const VERIFIED_PHOTO_IDS = [
  "1585704032915-c3400ca199e7",
  "1607472586893-edb57bdc0e39",
  "1504328345606-18bbc8c9d7d1",
  "1556909114-f6e7ad7d3136",
  "1558618666-fcd25c85cd64",
  "1600607687939-ce8a6c25118c",
  "1581092580497-e0d23cbdf1dc",
  "1504307651254-35680f356dfd",
  "1621905251189-08b45d6a269e",
  "1632207691143-643e2a9a9361",
  "1581858726788-75bc0f6a952d",
  "1562259949-e8e7689d7828",
  "1600585154340-be6161a56a0c",
  "1600607687644-c7171b42498f",
  "1416879595882-3373a0480b5b",
  "1558904541-efa843a96f01",
  "1592417817098-8fd3d9eb14a5",
  "1581578731548-c64695cc6952",
  "1563453392212-326f5e854473",
  "1600880292203-757bb62b4baf",
  "1575429198097-0414ec08e8cd",
  "1600518464441-9154a4dea21b",
  "1517248135467-4c7edcad34c4",
  "1414235077428-338989a2e8c0",
  "1504674900247-0877df9cc836",
  "1493770348161-369560ae357d",
  "1424847651672-bf20a4b0982b",
  "1555396273-367ea4eb4db5",
  "1546069901-ba9599a7e63c",
  "1495474472287-4d71bcdd2085",
  "1509042239860-f550ce710b93",
  "1517433670267-08bbd4be890f",
  "1551024506-0bccd828d307",
  "1563805042-7684c019e1cb",
  "1555939594-58d7cb561ad1",
  "1556910103-1c02745aae4d",
  "1521590832167-7bcbfaa6381f",
  "1560472354-b33ff0c44a43",
  "1503951914875-452162b0f3f1",
  "1604654894610-df63bc536371",
  "1540555700478-4be289fbecef",
  "1612349317150-e413f6a5b16d",
  "1518611012118-696072aa579a",
  "1534438327276-14e5300c3a48",
  "1517838277536-f5f99be501cd",
  "1544367567-0f2fcb009e0b",
  "1506126613408-eca07ce68773",
  "1606811841689-23dfddce3e95",
  "1609840114035-3c981b782dfe",
  "1588776814546-1ffcf47267a5",
  "1589829545856-d10d557cf95f",
  "1589994965851-a8f479c573a9",
  "1454165804606-c3d57bc86b40",
  "1486312338219-ce68d2c6f44d",
  "1554224155-6726b3ff858f",
  "1556742049-0cfed4f6a45d",
  "1553877522-43269d4ea984",
  "1560518883-ce09059eeffa",
  "1552664730-d307ca884978",
  "1516035069371-29a1b244cc32",
  "1511285560929-80b456fea0bc",
  "1519741497674-611481863552",
  "1619642751034-765dfdf7c58e",
  "1530046339160-ce3e530c7d2f",
  "1522202176988-66273c2fd55f",
  "1516321318423-f06f85e504b3",
  "1519167758481-83f550bb49b3",
  "1529156069898-49953e39b3ac",
  "1511795409834-ef04bbd61622",
  "1497366216548-37526070297c",
] as const;

const VERIFIED_SET = new Set<string>(VERIFIED_PHOTO_IDS);

/** Industry-appropriate hero IDs (must be in VERIFIED_PHOTO_IDS). */
const HERO_IDS: Record<string, string> = {
  Plumbing: "1585704032915-c3400ca199e7",
  HVAC: "1558618666-fcd25c85cd64",
  Electrician: "1621905251189-08b45d6a269e",
  Roofing: "1632207691143-643e2a9a9361",
  Landscaping: "1416879595882-3373a0480b5b",
  "Cleaning Service": "1581578731548-c64695cc6952",
  "Pest Control": "1581578731548-c64695cc6952",
  "Pool Service": "1575429198097-0414ec08e8cd",
  Painting: "1562259949-e8e7689d7828",
  Flooring: "1581858726788-75bc0f6a952d",
  "General Contractor": "1504307651254-35680f356dfd",
  "Interior Design": "1600607687644-c7171b42498f",
  "Moving Company": "1600518464441-9154a4dea21b",
  Locksmith: "1607472586893-edb57bdc0e39",
  "Garage Door": "1600585154340-be6161a56a0c",
  Restaurant: "1517248135467-4c7edcad34c4",
  Cafe: "1495474472287-4d71bcdd2085",
  Bakery: "1517433670267-08bbd4be890f",
  "Bar & Nightclub": "1555396273-367ea4eb4db5",
  "Food Truck": "1555939594-58d7cb561ad1",
  Catering: "1546069901-ba9599a7e63c",
  Pizza: "1555396273-367ea4eb4db5",
  Seafood: "1546069901-ba9599a7e63c",
  BBQ: "1504674900247-0877df9cc836",
  "Juice Bar": "1509042239860-f550ce710b93",
  "Hair Salon": "1521590832167-7bcbfaa6381f",
  Barbershop: "1503951914875-452162b0f3f1",
  "Nail Salon": "1604654894610-df63bc536371",
  "Spa & Massage": "1540555700478-4be289fbecef",
  "Tattoo Studio": "1503951914875-452162b0f3f1",
  "Gym & Fitness": "1534438327276-14e5300c3a48",
  "Personal Trainer": "1518611012118-696072aa579a",
  "Yoga Studio": "1544367567-0f2fcb009e0b",
  Dental: "1606811841689-23dfddce3e95",
  Orthodontist: "1609840114035-3c981b782dfe",
  Chiropractor: "1588776814546-1ffcf47267a5",
  Optometrist: "1609840114035-3c981b782dfe",
  Veterinarian: "1521590832167-7bcbfaa6381f",
  "Med Spa": "1612349317150-e413f6a5b16d",
  "Law Firm": "1589829545856-d10d557cf95f",
  Accounting: "1454165804606-c3d57bc86b40",
  "Real Estate": "1560518883-ce09059eeffa",
  Insurance: "1554224155-6726b3ff858f",
  "Financial Advisor": "1556742049-0cfed4f6a45d",
  "Marketing Agency": "1553877522-43269d4ea984",
  Photography: "1516035069371-29a1b244cc32",
  Videography: "1511285560929-80b456fea0bc",
  Consulting: "1486312338219-ce68d2c6f44d",
  "Auto Repair": "1619642751034-765dfdf7c58e",
  "Car Detailing": "1530046339160-ce3e530c7d2f",
  Towing: "1619642751034-765dfdf7c58e",
  "Auto Body Shop": "1530046339160-ce3e530c7d2f",
  "Tire Shop": "1619642751034-765dfdf7c58e",
  "Oil Change": "1530046339160-ce3e530c7d2f",
  Boutique: "1560518883-ce09059eeffa",
  "Jewelry Store": "1511285560929-80b456fea0bc",
  Florist: "1558904541-efa843a96f01",
  "Gift Shop": "1517433670267-08bbd4be890f",
  Tutoring: "1522202176988-66273c2fd55f",
  Daycare: "1522202176988-66273c2fd55f",
  Church: "1519167758481-83f550bb49b3",
  Nonprofit: "1529156069898-49953e39b3ac",
  "Event Planning": "1511795409834-ef04bbd61622",
  "DJ & Entertainment": "1552664730-d307ca884978",
  Other: "1497366216548-37526070297c",
};

export function unsplashUrl(id: string, width = 800): string {
  return `https://images.unsplash.com/photo-${id}?w=${width}&auto=format&fit=crop&q=60`;
}

function buildSet(ids: [string, string, string, string, string, string, string, string, string]): IndustryImageSet {
  const [hero, about, s1, s2, s3, s4, g1, g2, g3] = ids;
  return {
    hero: unsplashUrl(hero, 1600),
    about: unsplashUrl(about),
    services: [unsplashUrl(s1), unsplashUrl(s2), unsplashUrl(s3), unsplashUrl(s4)],
    gallery: [unsplashUrl(g1), unsplashUrl(g2), unsplashUrl(g3)],
  };
}

/** Pick 9 unique verified IDs per industry (hero + about + 4 services + 3 gallery). */
function pickNineIds(industry: string, index: number): [string, string, string, string, string, string, string, string, string] {
  const configuredHero = HERO_IDS[industry];
  const hero =
    configuredHero && VERIFIED_SET.has(configuredHero)
      ? configuredHero
      : VERIFIED_PHOTO_IDS[index % VERIFIED_PHOTO_IDS.length];

  const used = new Set<string>([hero]);
  const rest: string[] = [];
  let pointer = index * 7 + 3;

  while (rest.length < 8) {
    const id = VERIFIED_PHOTO_IDS[pointer % VERIFIED_PHOTO_IDS.length];
    pointer += 1;
    if (!used.has(id)) {
      used.add(id);
      rest.push(id);
    }
  }

  return [hero, ...rest] as [string, string, string, string, string, string, string, string, string];
}

function buildAllIndustrySets(): Record<string, IndustryImageSet> {
  const sets: Record<string, IndustryImageSet> = {};

  for (let i = 0; i < INDUSTRIES.length; i += 1) {
    const industry = INDUSTRIES[i];
    sets[industry] = buildSet(pickNineIds(industry, i));
  }

  return sets;
}

export const INDUSTRY_IMAGE_SETS: Record<string, IndustryImageSet> =
  buildAllIndustrySets();

export const DEFAULT_IMAGE_SET = INDUSTRY_IMAGE_SETS.Other;

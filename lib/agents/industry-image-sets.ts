/**
 * Curated, manually verified Unsplash photo IDs per industry.
 * Every image shows people working, tools in use, or service results — never decor/plants/furniture-only shots.
 */
export type IndustryImageSet = {
  hero: string;
  about: string;
  services: [string, string, string, string];
  gallery: [string, string, string];
};

export type IndustryImageSlotIds = {
  about: string;
  services: [string, string, string, string];
  gallery: [string, string, string];
};

export function unsplashUrl(id: string, width = 800): string {
  return `https://images.unsplash.com/photo-${id}?w=${width}&auto=format&fit=crop&q=60`;
}

/** Build full URL set from a hero ID + non-hero slot IDs. */
export function buildImageSet(
  heroId: string,
  slots: IndustryImageSlotIds,
): IndustryImageSet {
  return {
    hero: unsplashUrl(heroId, 1600),
    about: unsplashUrl(slots.about),
    services: [
      unsplashUrl(slots.services[0]),
      unsplashUrl(slots.services[1]),
      unsplashUrl(slots.services[2]),
      unsplashUrl(slots.services[3]),
    ],
    gallery: [
      unsplashUrl(slots.gallery[0]),
      unsplashUrl(slots.gallery[1]),
      unsplashUrl(slots.gallery[2]),
    ],
  };
}

/** Extract about / service / gallery IDs from [hero, about, s1–s4, g1–g3]. */
function extractSlots(
  ids: readonly [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ],
): IndustryImageSlotIds {
  const [, about, s1, s2, s3, s4, g1, g2, g3] = ids;
  return {
    about,
    services: [s1, s2, s3, s4],
    gallery: [g1, g2, g3],
  };
}

// --- Trade & home services (tools, hands-on work) ---
const PLUMBING = [
  "1585704032915-c3400ca199e7",
  "1607472586893-edb57bdc0e39",
  "1607472586893-edb57bdc0e39",
  "1504328345606-18bbc8c9d7d1",
  "1504307651254-35680f356dfd",
  "1581092580497-e0d23cbdf1dc",
  "1585704032915-c3400ca199e7",
  "1504328345606-18bbc8c9d7d1",
  "1504307651254-35680f356dfd",
] as const;

const HVAC = [
  "1558618666-fcd25c85cd64",
  "1581092580497-e0d23cbdf1dc",
  "1621905251189-08b45d6a269e",
  "1504307651254-35680f356dfd",
  "1600607687939-ce8a6c25118c",
  "1607472586893-edb57bdc0e39",
  "1558618666-fcd25c85cd64",
  "1581092580497-e0d23cbdf1dc",
  "1621905251189-08b45d6a269e",
] as const;

const ELECTRICIAN = [
  "1621905251189-08b45d6a269e",
  "1558618666-fcd25c85cd64",
  "1581092580497-e0d23cbdf1dc",
  "1504307651254-35680f356dfd",
  "1600607687939-ce8a6c25118c",
  "1607472586893-edb57bdc0e39",
  "1621905251189-08b45d6a269e",
  "1558618666-fcd25c85cd64",
  "1581092580497-e0d23cbdf1dc",
] as const;

const ROOFING = [
  "1632207691143-643e2a9a9361",
  "1504307651254-35680f356dfd",
  "1562259949-e8e7689d7828",
  "1581858726788-75bc0f6a952d",
  "1600585154340-be6161a56a0c",
  "1621905251189-08b45d6a269e",
  "1632207691143-643e2a9a9361",
  "1504307651254-35680f356dfd",
  "1562259949-e8e7689d7828",
] as const;

const LANDSCAPING = [
  "1592417817098-8fd3d9eb14a5",
  "1504307651254-35680f356dfd",
  "1581858726788-75bc0f6a952d",
  "1562259949-e8e7689d7828",
  "1600585154340-be6161a56a0c",
  "1621905251189-08b45d6a269e",
  "1592417817098-8fd3d9eb14a5",
  "1504307651254-35680f356dfd",
  "1581858726788-75bc0f6a952d",
] as const;

const CLEANING = [
  "1581578731548-c64695cc6952",
  "1563453392212-326f5e854473",
  "1600880292203-757bb62b4baf",
  "1607472586893-edb57bdc0e39",
  "1504328345606-18bbc8c9d7d1",
  "1581092580497-e0d23cbdf1dc",
  "1581578731548-c64695cc6952",
  "1563453392212-326f5e854473",
  "1600880292203-757bb62b4baf",
] as const;

const PEST_CONTROL = [
  "1581578731548-c64695cc6952",
  "1607472586893-edb57bdc0e39",
  "1504328345606-18bbc8c9d7d1",
  "1581092580497-e0d23cbdf1dc",
  "1504307651254-35680f356dfd",
  "1600607687939-ce8a6c25118c",
  "1581578731548-c64695cc6952",
  "1504328345606-18bbc8c9d7d1",
  "1581092580497-e0d23cbdf1dc",
] as const;

const POOL_SERVICE = [
  "1575429198097-0414ec08e8cd",
  "1600585154340-be6161a56a0c",
  "1504307651254-35680f356dfd",
  "1581092580497-e0d23cbdf1dc",
  "1607472586893-edb57bdc0e39",
  "1621905251189-08b45d6a269e",
  "1575429198097-0414ec08e8cd",
  "1600585154340-be6161a56a0c",
  "1504307651254-35680f356dfd",
] as const;

const PAINTING = [
  "1562259949-e8e7689d7828",
  "1581858726788-75bc0f6a952d",
  "1504307651254-35680f356dfd",
  "1600585154340-be6161a56a0c",
  "1621905251189-08b45d6a269e",
  "1600607687939-ce8a6c25118c",
  "1562259949-e8e7689d7828",
  "1581858726788-75bc0f6a952d",
  "1504307651254-35680f356dfd",
] as const;

const FLOORING = [
  "1581858726788-75bc0f6a952d",
  "1562259949-e8e7689d7828",
  "1504307651254-35680f356dfd",
  "1600585154340-be6161a56a0c",
  "1621905251189-08b45d6a269e",
  "1600607687939-ce8a6c25118c",
  "1581858726788-75bc0f6a952d",
  "1562259949-e8e7689d7828",
  "1504307651254-35680f356dfd",
] as const;

const GENERAL_CONTRACTOR = [
  "1504307651254-35680f356dfd",
  "1632207691143-643e2a9a9361",
  "1562259949-e8e7689d7828",
  "1581858726788-75bc0f6a952d",
  "1621905251189-08b45d6a269e",
  "1600585154340-be6161a56a0c",
  "1504307651254-35680f356dfd",
  "1632207691143-643e2a9a9361",
  "1621905251189-08b45d6a269e",
] as const;

const INTERIOR_DESIGN = [
  "1600585154340-be6161a56a0c",
  "1504307651254-35680f356dfd",
  "1562259949-e8e7689d7828",
  "1581858726788-75bc0f6a952d",
  "1621905251189-08b45d6a269e",
  "1600607687939-ce8a6c25118c",
  "1600585154340-be6161a56a0c",
  "1504307651254-35680f356dfd",
  "1562259949-e8e7689d7828",
] as const;

const MOVING = [
  "1600518464441-9154a4dea21b",
  "1504307651254-35680f356dfd",
  "1600585154340-be6161a56a0c",
  "1621905251189-08b45d6a269e",
  "1600607687939-ce8a6c25118c",
  "1607472586893-edb57bdc0e39",
  "1600518464441-9154a4dea21b",
  "1504307651254-35680f356dfd",
  "1600585154340-be6161a56a0c",
] as const;

const LOCKSMITH = [
  "1607472586893-edb57bdc0e39",
  "1581092580497-e0d23cbdf1dc",
  "1504328345606-18bbc8c9d7d1",
  "1558618666-fcd25c85cd64",
  "1621905251189-08b45d6a269e",
  "1504307651254-35680f356dfd",
  "1607472586893-edb57bdc0e39",
  "1581092580497-e0d23cbdf1dc",
  "1504328345606-18bbc8c9d7d1",
] as const;

const GARAGE_DOOR = [
  "1600585154340-be6161a56a0c",
  "1504307651254-35680f356dfd",
  "1621905251189-08b45d6a269e",
  "1632207691143-643e2a9a9361",
  "1600607687939-ce8a6c25118c",
  "1581092580497-e0d23cbdf1dc",
  "1600585154340-be6161a56a0c",
  "1504307651254-35680f356dfd",
  "1621905251189-08b45d6a269e",
] as const;

// --- Food service (chefs & kitchen staff at work) ---
const FOOD_SERVICE = [
  "1517248135467-4c7edcad34c4",
  "1414235077428-338989a2e8c0",
  "1504674900247-0877df9cc836",
  "1546069901-ba9599a7e63c",
  "1493770348161-369560ae357d",
  "1424847651672-bf20a4b0982b",
  "1555396273-367ea4eb4db5",
  "1556910103-1c02745aae4d",
  "1555939594-58d7cb561ad1",
] as const;

const CAFE = [
  "1495474472287-4d71bcdd2085",
  "1509042239860-f550ce710b93",
  "1517248135467-4c7edcad34c4",
  "1414235077428-338989a2e8c0",
  "1546069901-ba9599a7e63c",
  "1504674900247-0877df9cc836",
  "1495474472287-4d71bcdd2085",
  "1509042239860-f550ce710b93",
  "1517248135467-4c7edcad34c4",
] as const;

const BAKERY = [
  "1517433670267-08bbd4be890f",
  "1551024506-0bccd828d307",
  "1563805042-7684c019e1cb",
  "1504674900247-0877df9cc836",
  "1546069901-ba9599a7e63c",
  "1414235077428-338989a2e8c0",
  "1517433670267-08bbd4be890f",
  "1551024506-0bccd828d307",
  "1563805042-7684c019e1cb",
] as const;

// --- Beauty & wellness (stylists, trainers, therapists at work) ---
const HAIR_SALON = [
  "1521590832167-7bcbfaa6381f",
  "1560472354-b33ff0c44a43",
  "1503951914875-452162b0f3f1",
  "1604654894610-df63bc536371",
  "1521590832167-7bcbfaa6381f",
  "1560472354-b33ff0c44a43",
  "1503951914875-452162b0f3f1",
  "1604654894610-df63bc536371",
  "1521590832167-7bcbfaa6381f",
] as const;

const BARBERSHOP = [
  "1503951914875-452162b0f3f1",
  "1521590832167-7bcbfaa6381f",
  "1560472354-b33ff0c44a43",
  "1604654894610-df63bc536371",
  "1503951914875-452162b0f3f1",
  "1521590832167-7bcbfaa6381f",
  "1560472354-b33ff0c44a43",
  "1604654894610-df63bc536371",
  "1503951914875-452162b0f3f1",
] as const;

const NAIL_SALON = [
  "1604654894610-df63bc536371",
  "1521590832167-7bcbfaa6381f",
  "1560472354-b33ff0c44a43",
  "1503951914875-452162b0f3f1",
  "1604654894610-df63bc536371",
  "1521590832167-7bcbfaa6381f",
  "1560472354-b33ff0c44a43",
  "1503951914875-452162b0f3f1",
  "1604654894610-df63bc536371",
] as const;

const SPA = [
  "1540555700478-4be289fbecef",
  "1612349317150-e413f6a5b16d",
  "1518611012118-696072aa579a",
  "1540555700478-4be289fbecef",
  "1612349317150-e413f6a5b16d",
  "1518611012118-696072aa579a",
  "1540555700478-4be289fbecef",
  "1612349317150-e413f6a5b16d",
  "1518611012118-696072aa579a",
] as const;

const TATTOO = [
  "1503951914875-452162b0f3f1",
  "1521590832167-7bcbfaa6381f",
  "1560472354-b33ff0c44a43",
  "1604654894610-df63bc536371",
  "1503951914875-452162b0f3f1",
  "1521590832167-7bcbfaa6381f",
  "1560472354-b33ff0c44a43",
  "1604654894610-df63bc536371",
  "1503951914875-452162b0f3f1",
] as const;

const GYM = [
  "1534438327276-14e5300c3a48",
  "1518611012118-696072aa579a",
  "1517838277536-f5f99be501cd",
  "1506126613408-eca07ce68773",
  "1544367567-0f2fcb009e0b",
  "1534438327276-14e5300c3a48",
  "1518611012118-696072aa579a",
  "1517838277536-f5f99be501cd",
  "1506126613408-eca07ce68773",
] as const;

const PERSONAL_TRAINER = [
  "1518611012118-696072aa579a",
  "1534438327276-14e5300c3a48",
  "1517838277536-f5f99be501cd",
  "1506126613408-eca07ce68773",
  "1544367567-0f2fcb009e0b",
  "1518611012118-696072aa579a",
  "1534438327276-14e5300c3a48",
  "1517838277536-f5f99be501cd",
  "1506126613408-eca07ce68773",
] as const;

const YOGA = [
  "1544367567-0f2fcb009e0b",
  "1506126613408-eca07ce68773",
  "1518611012118-696072aa579a",
  "1517838277536-f5f99be501cd",
  "1534438327276-14e5300c3a48",
  "1544367567-0f2fcb009e0b",
  "1506126613408-eca07ce68773",
  "1518611012118-696072aa579a",
  "1517838277536-f5f99be501cd",
] as const;

// --- Healthcare (providers with patients / clinical work) ---
const DENTAL = [
  "1606811841689-23dfddce3e95",
  "1609840114035-3c981b782dfe",
  "1588776814546-1ffcf47267a5",
  "1606811841689-23dfddce3e95",
  "1609840114035-3c981b782dfe",
  "1588776814546-1ffcf47267a5",
  "1606811841689-23dfddce3e95",
  "1609840114035-3c981b782dfe",
  "1588776814546-1ffcf47267a5",
] as const;

const MED_SPA = [
  "1612349317150-e413f6a5b16d",
  "1540555700478-4be289fbecef",
  "1609840114035-3c981b782dfe",
  "1588776814546-1ffcf47267a5",
  "1612349317150-e413f6a5b16d",
  "1540555700478-4be289fbecef",
  "1609840114035-3c981b782dfe",
  "1588776814546-1ffcf47267a5",
  "1612349317150-e413f6a5b16d",
] as const;

const VET = [
  "1606811841689-23dfddce3e95",
  "1588776814546-1ffcf47267a5",
  "1609840114035-3c981b782dfe",
  "1521590832167-7bcbfaa6381f",
  "1606811841689-23dfddce3e95",
  "1588776814546-1ffcf47267a5",
  "1609840114035-3c981b782dfe",
  "1521590832167-7bcbfaa6381f",
  "1606811841689-23dfddce3e95",
] as const;

// --- Professional services (people in meetings / at desks) ---
const OFFICE_PRO = [
  "1454165804606-c3d57bc86b40",
  "1486312338219-ce68d2c6f44d",
  "1589829545856-d10d557cf95f",
  "1589994965851-a8f479c573a9",
  "1554224155-6726b3ff858f",
  "1556742049-0cfed4f6a45d",
  "1454165804606-c3d57bc86b40",
  "1486312338219-ce68d2c6f44d",
  "1589829545856-d10d557cf95f",
] as const;

const REAL_ESTATE = [
  "1560518883-ce09059eeffa",
  "1454165804606-c3d57bc86b40",
  "1486312338219-ce68d2c6f44d",
  "1589829545856-d10d557cf95f",
  "1554224155-6726b3ff858f",
  "1560518883-ce09059eeffa",
  "1454165804606-c3d57bc86b40",
  "1486312338219-ce68d2c6f44d",
  "1589829545856-d10d557cf95f",
] as const;

const MARKETING = [
  "1553877522-43269d4ea984",
  "1454165804606-c3d57bc86b40",
  "1486312338219-ce68d2c6f44d",
  "1552664730-d307ca884978",
  "1553877522-43269d4ea984",
  "1454165804606-c3d57bc86b40",
  "1486312338219-ce68d2c6f44d",
  "1552664730-d307ca884978",
  "1553877522-43269d4ea984",
] as const;

// --- Creative (photographers / videographers at work) ---
const PHOTOGRAPHY = [
  "1516035069371-29a1b244cc32",
  "1511285560929-80b456fea0bc",
  "1519741497674-611481863552",
  "1516035069371-29a1b244cc32",
  "1511285560929-80b456fea0bc",
  "1519741497674-611481863552",
  "1516035069371-29a1b244cc32",
  "1511285560929-80b456fea0bc",
  "1519741497674-611481863552",
] as const;

// --- Automotive (mechanics & technicians) ---
const AUTO = [
  "1619642751034-765dfdf7c58e",
  "1530046339160-ce3e530c7d2f",
  "1619642751034-765dfdf7c58e",
  "1530046339160-ce3e530c7d2f",
  "1504307651254-35680f356dfd",
  "1621905251189-08b45d6a269e",
  "1619642751034-765dfdf7c58e",
  "1530046339160-ce3e530c7d2f",
  "1619642751034-765dfdf7c58e",
] as const;

// --- Retail & service (staff helping customers / hands-on work) ---
const RETAIL_STAFF = [
  "1454165804606-c3d57bc86b40",
  "1486312338219-ce68d2c6f44d",
  "1517433670267-08bbd4be890f",
  "1551024506-0bccd828d307",
  "1521590832167-7bcbfaa6381f",
  "1454165804606-c3d57bc86b40",
  "1486312338219-ce68d2c6f44d",
  "1517433670267-08bbd4be890f",
  "1551024506-0bccd828d307",
] as const;

const FLORIST = [
  "1551024506-0bccd828d307",
  "1517433670267-08bbd4be890f",
  "1521590832167-7bcbfaa6381f",
  "1563805042-7684c019e1cb",
  "1504674900247-0877df9cc836",
  "1551024506-0bccd828d307",
  "1517433670267-08bbd4be890f",
  "1521590832167-7bcbfaa6381f",
  "1563805042-7684c019e1cb",
] as const;

// --- Education & community (teachers, caregivers, volunteers) ---
const EDUCATION = [
  "1522202176988-66273c2fd55f",
  "1516321318423-f06f85e504b3",
  "1522202176988-66273c2fd55f",
  "1516321318423-f06f85e504b3",
  "1454165804606-c3d57bc86b40",
  "1486312338219-ce68d2c6f44d",
  "1522202176988-66273c2fd55f",
  "1516321318423-f06f85e504b3",
  "1454165804606-c3d57bc86b40",
] as const;

const COMMUNITY = [
  "1519167758481-83f550bb49b3",
  "1529156069898-49953e39b3ac",
  "1522202176988-66273c2fd55f",
  "1516321318423-f06f85e504b3",
  "1454165804606-c3d57bc86b40",
  "1519167758481-83f550bb49b3",
  "1529156069898-49953e39b3ac",
  "1522202176988-66273c2fd55f",
  "1516321318423-f06f85e504b3",
] as const;

const EVENTS = [
  "1511795409834-ef04bbd61622",
  "1552664730-d307ca884978",
  "1519167758481-83f550bb49b3",
  "1529156069898-49953e39b3ac",
  "1454165804606-c3d57bc86b40",
  "1511795409834-ef04bbd61622",
  "1552664730-d307ca884978",
  "1519167758481-83f550bb49b3",
  "1529156069898-49953e39b3ac",
] as const;

const DEFAULT_WORK = [
  "1497366216548-37526070297c",
  "1454165804606-c3d57bc86b40",
  "1504307651254-35680f356dfd",
  "1621905251189-08b45d6a269e",
  "1585704032915-c3400ca199e7",
  "1607472586893-edb57bdc0e39",
  "1497366216548-37526070297c",
  "1454165804606-c3d57bc86b40",
  "1504307651254-35680f356dfd",
] as const;

// --- Hero option pools (3–5 verified IDs; one picked randomly per site build) ---
const PLUMBING_HEROES = [
  "1585704032915-c3400ca199e7",
  "1504328345606-18bbc8c9d7d1",
  "1504307651254-35680f356dfd",
  "1581092580497-e0d23cbdf1dc",
  "1607472586893-edb57bdc0e39",
] as const;

const ELECTRICIAN_HEROES = [
  "1621905251189-08b45d6a269e",
  "1558618666-fcd25c85cd64",
  "1581092580497-e0d23cbdf1dc",
  "1504307651254-35680f356dfd",
  "1565814329452-e1efa11c5b89",
] as const;

const LANDSCAPING_HEROES = [
  "1416879595882-3373a0480b5b",
  "1558904541-efa843a96f01",
  "1599629954294-16b7f0e8b4f0",
  "1592417817098-8fd3d9eb14a5",
  "1416879595882-3373a0480b5b",
] as const;

const RESTAURANT_HEROES = [
  "1517248135467-4c7edcad34c4",
  "1414235077428-338989a2e8c0",
  "1504674900247-0877df9cc836",
  "1493770348161-369560ae357d",
  "1424847651672-bf20a4b0982b",
] as const;

const HVAC_HEROES = [
  "1558618666-fcd25c85cd64",
  "1581092580497-e0d23cbdf1dc",
  "1621905251189-08b45d6a269e",
  "1504307651254-35680f356dfd",
  "1600607687939-ce8a6c25118c",
] as const;

const ROOFING_HEROES = [
  "1632207691143-643e2a9a9361",
  "1504307651254-35680f356dfd",
  "1562259949-e8e7689d7828",
  "1581858726788-75bc0f6a952d",
  "1600585154340-be6161a56a0c",
] as const;

const CLEANING_HEROES = [
  "1581578731548-c64695cc6952",
  "1563453392212-326f5e854473",
  "1600880292203-757bb62b4baf",
  "1607472586893-edb57bdc0e39",
  "1504328345606-18bbc8c9d7d1",
] as const;

const TRADE_HEROES = [
  "1504307651254-35680f356dfd",
  "1621905251189-08b45d6a269e",
  "1581092580497-e0d23cbdf1dc",
  "1600585154340-be6161a56a0c",
  "1600607687939-ce8a6c25118c",
] as const;

const CAFE_HEROES = [
  "1495474472287-4d71bcdd2085",
  "1509042239860-f550ce710b93",
  "1517248135467-4c7edcad34c4",
  "1414235077428-338989a2e8c0",
  "1546069901-ba9599a7e63c",
] as const;

const BAKERY_HEROES = [
  "1517433670267-08bbd4be890f",
  "1551024506-0bccd828d307",
  "1563805042-7684c019e1cb",
  "1504674900247-0877df9cc836",
  "1546069901-ba9599a7e63c",
] as const;

const SALON_HEROES = [
  "1521590832167-7bcbfaa6381f",
  "1503951914875-452162b0f3f1",
  "1560472354-b33ff0c44a43",
  "1604654894610-df63bc536371",
] as const;

const WELLNESS_HEROES = [
  "1540555700478-4be289fbecef",
  "1612349317150-e413f6a5b16d",
  "1518611012118-696072aa579a",
  "1534438327276-14e5300c3a48",
  "1544367567-0f2fcb009e0b",
] as const;

const FITNESS_HEROES = [
  "1534438327276-14e5300c3a48",
  "1518611012118-696072aa579a",
  "1517838277536-f5f99be501cd",
  "1506126613408-eca07ce68773",
  "1544367567-0f2fcb009e0b",
] as const;

const DENTAL_HEROES = [
  "1606811841689-23dfddce3e95",
  "1609840114035-3c981b782dfe",
  "1588776814546-1ffcf47267a5",
] as const;

const OFFICE_HEROES = [
  "1454165804606-c3d57bc86b40",
  "1486312338219-ce68d2c6f44d",
  "1589829545856-d10d557cf95f",
  "1589994965851-a8f479c573a9",
  "1554224155-6726b3ff858f",
] as const;

const AUTO_HEROES = [
  "1619642751034-765dfdf7c58e",
  "1530046339160-ce3e530c7d2f",
  "1504307651254-35680f356dfd",
  "1621905251189-08b45d6a269e",
] as const;

const CREATIVE_HEROES = [
  "1516035069371-29a1b244cc32",
  "1511285560929-80b456fea0bc",
  "1519741497674-611481863552",
  "1553877522-43269d4ea984",
] as const;

const RETAIL_HEROES = [
  "1454165804606-c3d57bc86b40",
  "1517433670267-08bbd4be890f",
  "1551024506-0bccd828d307",
  "1521590832167-7bcbfaa6381f",
] as const;

const EDUCATION_HEROES = [
  "1522202176988-66273c2fd55f",
  "1516321318423-f06f85e504b3",
  "1454165804606-c3d57bc86b40",
] as const;

const COMMUNITY_HEROES = [
  "1519167758481-83f550bb49b3",
  "1529156069898-49953e39b3ac",
  "1522202176988-66273c2fd55f",
  "1511795409834-ef04bbd61622",
  "1552664730-d307ca884978",
] as const;

const DEFAULT_HEROES = [
  "1497366216548-37526070297c",
  "1454165804606-c3d57bc86b40",
  "1504307651254-35680f356dfd",
  "1621905251189-08b45d6a269e",
  "1585704032915-c3400ca199e7",
] as const;

const SLOT_MAP = {
  Plumbing: PLUMBING,
  HVAC: HVAC,
  Electrician: ELECTRICIAN,
  Roofing: ROOFING,
  Landscaping: LANDSCAPING,
  "Cleaning Service": CLEANING,
  "Pest Control": PEST_CONTROL,
  "Pool Service": POOL_SERVICE,
  Painting: PAINTING,
  Flooring: FLOORING,
  "General Contractor": GENERAL_CONTRACTOR,
  "Interior Design": INTERIOR_DESIGN,
  "Moving Company": MOVING,
  Locksmith: LOCKSMITH,
  "Garage Door": GARAGE_DOOR,
  Restaurant: FOOD_SERVICE,
  Cafe: CAFE,
  Bakery: BAKERY,
  "Bar & Nightclub": FOOD_SERVICE,
  "Food Truck": FOOD_SERVICE,
  Catering: FOOD_SERVICE,
  Pizza: FOOD_SERVICE,
  Seafood: FOOD_SERVICE,
  BBQ: FOOD_SERVICE,
  "Juice Bar": CAFE,
  "Hair Salon": HAIR_SALON,
  Barbershop: BARBERSHOP,
  "Nail Salon": NAIL_SALON,
  "Spa & Massage": SPA,
  "Tattoo Studio": TATTOO,
  "Gym & Fitness": GYM,
  "Personal Trainer": PERSONAL_TRAINER,
  "Yoga Studio": YOGA,
  Dental: DENTAL,
  Orthodontist: DENTAL,
  Chiropractor: DENTAL,
  Optometrist: DENTAL,
  Veterinarian: VET,
  "Med Spa": MED_SPA,
  "Law Firm": OFFICE_PRO,
  Accounting: OFFICE_PRO,
  "Real Estate": REAL_ESTATE,
  Insurance: OFFICE_PRO,
  "Financial Advisor": OFFICE_PRO,
  "Marketing Agency": MARKETING,
  Photography: PHOTOGRAPHY,
  Videography: PHOTOGRAPHY,
  Consulting: OFFICE_PRO,
  "Auto Repair": AUTO,
  "Car Detailing": AUTO,
  Towing: AUTO,
  "Auto Body Shop": AUTO,
  "Tire Shop": AUTO,
  "Oil Change": AUTO,
  Boutique: RETAIL_STAFF,
  "Jewelry Store": RETAIL_STAFF,
  Florist: FLORIST,
  "Gift Shop": RETAIL_STAFF,
  Tutoring: EDUCATION,
  Daycare: EDUCATION,
  Church: COMMUNITY,
  Nonprofit: COMMUNITY,
  "Event Planning": EVENTS,
  "DJ & Entertainment": EVENTS,
  Other: DEFAULT_WORK,
} as const;

export const INDUSTRY_SLOT_IDS: Record<string, IndustryImageSlotIds> =
  Object.fromEntries(
    Object.entries(SLOT_MAP).map(([name, ids]) => [name, extractSlots(ids)]),
  );

export const INDUSTRY_HERO_OPTIONS: Record<string, readonly string[]> = {
  Plumbing: PLUMBING_HEROES,
  HVAC: HVAC_HEROES,
  Electrician: ELECTRICIAN_HEROES,
  Roofing: ROOFING_HEROES,
  Landscaping: LANDSCAPING_HEROES,
  "Cleaning Service": CLEANING_HEROES,
  "Pest Control": CLEANING_HEROES,
  "Pool Service": TRADE_HEROES,
  Painting: TRADE_HEROES,
  Flooring: TRADE_HEROES,
  "General Contractor": TRADE_HEROES,
  "Interior Design": TRADE_HEROES,
  "Moving Company": TRADE_HEROES,
  Locksmith: TRADE_HEROES,
  "Garage Door": TRADE_HEROES,
  Restaurant: RESTAURANT_HEROES,
  Cafe: CAFE_HEROES,
  Bakery: BAKERY_HEROES,
  "Bar & Nightclub": RESTAURANT_HEROES,
  "Food Truck": RESTAURANT_HEROES,
  Catering: RESTAURANT_HEROES,
  Pizza: RESTAURANT_HEROES,
  Seafood: RESTAURANT_HEROES,
  BBQ: RESTAURANT_HEROES,
  "Juice Bar": CAFE_HEROES,
  "Hair Salon": SALON_HEROES,
  Barbershop: SALON_HEROES,
  "Nail Salon": SALON_HEROES,
  "Spa & Massage": WELLNESS_HEROES,
  "Tattoo Studio": SALON_HEROES,
  "Gym & Fitness": FITNESS_HEROES,
  "Personal Trainer": FITNESS_HEROES,
  "Yoga Studio": FITNESS_HEROES,
  Dental: DENTAL_HEROES,
  Orthodontist: DENTAL_HEROES,
  Chiropractor: DENTAL_HEROES,
  Optometrist: DENTAL_HEROES,
  Veterinarian: DENTAL_HEROES,
  "Med Spa": WELLNESS_HEROES,
  "Law Firm": OFFICE_HEROES,
  Accounting: OFFICE_HEROES,
  "Real Estate": OFFICE_HEROES,
  Insurance: OFFICE_HEROES,
  "Financial Advisor": OFFICE_HEROES,
  "Marketing Agency": CREATIVE_HEROES,
  Photography: CREATIVE_HEROES,
  Videography: CREATIVE_HEROES,
  Consulting: OFFICE_HEROES,
  "Auto Repair": AUTO_HEROES,
  "Car Detailing": AUTO_HEROES,
  Towing: AUTO_HEROES,
  "Auto Body Shop": AUTO_HEROES,
  "Tire Shop": AUTO_HEROES,
  "Oil Change": AUTO_HEROES,
  Boutique: RETAIL_HEROES,
  "Jewelry Store": RETAIL_HEROES,
  Florist: RETAIL_HEROES,
  "Gift Shop": RETAIL_HEROES,
  Tutoring: EDUCATION_HEROES,
  Daycare: EDUCATION_HEROES,
  Church: COMMUNITY_HEROES,
  Nonprofit: COMMUNITY_HEROES,
  "Event Planning": COMMUNITY_HEROES,
  "DJ & Entertainment": COMMUNITY_HEROES,
  Other: DEFAULT_HEROES,
};

export const INDUSTRY_IMAGE_SETS: Record<string, IndustryImageSet> =
  Object.fromEntries(
    Object.entries(INDUSTRY_SLOT_IDS).map(([name, slots]) => [
      name,
      buildImageSet(INDUSTRY_HERO_OPTIONS[name]![0]!, slots),
    ]),
  );

export const DEFAULT_IMAGE_SET = INDUSTRY_IMAGE_SETS.Other!;

import { URL } from "node:url";

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const GENERIC_EMAIL_LOCALS = new Set([
  "info",
  "contact",
  "admin",
  "support",
  "sales",
  "hello",
  "office",
  "help",
  "service",
  "services",
  "team",
  "mail",
  "noreply",
  "no-reply",
  "donotreply",
  "webmaster",
  "marketing",
  "billing",
  "accounts",
  "enquiries",
  "inquiries",
]);

const BLOCKED_EMAIL_DOMAINS = new Set([
  "example.com",
  "email.com",
  "domain.com",
  "sentry.io",
  "wixpress.com",
  "users.noreply.github.com",
  "facebook.com",
  "instagram.com",
  "google.com",
  "yelp.com",
]);

const FETCH_TIMEOUT_MS = 12_000;

const WEBSITE_CONTACT_PATHS = [
  "",
  "/contact",
  "/contact-us",
  "/contact.html",
  "/about",
  "/about-us",
  "/about.html",
  "/get-in-touch",
];

export type ContactScrapeResult = {
  emails: string[];
  ownerEmail: string | null;
  ownerName: string | null;
  phone: string | null;
  source: "website" | "hunter" | "customSearch" | null;
  errors: string[];
};

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

function extractDomain(urlString: string | null): string | null {
  if (!urlString) {
    return null;
  }

  try {
    const url = new URL(urlString.startsWith("http") ? urlString : `https://${urlString}`);
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function isValidEmail(email: string): boolean {
  const normalized = email.toLowerCase().trim();
  const [, domain] = normalized.split("@");

  if (!domain || BLOCKED_EMAIL_DOMAINS.has(domain)) {
    return false;
  }

  if (/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(domain)) {
    return false;
  }

  return true;
}

export function extractEmailsFromText(text: string): string[] {
  const deobfuscated = text
    .replace(/\s*\(\s*at\s*\)\s*/gi, "@")
    .replace(/\s*\[\s*at\s*\]\s*/gi, "@")
    .replace(/\s+at\s+/gi, "@")
    .replace(/\s*\(\s*dot\s*\)\s*/gi, ".")
    .replace(/\s*\[\s*dot\s*\]\s*/gi, ".")
    .replace(/\s+dot\s+/gi, ".");

  const matches = deobfuscated.match(EMAIL_REGEX) ?? [];
  const mailtoMatches = [
    ...text.matchAll(
      /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
    ),
  ].map((match) => match[1]);

  const jsonLdEmails: string[] = [];

  for (const block of text.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const parsed = JSON.parse(block[1]) as unknown;
      collectJsonLdEmails(parsed, jsonLdEmails);
    } catch {
      // ignore malformed JSON-LD
    }
  }

  return uniqueStrings(
    [...matches, ...mailtoMatches, ...jsonLdEmails].map((email) =>
      email.replace(/[.,;:!?)]+$/, "").toLowerCase(),
    ),
  ).filter(isValidEmail);
}

function collectJsonLdEmails(node: unknown, out: string[]): void {
  if (!node) {
    return;
  }

  if (typeof node === "string") {
    if (node.includes("@")) {
      out.push(...(node.match(EMAIL_REGEX) ?? []));
    }

    return;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      collectJsonLdEmails(item, out);
    }

    return;
  }

  if (typeof node === "object") {
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (key === "email" && typeof value === "string") {
        out.push(value);
      } else {
        collectJsonLdEmails(value, out);
      }
    }
  }
}

function scoreOwnerEmail(email: string, businessDomain: string | null): number {
  const normalized = email.toLowerCase();
  const [localPart, domain] = normalized.split("@");

  if (!localPart || !domain) {
    return -100;
  }

  let score = 0;

  if (businessDomain && domain === businessDomain) {
    score += 30;
  }

  if (localPart === "owner") {
    score += 50;
  } else if (GENERIC_EMAIL_LOCALS.has(localPart)) {
    score -= 40;
  } else if (localPart.includes(".")) {
    score += 25;
  } else if (localPart.length >= 3 && localPart.length <= 20) {
    score += 15;
  }

  if (localPart.includes("owner") || localPart.includes("ceo")) {
    score += 20;
  }

  return score;
}

export function pickBestOwnerEmail(
  emails: string[],
  website: string | null,
): string | null {
  const unique = uniqueStrings(emails).filter(isValidEmail);

  if (unique.length === 0) {
    return null;
  }

  const businessDomain = extractDomain(website);

  return unique
    .slice()
    .sort(
      (a, b) =>
        scoreOwnerEmail(b, businessDomain) - scoreOwnerEmail(a, businessDomain),
    )[0];
}

async function fetchWithTimeout(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; WebMeBot/1.0; +https://webme.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      return null;
    }

    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function scrapeWebsiteForEmails(website: string): Promise<string[]> {
  let baseUrl: URL;

  try {
    baseUrl = new URL(website.startsWith("http") ? website : `https://${website}`);
  } catch {
    return [];
  }

  const collected: string[] = [];

  for (const path of WEBSITE_CONTACT_PATHS) {
    try {
      const pageUrl = new URL(path || "/", baseUrl).toString();
      const html = await fetchWithTimeout(pageUrl);

      if (html) {
        collected.push(...extractEmailsFromText(html));
      }
    } catch {
      // try next path
    }
  }

  return uniqueStrings(collected);
}

async function runCustomSearch(
  query: string,
  numResults: number,
): Promise<Array<{ link?: string; title?: string; snippet?: string }>> {
  const apiKey =
    getOptionalEnv("GOOGLE_CUSTOM_SEARCH_API_KEY") ??
    getOptionalEnv("GOOGLE_PLACES_API_KEY");
  const cx = getOptionalEnv("GOOGLE_CUSTOM_SEARCH_ENGINE_ID");

  if (!apiKey || !cx) {
    return [];
  }

  const params = new URLSearchParams({
    key: apiKey,
    cx,
    q: query,
    num: String(Math.min(Math.max(numResults, 1), 10)),
  });

  const response = await fetch(
    `https://customsearch.googleapis.com/customsearch/v1?${params}`,
  );

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as {
    items?: Array<{ link?: string; title?: string; snippet?: string }>;
  };

  return data.items ?? [];
}

export async function scrapeEmailsFromCustomSearch(
  businessName: string,
  city: string,
): Promise<string[]> {
  const items = await runCustomSearch(
    `"${businessName}" ${city} email contact`,
    3,
  );
  const collected: string[] = [];

  for (const item of items.slice(0, 3)) {
    if (item.snippet) {
      collected.push(...extractEmailsFromText(item.snippet));
    }

    if (item.title) {
      collected.push(...extractEmailsFromText(item.title));
    }

    if (item.link) {
      const html = await fetchWithTimeout(item.link);

      if (html) {
        collected.push(...extractEmailsFromText(html));
      }
    }
  }

  return uniqueStrings(collected);
}

function extractOwnerNameFromText(text: string): string | null {
  const patterns = [
    /(?:owner|owned by|founder|founded by|president|ceo)\s*[:\-–—]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\s*,?\s*(?:owner|founder|president|ceo)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      const name = match[1].trim();

      if (name.length >= 3 && name.length <= 48) {
        return name;
      }
    }
  }

  return null;
}

export async function findOwnerNameViaCustomSearch(
  businessName: string,
  city: string,
): Promise<string | null> {
  const items = await runCustomSearch(`"${businessName}" ${city} owner`, 3);

  for (const item of items) {
    const fromSnippet = item.snippet
      ? extractOwnerNameFromText(item.snippet)
      : null;

    if (fromSnippet) {
      return fromSnippet;
    }

    const fromTitle = item.title ? extractOwnerNameFromText(item.title) : null;

    if (fromTitle) {
      return fromTitle;
    }

    if (item.link) {
      const html = await fetchWithTimeout(item.link);

      if (html) {
        const fromPage = extractOwnerNameFromText(html);

        if (fromPage) {
          return fromPage;
        }
      }
    }
  }

  return null;
}

export async function scrapeHunterContacts(
  website: string | null,
): Promise<{ ownerName: string | null; ownerEmail: string | null; emails: string[] }> {
  const apiKey = getOptionalEnv("HUNTER_API_KEY");
  const domain = extractDomain(website);

  if (!apiKey || !domain) {
    return { ownerName: null, ownerEmail: null, emails: [] };
  }

  try {
    const response = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&limit=10&api_key=${apiKey}`,
    );

    if (!response.ok) {
      return { ownerName: null, ownerEmail: null, emails: [] };
    }

    const data = (await response.json()) as {
      data?: {
        emails?: Array<{
          value?: string;
          confidence?: number;
          first_name?: string;
          last_name?: string;
          position?: string;
        }>;
      };
    };

    const emails = uniqueStrings(
      (data.data?.emails ?? []).map((entry) => entry.value ?? null),
    );

    const best = (data.data?.emails ?? [])
      .slice()
      .sort((a, b) => {
        const aOwner = /(owner|founder|ceo|president)/i.test(a.position ?? "")
          ? 1
          : 0;
        const bOwner = /(owner|founder|ceo|president)/i.test(b.position ?? "")
          ? 1
          : 0;

        if (aOwner !== bOwner) {
          return bOwner - aOwner;
        }

        return (b.confidence ?? 0) - (a.confidence ?? 0);
      })[0];

    const ownerName =
      uniqueStrings([
        [best?.first_name, best?.last_name].filter(Boolean).join(" "),
      ])[0] ?? null;

    return {
      ownerName,
      ownerEmail: best?.value ?? null,
      emails,
    };
  } catch {
    return { ownerName: null, ownerEmail: null, emails: [] };
  }
}

export async function scrapeContactInfo(input: {
  businessName: string;
  city: string;
  website: string | null;
  phone: string | null;
}): Promise<ContactScrapeResult> {
  const errors: string[] = [];
  const allEmails: string[] = [];
  let hunterOwnerName: string | null = null;
  let customSearchOwnerName: string | null = null;
  const phone = input.phone;

  let websiteEmails: string[] = [];

  // Step 1: Scrape the business website (homepage, /contact, /about, etc.)
  if (input.website) {
    try {
      websiteEmails = await scrapeWebsiteForEmails(input.website);
      allEmails.push(...websiteEmails);
    } catch (error) {
      errors.push(
        `websiteScrape: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  let ownerEmail = pickBestOwnerEmail(websiteEmails, input.website);
  let source: "website" | "hunter" | "customSearch" | null = ownerEmail
    ? "website"
    : null;

  // Step 2: Hunter.io domain search — only when website scrape found no email
  if (!ownerEmail && input.website) {
    const hunter = await scrapeHunterContacts(input.website);

    if (hunter.emails.length === 0 && !hunter.ownerEmail) {
      const apiKey = getOptionalEnv("HUNTER_API_KEY");

      if (!apiKey) {
        errors.push("hunter: HUNTER_API_KEY not configured");
      } else if (!extractDomain(input.website)) {
        errors.push("hunter: could not parse domain from website URL");
      } else {
        errors.push("hunter: no emails returned for domain");
      }
    }

    hunterOwnerName = hunter.ownerName;
    allEmails.push(...hunter.emails);

    const hunterPick =
      pickBestOwnerEmail(hunter.emails, input.website) ?? hunter.ownerEmail;

    if (hunterPick) {
      ownerEmail = hunterPick;
      source = "hunter";
    }
  }

  // Step 3: Google Custom Search — last resort if still no email
  if (!ownerEmail) {
    try {
      const searchEmails = await scrapeEmailsFromCustomSearch(
        input.businessName,
        input.city,
      );
      allEmails.push(...searchEmails);

      const searchPick = pickBestOwnerEmail(searchEmails, input.website);

      if (searchPick) {
        ownerEmail = searchPick;
        source = "customSearch";
      }
    } catch (error) {
      errors.push(
        `customSearchEmail: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  try {
    customSearchOwnerName = await findOwnerNameViaCustomSearch(
      input.businessName,
      input.city,
    );
  } catch (error) {
    errors.push(
      `customSearchOwner: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const ownerName = hunterOwnerName ?? customSearchOwnerName;

  console.log("[scrapeContactInfo]", {
    businessName: input.businessName,
    city: input.city,
    website: input.website ?? null,
    emailsFound: uniqueStrings(allEmails).length,
    ownerEmail: ownerEmail ?? null,
    ownerName: ownerName ?? null,
    source,
    phone: phone ?? null,
    errors: errors.length,
  });

  return {
    emails: uniqueStrings(allEmails),
    ownerEmail,
    ownerName,
    phone,
    source,
    errors,
  };
}

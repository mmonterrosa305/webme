const SUNBIZ_SEARCH_URL = "https://search.sunbiz.org/Inquiry/CorporationSearch/SearchResults";
const SUNBIZ_DETAIL_BASE = "https://search.sunbiz.org";
const FETCH_TIMEOUT_MS = 15000;

export type SunbizResult = {
  ownerName: string | null;
  ownerEmail: string | null;
  registeredAgent: string | null;
  address: string | null;
  status: string | null;
};

async function fetchWithTimeout(url: string, options?: RequestInit): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml",
        ...options?.headers,
      },
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function extractEmails(text: string): string[] {
  const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) ?? [];
  return [...new Set(matches)].filter(email => 
    !email.includes("sunbiz") && 
    !email.includes("dos.myflorida") &&
    !email.endsWith(".png") &&
    !email.endsWith(".jpg")
  );
}

function extractName(html: string, label: string): string | null {
  const regex = new RegExp(`${label}[^<]*<[^>]+>([^<]+)<`, "i");
  const match = html.match(regex);
  return match?.[1]?.trim() || null;
}

export async function scrapeSunbiz(businessName: string): Promise<SunbizResult> {
  const empty: SunbizResult = {
    ownerName: null,
    ownerEmail: null,
    registeredAgent: null,
    address: null,
    status: null,
  };

  try {
    // Search for the business
    const searchParams = new URLSearchParams({
      SearchTerm: businessName,
      SearchType: "EntityName",
      SearchNameOrder: "CONTAINS",
    });

    const searchHtml = await fetchWithTimeout(
      `${SUNBIZ_SEARCH_URL}?${searchParams}`,
    );
    if (!searchHtml) return empty;

    // Find first result link
    const linkMatch = searchHtml.match(/href="(\/Inquiry\/CorporationSearch\/SearchResultDetail[^"]+)"/i);
    if (!linkMatch) return empty;

    const detailUrl = `${SUNBIZ_DETAIL_BASE}${linkMatch[1]}`;
    const detailHtml = await fetchWithTimeout(detailUrl);
    if (!detailHtml) return empty;

    // Extract owner/officer names
    const officerMatch = detailHtml.match(/(?:officer\/director|registered agent)[^<]*<\/span>[^<]*<span[^>]*>([^<]+)<\/span>/gi);
    const ownerName = officerMatch?.[0]
      ? officerMatch[0].replace(/<[^>]+>/g, "").replace(/officer\/director|registered agent/gi, "").trim()
      : null;

    // Extract registered agent
    const agentMatch = detailHtml.match(/Registered Agent[^<]*<\/[^>]+>\s*<[^>]+>([^<]+)<\/[^>]+>/i);
    const registeredAgent = agentMatch?.[1]?.trim() || null;

    // Extract address
    const addressMatch = detailHtml.match(/Principal Address[^<]*<\/[^>]+>\s*<[^>]+>([^<]+)<\/[^>]+>/i);
    const address = addressMatch?.[1]?.trim() || null;

    // Extract status
    const statusMatch = detailHtml.match(/Status[^<]*<\/[^>]+>\s*<[^>]+>([^<]+)<\/[^>]+>/i);
    const status = statusMatch?.[1]?.trim() || null;

    // Extract any emails
    const emails = extractEmails(detailHtml);
    const ownerEmail = emails[0] || null;

    return {
      ownerName: ownerName || registeredAgent,
      ownerEmail,
      registeredAgent,
      address,
      status,
    };
  } catch {
    return empty;
  }
}

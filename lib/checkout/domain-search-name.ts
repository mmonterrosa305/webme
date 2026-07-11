/**
 * Build a Namecheap-friendly domain search string from a business name.
 * e.g. "Moreno Pool Service" → "morenopool"
 */
export function cleanBusinessNameForDomainSearch(businessName: string): string {
  const words = businessName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const cleaned = words.slice(0, 2).join("");
  return cleaned || "mybusiness";
}

export function buildNamecheapDomainSearchUrl(businessName: string): string {
  const query = cleanBusinessNameForDomainSearch(businessName);
  return `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(query)}`;
}

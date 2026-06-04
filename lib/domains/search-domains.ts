import { DOMAIN_SEARCH_TLDS } from "./constants";
import { checkDomainsWithPricing } from "./domscan";
import { generateDomainVariations } from "./generate-variations";

export type DomainSearchResult = {
  domain: string;
  tld: string;
  available: boolean;
  pricePerYear: number | null;
  currency: string;
  isSuggestion: boolean;
};

export async function searchDomainsWithSuggestions(
  query: string,
): Promise<{
  results: DomainSearchResult[];
  suggestions: DomainSearchResult[];
}> {
  const primary = await checkDomainsWithPricing(query, DOMAIN_SEARCH_TLDS);
  const primaryResults: DomainSearchResult[] = primary.map((item) => ({
    ...item,
    isSuggestion: false,
  }));

  const allPrimaryTaken = primaryResults.every((item) => !item.available);

  if (!allPrimaryTaken) {
    return { results: primaryResults, suggestions: [] };
  }

  const variations = generateDomainVariations(query);
  const suggestionChecks = await Promise.all(
    variations.map((name) => checkDomainsWithPricing(name, ["com"])),
  );

  const suggestions: DomainSearchResult[] = suggestionChecks
    .map((items) => items[0])
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .map((item) => ({
      ...item,
      isSuggestion: true,
    }));

  return { results: primaryResults, suggestions };
}

import { normalizeDomainQuery } from "./constants";

const PREFIXES = ["get", "go", "try", "my"] as const;
const SUFFIXES = ["pro", "hq", "co", "online"] as const;

export function generateDomainVariations(baseName: string): string[] {
  const term = normalizeDomainQuery(baseName);

  if (!term) {
    return [];
  }

  const candidates = new Set<string>();

  for (const prefix of PREFIXES) {
    if (term.startsWith(prefix)) {
      continue;
    }

    if (prefix === "my" && term.startsWith("the") && term.length > 5) {
      candidates.add(`my${term.slice(3)}`);
      continue;
    }

    candidates.add(`${prefix}${term}`);
  }

  for (const suffix of SUFFIXES) {
    candidates.add(`${term}${suffix}`);
  }

  if (term.endsWith("s") && term.length > 4) {
    candidates.add(`${term.slice(0, -1)}pro`);
  }

  if (term.startsWith("the") && term.length > 5) {
    candidates.add(`${term.slice(3)}pro`);
  }

  return [...candidates]
    .filter((name) => name.length >= 2 && name.length <= 63)
    .slice(0, 6);
}

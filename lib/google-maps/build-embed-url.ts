export function getGoogleMapsEmbedApiKey(): string | null {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();

  if (!key || key.startsWith("your_")) {
    return null;
  }

  return key;
}

export function isValidBusinessAddress(address?: string | null): boolean {
  const value = address?.trim() ?? "";

  if (value.length < 5) {
    return false;
  }

  if (/^(n\/?a|none|unknown|tbd)$/i.test(value)) {
    return false;
  }

  const wordCount = value.split(/\s+/).filter(Boolean).length;
  return wordCount >= 2 || /\d/.test(value) || value.includes(",");
}

export function buildGoogleMapsEmbedUrl(address: string): string | null {
  const key = getGoogleMapsEmbedApiKey();
  const query = address.trim();

  if (!key || !isValidBusinessAddress(query)) {
    return null;
  }

  const params = new URLSearchParams({
    key,
    q: query,
  });

  return `https://www.google.com/maps/embed/v1/place?${params.toString()}`;
}

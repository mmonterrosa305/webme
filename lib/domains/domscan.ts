import { DOMAIN_SEARCH_TLDS } from "./constants";

const DOMSCAN_BASE_URL = "https://domscan.net";

export type DomainCheckResult = {
  domain: string;
  tld: string;
  available: boolean;
  pricePerYear: number | null;
  currency: string;
};

function getDomScanApiKey(): string {
  const key = process.env.DOMSCAN_API_KEY?.trim();

  if (!key || key.startsWith("your_")) {
    throw new Error("Missing DOMSCAN_API_KEY environment variable.");
  }

  return key;
}

async function domScanFetch(path: string): Promise<unknown> {
  const response = await fetch(`${DOMSCAN_BASE_URL}${path}`, {
    headers: {
      Accept: "application/json",
      "X-API-Key": getDomScanApiKey(),
    },
    cache: "no-store",
  });

  const payload = (await response.json()) as {
    error?: { message?: string };
    message?: string;
  };

  if (!response.ok) {
    throw new Error(
      payload.error?.message ??
        payload.message ??
        `DomScan request failed (${response.status}).`,
    );
  }

  return payload;
}

type DomScanStatusResult = {
  domain: string;
  tld: string;
  available: boolean;
};

type DomScanStatusResponse = {
  results?: DomScanStatusResult[];
};

type DomScanPriceEntry = {
  tld: string;
  cheapest?: {
    register?: {
      price?: number;
    };
  };
  prices?: Array<{
    register?: number;
    currency?: string;
  }>;
};

type DomScanPricesResponse = {
  success?: boolean;
  data?: {
    results?: DomScanPriceEntry[];
  };
};

function getCheapestRegisterPrice(entry: DomScanPriceEntry): {
  price: number | null;
  currency: string;
} {
  const cheapest = entry.cheapest?.register?.price;
  if (typeof cheapest === "number") {
    return { price: cheapest, currency: "USD" };
  }

  const prices = entry.prices ?? [];
  const registerPrices = prices
    .map((item) => item.register)
    .filter((value): value is number => typeof value === "number");

  if (registerPrices.length === 0) {
    return { price: null, currency: "USD" };
  }

  return {
    price: Math.min(...registerPrices),
    currency: prices[0]?.currency ?? "USD",
  };
}

export async function checkDomainsWithPricing(
  name: string,
  tlds: readonly string[] = DOMAIN_SEARCH_TLDS,
): Promise<DomainCheckResult[]> {
  const tldList = tlds.join(",");
  const encodedName = encodeURIComponent(name);

  const [statusPayload, pricesPayload] = await Promise.all([
    domScanFetch(
      `/v1/status?name=${encodedName}&tlds=${tldList}&prefer_cache=1`,
    ),
    domScanFetch(`/v1/prices?tlds=${tldList}`),
  ]);

  const statusResponse = statusPayload as DomScanStatusResponse;
  const pricesResponse = pricesPayload as DomScanPricesResponse;

  const priceByTld = new Map<string, { price: number | null; currency: string }>();

  for (const entry of pricesResponse.data?.results ?? []) {
    priceByTld.set(entry.tld, getCheapestRegisterPrice(entry));
  }

  const results = statusResponse.results ?? [];

  return tlds.map((tld) => {
    const status = results.find((item) => item.tld === tld);
    const pricing = priceByTld.get(tld);

    return {
      domain: status?.domain ?? `${name}.${tld}`,
      tld,
      available: Boolean(status?.available),
      pricePerYear: pricing?.price ?? null,
      currency: pricing?.currency ?? "USD",
    };
  });
}

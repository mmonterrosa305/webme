import { NextResponse } from "next/server";

import {
  ClientAuthError,
  requirePortalClient,
} from "@/lib/client-auth/require-portal-client";
import {
  isDomainClaimEligiblePlan,
  normalizeDomainQuery,
} from "@/lib/domains/constants";
import { searchDomainsWithSuggestions } from "@/lib/domains/search-domains";

export async function POST(request: Request) {
  try {
    const { client } = await requirePortalClient();

    if (!isDomainClaimEligiblePlan(client.package)) {
      return NextResponse.json(
        { error: "Your plan does not include custom domains." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as { query?: string };
    const query = normalizeDomainQuery(body.query ?? "");

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: "Enter at least 2 characters to search." },
        { status: 400 },
      );
    }

    const { results, suggestions } = await searchDomainsWithSuggestions(query);

    return NextResponse.json({ query, results, suggestions });
  } catch (error) {
    if (error instanceof ClientAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message =
      error instanceof Error ? error.message : "Failed to check domains.";

    console.error("[client/domains/check POST]", message);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

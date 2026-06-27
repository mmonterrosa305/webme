import { NextResponse } from "next/server";

import { getPlanDisplayName } from "@/lib/client-auth/constants";
import {
  ClientAuthError,
  requirePortalClient,
} from "@/lib/client-auth/require-portal-client";
import {
  getDomainPriceLimit,
  isDomainClaimEligiblePlan,
  normalizeDomainQuery,
} from "@/lib/domains/constants";
import { checkDomainsWithPricing } from "@/lib/domains/domscan";
import { sendDomainRequestAdminEmail } from "@/lib/domains/send-domain-request-admin-email";
import { createAdminClient } from "@/lib/supabase/admin";

const DOMAIN_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.(?:com|net|org|io)$/;

export async function POST(request: Request) {
  try {
    const { email, client } = await requirePortalClient();

    if (!isDomainClaimEligiblePlan(client.package)) {
      return NextResponse.json(
        { error: "Your plan does not include custom domains." },
        { status: 403 },
      );
    }

    if (client.domain_status === "active") {
      return NextResponse.json(
        { error: "You already have an active domain." },
        { status: 409 },
      );
    }

    if (client.domain_status === "pending" && client.domain_requested) {
      return NextResponse.json(
        { error: "You already have a pending domain request." },
        { status: 409 },
      );
    }

    const body = (await request.json()) as {
      domain?: string;
      pricePerYear?: number;
    };

    const domain = body.domain?.trim().toLowerCase();
    const pricePerYear = body.pricePerYear;

    if (!domain || !DOMAIN_PATTERN.test(domain)) {
      return NextResponse.json(
        { error: "Enter a valid .com, .net, or .org domain." },
        { status: 400 },
      );
    }

    if (typeof pricePerYear !== "number" || pricePerYear <= 0) {
      return NextResponse.json(
        { error: "Invalid domain price." },
        { status: 400 },
      );
    }

    const priceLimit = getDomainPriceLimit(client.package);
    if (pricePerYear > priceLimit) {
      return NextResponse.json(
        {
          error:
            client.package === "starter"
              ? "This domain exceeds your legacy plan limit. Contact support."
              : "This domain exceeds your plan limit. Contact support.",
        },
        { status: 403 },
      );
    }

    const query = normalizeDomainQuery(domain);
    if (!query) {
      return NextResponse.json(
        { error: "Invalid domain name." },
        { status: 400 },
      );
    }

    const availability = await checkDomainsWithPricing(query);
    const match = availability.find((item) => item.domain === domain);

    if (!match?.available) {
      return NextResponse.json(
        { error: "That domain is no longer available." },
        { status: 409 },
      );
    }

    const supabase = createAdminClient();
    const { error: updateError } = await supabase
      .from("clients")
      .update({
        domain_requested: domain,
        domain_status: "pending",
      })
      .eq("id", client.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    await sendDomainRequestAdminEmail({
      businessName: client.business_name,
      clientEmail: email,
      domain,
      pricePerYear,
      plan: getPlanDisplayName(client.package),
    });

    return NextResponse.json({
      success: true,
      domain,
      message:
        "Your domain request has been submitted! We'll have it live within 24 hours.",
    });
  } catch (error) {
    if (error instanceof ClientAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message =
      error instanceof Error ? error.message : "Failed to submit domain request.";

    console.error("[client/domains/claim POST]", message);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

import {
  isValidCheckoutDomain,
  normalizeCheckoutDomain,
} from "@/lib/checkout/normalize-domain";
import { getClientBySiteSlug } from "@/lib/clients/get-client-by-site-slug";
import { sendDomainRequestAdminEmail } from "@/lib/domains/send-domain-request-admin-email";
import { getPlanDisplayName } from "@/lib/client-auth/constants";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      slug?: string;
      domain?: string;
    };

    const slug = body.slug?.trim();
    const domain = normalizeCheckoutDomain(body.domain ?? "");

    if (!slug) {
      return NextResponse.json({ error: "slug is required." }, { status: 400 });
    }

    if (!domain || !isValidCheckoutDomain(domain)) {
      return NextResponse.json(
        { error: "Enter a valid domain (e.g. yoursite.com)." },
        { status: 400 },
      );
    }

    const client = await getClientBySiteSlug(slug);

    if (!client) {
      return NextResponse.json(
        { error: "Client record not found yet. Wait a moment and try again." },
        { status: 404 },
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

    try {
      await sendDomainRequestAdminEmail({
        businessName: client.business_name,
        clientEmail: client.owner_email,
        domain,
        pricePerYear: 0,
        plan: getPlanDisplayName(client.package),
      });
    } catch (emailError) {
      console.error("[checkout/domain] Admin domain email failed:", emailError);
    }

    return NextResponse.json({
      success: true,
      domain,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save domain.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

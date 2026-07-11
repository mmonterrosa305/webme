import { NextResponse } from "next/server";

import { getCheckoutOnboardingContext } from "@/lib/checkout/onboarding-context";
import { sendDomainConnectedEmail } from "@/lib/checkout/send-domain-connected-email";
import { getClientBySiteSlug } from "@/lib/clients/get-client-by-site-slug";
import { addRenderCustomDomain } from "@/lib/render/client";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { slug?: string };
    const slug = body.slug?.trim();

    if (!slug) {
      return NextResponse.json({ error: "slug is required." }, { status: 400 });
    }

    const [context, client] = await Promise.all([
      getCheckoutOnboardingContext(slug),
      getClientBySiteSlug(slug),
    ]);

    if (!context || !client) {
      return NextResponse.json(
        { error: "Client record not found yet. Wait a moment and try again." },
        { status: 404 },
      );
    }

    if (!client.domain_requested) {
      return NextResponse.json(
        { error: "Save a domain first before confirming DNS." },
        { status: 400 },
      );
    }

    const domain = client.domain_requested;

    const supabase = createAdminClient();
    const { error: updateError } = await supabase
      .from("clients")
      .update({
        domain_status: "active",
      })
      .eq("id", client.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    try {
      await addRenderCustomDomain(domain);
      console.log(
        `[checkout/domain/confirm] Registered custom domain on Render: ${domain}`,
      );
    } catch (renderError) {
      console.error(
        "[checkout/domain/confirm] Render custom-domain registration failed:",
        renderError,
      );
    }

    if (context.ownerEmail) {
      try {
        await sendDomainConnectedEmail({
          email: context.ownerEmail,
          businessName: context.businessName,
          domain,
          previewUrl: context.previewUrl,
          portalUrl: context.portalUrl,
        });
      } catch (emailError) {
        console.error(
          "[checkout/domain/confirm] Confirmation email failed:",
          emailError,
        );
      }
    }

    return NextResponse.json({
      success: true,
      domain,
      domainStatus: "active",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to confirm domain connection.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

import { isPortalEligiblePlan } from "@/lib/client-auth/constants";
import { getClientByEmail } from "@/lib/client-auth/get-client-by-email";
import { sendClientPortalMagicLink } from "@/lib/client-auth/send-magic-link";

export async function POST(request: Request) {
  console.log("[client/auth/magic-link] POST received");

  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";

    console.log("[client/auth/magic-link] Request email:", email || "(empty)");

    if (!email) {
      console.log("[client/auth/magic-link] Rejected: email is required");
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    console.log(
      "[client/auth/magic-link] Looking up client by owner_email in clients table…",
    );

    const client = await getClientByEmail(email);

    if (!client) {
      console.log(
        "[client/auth/magic-link] No client found for owner_email:",
        email.toLowerCase(),
      );
    } else {
      console.log("[client/auth/magic-link] Client found:", {
        id: client.id,
        businessName: client.business_name,
        ownerEmail: client.owner_email,
        package: client.package,
        eligible: isPortalEligiblePlan(client.package),
      });
    }

    if (client && isPortalEligiblePlan(client.package)) {
      console.log(
        "[client/auth/magic-link] Client is Pro/Elite — sending magic link via Resend…",
      );
      await sendClientPortalMagicLink(client.owner_email, client.business_name);
      console.log(
        "[client/auth/magic-link] Magic link email sent successfully to:",
        client.owner_email,
      );
    } else if (client) {
      console.log(
        "[client/auth/magic-link] Client found but plan is not portal-eligible:",
        client.package,
        "(requires starter or premium)",
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "If your email is registered on a Pro or Elite plan, we sent you a sign-in link.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send magic link.";

    console.error("[client/auth/magic-link] Error:", message);
    if (error instanceof Error && error.stack) {
      console.error("[client/auth/magic-link] Stack:", error.stack);
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

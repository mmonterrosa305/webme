import { NextResponse } from "next/server";

import { getCheckoutOnboardingContext } from "@/lib/checkout/onboarding-context";
import { sendCheckoutWelcomeEmail } from "@/lib/checkout/send-welcome-email";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { slug?: string };
    const slug = body.slug?.trim();

    if (!slug) {
      return NextResponse.json({ error: "slug is required." }, { status: 400 });
    }

    const context = await getCheckoutOnboardingContext(slug);

    if (!context) {
      return NextResponse.json({ error: "Site not found." }, { status: 404 });
    }

    if (!context.ownerEmail) {
      return NextResponse.json(
        { error: "No client email on file for this site." },
        { status: 400 },
      );
    }

    const baseUrl = (
      process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
      "https://webme-x6ed.onrender.com"
    ).replace(/\/$/, "");

    await sendCheckoutWelcomeEmail({
      email: context.ownerEmail,
      businessName: context.businessName,
      siteUrl: `${baseUrl}/site/${encodeURIComponent(slug)}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send welcome email.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

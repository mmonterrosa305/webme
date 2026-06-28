import { NextResponse } from "next/server";

import { getCheckoutOnboardingContext } from "@/lib/checkout/onboarding-context";

export async function GET(request: Request) {
  try {
    const slug = new URL(request.url).searchParams.get("slug")?.trim();

    if (!slug) {
      return NextResponse.json({ error: "slug is required." }, { status: 400 });
    }

    const context = await getCheckoutOnboardingContext(slug);

    if (!context) {
      return NextResponse.json({ error: "Site not found." }, { status: 404 });
    }

    return NextResponse.json(context);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load onboarding.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

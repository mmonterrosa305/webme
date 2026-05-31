import { NextResponse } from "next/server";

import { scrapeContactInfo } from "@/lib/agents/scrapeContactInfo";

/** Hardcoded real business for browser testing — A-1 Garage Door Service (Denver). */
const TEST_CASE = {
  businessName: "A-1 Garage Door Service",
  city: "Denver, CO",
  website: "https://www.a1garagedoorservice.com",
  phone: null as string | null,
};

export async function GET() {
  const hunterKey = process.env.HUNTER_API_KEY?.trim() ?? "";
  const hunterConfigured =
    hunterKey.length > 0 && !hunterKey.startsWith("your_");

  try {
    const result = await scrapeContactInfo(TEST_CASE);

    return NextResponse.json({
      ok: true,
      testCase: TEST_CASE,
      hunterConfigured,
      ownerEmail: result.ownerEmail,
      ownerName: result.ownerName,
      phone: result.phone,
      source: result.source,
      allEmails: result.emails,
      errors: result.errors,
      summary: result.ownerEmail
        ? `Found owner email via ${result.source}: ${result.ownerEmail}`
        : "No owner email found (website + Hunter + Custom Search all returned null)",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        testCase: TEST_CASE,
        hunterConfigured,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

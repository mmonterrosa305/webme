import { NextResponse } from "next/server";

import { searchBusinessByNameAndCity } from "@/lib/leads/search-business";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const businessName =
      typeof body.businessName === "string" ? body.businessName.trim() : "";
    const city = typeof body.city === "string" ? body.city.trim() : "";

    if (!businessName || !city) {
      return NextResponse.json(
        { error: "Business name and city are required." },
        { status: 400 },
      );
    }

    const result = await searchBusinessByNameAndCity({ businessName, city });

    if (!result) {
      return NextResponse.json(
        { error: "No business found for that name and city." },
        { status: 404 },
      );
    }

    return NextResponse.json({ business: result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to search for business.";

    console.error("[business-search]", message);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

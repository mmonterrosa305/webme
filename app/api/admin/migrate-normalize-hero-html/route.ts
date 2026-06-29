import { NextResponse } from "next/server";

import { migrateAllLeadHeroHtml } from "@/lib/leads/migrate-normalize-hero-html";

function isAuthorized(request: Request): boolean {
  const expected = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const header = request.headers.get("authorization")?.trim();

  if (!expected || !header) {
    return false;
  }

  return header === `Bearer ${expected}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await migrateAllLeadHeroHtml();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Hero HTML migration failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const siteSlug = searchParams.get("site_slug")?.trim() ?? "";

    if (!siteSlug) {
      return NextResponse.json(
        { error: "site_slug query parameter is required." },
        { status: 400 },
      );
    }

    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("site_analytics")
      .select("event_type")
      .eq("site_slug", siteSlug)
      .gte("created_at", thirtyDaysAgo);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let pageView = 0;
    let formSubmit = 0;

    for (const event of data ?? []) {
      if (event.event_type === "page_view") {
        pageView++;
      } else if (event.event_type === "form_submit") {
        formSubmit++;
      }
    }

    return NextResponse.json({
      site_slug: siteSlug,
      page_view: pageView,
      form_submit: formSubmit,
      period_days: 30,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load analytics.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

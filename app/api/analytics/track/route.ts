import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_EVENT_TYPES = new Set(["page_view", "form_submit"]);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const siteSlug =
      typeof body.site_slug === "string" ? body.site_slug.trim() : "";
    const eventType =
      typeof body.event_type === "string" ? body.event_type.trim() : "";

    if (!siteSlug) {
      return NextResponse.json(
        { error: "site_slug is required." },
        { status: 400 },
      );
    }

    if (!eventType || !ALLOWED_EVENT_TYPES.has(eventType)) {
      return NextResponse.json(
        { error: "Invalid event_type." },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const { error } = await supabase.from("site_analytics").insert({
      site_slug: siteSlug,
      event_type: eventType,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to track event.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

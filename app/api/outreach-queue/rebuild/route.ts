import { NextResponse } from "next/server";

import { rebuildLeadSite } from "@/lib/leads/rebuild-lead-site";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      id?: string;
      site_slug?: string;
      scrollHeroSequencePresetId?: string;
    };

    const queueId = typeof body.id === "string" ? body.id.trim() : "";
    let siteSlug =
      typeof body.site_slug === "string" ? body.site_slug.trim() : "";

    if (!siteSlug && queueId) {
      const supabase = createAdminClient();
      const { data: queueItem, error } = await supabase
        .from("outreach_queue")
        .select("site_slug")
        .eq("id", queueId)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      siteSlug =
        typeof queueItem?.site_slug === "string" ? queueItem.site_slug.trim() : "";
    }

    if (!siteSlug) {
      return NextResponse.json(
        { error: "A built site is required before rebuilding." },
        { status: 400 },
      );
    }

    const scrollHeroSequencePresetId =
      typeof body.scrollHeroSequencePresetId === "string"
        ? body.scrollHeroSequencePresetId.trim()
        : "";

    if (!scrollHeroSequencePresetId) {
      return NextResponse.json(
        { error: "An image sequence must be selected before rebuilding." },
        { status: 400 },
      );
    }

    const result = await rebuildLeadSite(siteSlug, {
      scrollHeroSequencePresetId,
    });

    return NextResponse.json({
      success: true,
      siteSlug: result.siteSlug,
      siteBuiltAt: result.siteBuiltAt,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to rebuild site.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

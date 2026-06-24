import { NextResponse } from "next/server";

import {
  hasScrollHeroVideo,
  replaceScrollHeroVideoUrl,
} from "@/lib/agents/scroll-hero-video";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVideoPresetById } from "@/lib/video-presets/queries";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const siteSlug =
      typeof body.siteSlug === "string" ? body.siteSlug.trim() : "";
    const presetId =
      typeof body.presetId === "string" ? body.presetId.trim() : "";
    const industry =
      typeof body.industry === "string" ? body.industry.trim() : "";

    if (!siteSlug || !presetId) {
      return NextResponse.json(
        { error: "siteSlug and presetId are required." },
        { status: 400 },
      );
    }

    const preset = await getVideoPresetById(presetId);
    if (!preset) {
      return NextResponse.json({ error: "Preset not found." }, { status: 404 });
    }

    if (industry && preset.industry !== industry) {
      return NextResponse.json(
        { error: "Preset does not match this site's industry." },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const { data: lead, error: fetchError } = await supabase
      .from("leads")
      .select("site_html, industry")
      .eq("site_slug", siteSlug)
      .maybeSingle();

    if (fetchError || !lead?.site_html) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    if (!hasScrollHeroVideo(lead.site_html)) {
      return NextResponse.json(
        { error: "This site does not have scroll animation enabled." },
        { status: 400 },
      );
    }

    const leadIndustry =
      typeof lead.industry === "string" ? lead.industry.trim() : "";
    if (leadIndustry && preset.industry !== leadIndustry) {
      return NextResponse.json(
        { error: "Preset does not match this site's industry." },
        { status: 400 },
      );
    }

    const updatedHtml = replaceScrollHeroVideoUrl(
      lead.site_html,
      preset.video_url,
    );

    if (!updatedHtml) {
      return NextResponse.json(
        { error: "No scroll hero video found in site HTML." },
        { status: 400 },
      );
    }

    const { error: updateError } = await supabase
      .from("leads")
      .update({ site_html: updatedHtml })
      .eq("site_slug", siteSlug);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      presetId: preset.id,
      videoUrl: preset.video_url,
      siteHtml: updatedHtml,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to apply preset video.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

import {
  hasScrollHeroSequence,
  replaceScrollHeroSequenceFrames,
} from "@/lib/agents/scroll-hero-sequence";
import { createAdminClient } from "@/lib/supabase/admin";
import { getImageSequenceById } from "@/lib/image-sequences/queries";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const siteSlug =
      typeof body.siteSlug === "string" ? body.siteSlug.trim() : "";
    const sequenceId =
      typeof body.sequenceId === "string" ? body.sequenceId.trim() : "";
    const industry =
      typeof body.industry === "string" ? body.industry.trim() : "";

    if (!siteSlug || !sequenceId) {
      return NextResponse.json(
        { error: "siteSlug and sequenceId are required." },
        { status: 400 },
      );
    }

    const sequence = await getImageSequenceById(sequenceId);
    if (!sequence) {
      return NextResponse.json(
        { error: "Image sequence not found." },
        { status: 404 },
      );
    }

    if (industry && sequence.industry !== industry) {
      return NextResponse.json(
        { error: "Sequence does not match this site's industry." },
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

    if (!hasScrollHeroSequence(lead.site_html)) {
      return NextResponse.json(
        { error: "This site does not use an image sequence scroll hero." },
        { status: 400 },
      );
    }

    const leadIndustry =
      typeof lead.industry === "string" ? lead.industry.trim() : "";
    if (leadIndustry && sequence.industry !== leadIndustry) {
      return NextResponse.json(
        { error: "Sequence does not match this site's industry." },
        { status: 400 },
      );
    }

    const updatedHtml = replaceScrollHeroSequenceFrames(
      lead.site_html,
      sequence.frames_urls,
    );

    if (!updatedHtml) {
      return NextResponse.json(
        { error: "No scroll hero sequence found in site HTML." },
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
      sequenceId: sequence.id,
      frameCount: sequence.frame_count,
      siteHtml: updatedHtml,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to apply image sequence.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

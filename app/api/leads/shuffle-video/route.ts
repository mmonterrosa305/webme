import { NextResponse } from "next/server";

import { fetchHeroVideo } from "@/lib/agents/fetch-pexels-video";
import { getIndustrySearchQueries } from "@/lib/agents/fetch-pixabay-photos";
import { createAdminClient } from "@/lib/supabase/admin";

function replaceHeroVideoUrl(html: string, newVideoUrl: string): string | null {
  const videoMatch = html.match(
    /<video[^>]*data-webme="hero-image"[^>]*>[\s\S]*?<\/video>/i,
  );

  if (!videoMatch) {
    return null;
  }

  const block = videoMatch[0];
  let updatedBlock = block.replace(
    /(<video[^>]*\ssrc=")[^"]+(")/i,
    `$1${newVideoUrl}$2`,
  );

  if (updatedBlock === block && /<video[^>]*data-webme="hero-image"[^>]*>/i.test(block)) {
    updatedBlock = block.replace(
      /(<video[^>]*data-webme="hero-image")/i,
      `$1 src="${newVideoUrl}"`,
    );
  }

  updatedBlock = updatedBlock.replace(
    /(<source[^>]*\ssrc=")[^"]+(")/gi,
    `$1${newVideoUrl}$2`,
  );

  return html.replace(block, updatedBlock);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const siteSlug =
      typeof body.siteSlug === "string" ? body.siteSlug.trim() : "";
    const industry =
      typeof body.industry === "string" ? body.industry.trim() : "";

    if (!siteSlug || !industry) {
      return NextResponse.json(
        { error: "siteSlug and industry are required." },
        { status: 400 },
      );
    }

    const queries = getIndustrySearchQueries(industry);
    const searchQuery =
      queries[Math.floor(Math.random() * queries.length)] ?? industry;
    const newVideoUrl = await fetchHeroVideo(searchQuery);

    if (!newVideoUrl) {
      return NextResponse.json(
        { error: "Could not fetch replacement video." },
        { status: 500 },
      );
    }

    const supabase = createAdminClient();
    const { data: lead, error: fetchError } = await supabase
      .from("leads")
      .select("site_html")
      .eq("site_slug", siteSlug)
      .maybeSingle();

    if (fetchError || !lead?.site_html) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    const updatedHtml = replaceHeroVideoUrl(lead.site_html, newVideoUrl);

    if (!updatedHtml) {
      return NextResponse.json(
        { error: "No hero video found in site HTML." },
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

    return NextResponse.json({ success: true, newVideoUrl });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to shuffle video.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

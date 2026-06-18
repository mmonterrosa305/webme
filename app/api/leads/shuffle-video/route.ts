import { NextResponse } from "next/server";

import { fetchScrollHeroVideoFromPexels } from "@/lib/agents/scroll-hero-video";
import { fetchHeroVideo } from "@/lib/agents/fetch-pexels-video";
import { getIndustrySearchQueries } from "@/lib/agents/fetch-pixabay-photos";
import { normalizeHeroVideoAttributes } from "@/lib/agents/normalize-hero-video";
import {
  hasScrollHeroVideo,
  replaceScrollHeroVideoUrl,
} from "@/lib/agents/scroll-hero-video";
import { createAdminClient } from "@/lib/supabase/admin";

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

    const supabase = createAdminClient();
    const { data: lead, error: fetchError } = await supabase
      .from("leads")
      .select("site_html")
      .eq("site_slug", siteSlug)
      .maybeSingle();

    if (fetchError || !lead?.site_html) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    const isScrollHero = hasScrollHeroVideo(lead.site_html);
    let newVideoUrl: string | null = null;

    if (isScrollHero) {
      newVideoUrl = await fetchScrollHeroVideoFromPexels(industry);
    } else {
      const queries = getIndustrySearchQueries(industry);
      const searchQuery =
        queries[Math.floor(Math.random() * queries.length)] ?? industry;
      newVideoUrl = await fetchHeroVideo(searchQuery);
    }

    if (!newVideoUrl) {
      return NextResponse.json(
        { error: "Could not fetch replacement video." },
        { status: 500 },
      );
    }

    const updatedHtml = replaceScrollHeroVideoUrl(lead.site_html, newVideoUrl);

    if (!updatedHtml) {
      return NextResponse.json(
        { error: "No hero video found in site HTML." },
        { status: 400 },
      );
    }

    const normalizedHtml = hasScrollHeroVideo(updatedHtml)
      ? updatedHtml
      : normalizeHeroVideoAttributes(updatedHtml);

    const { error: updateError } = await supabase
      .from("leads")
      .update({ site_html: normalizedHtml })
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

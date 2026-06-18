import { NextResponse } from "next/server";

import { normalizeHeroVideoAttributes } from "@/lib/agents/normalize-hero-video";
import {
  hasScrollHeroVideo,
  replaceScrollHeroVideoUrl,
} from "@/lib/agents/scroll-hero-video";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseUrl } from "@/lib/supabase/env";

const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const siteSlug =
      typeof formData.get("siteSlug") === "string"
        ? formData.get("siteSlug")!.toString().trim()
        : "";
    const file = formData.get("file");

    if (!siteSlug) {
      return NextResponse.json(
        { error: "siteSlug is required." },
        { status: 400 },
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Video file is required." },
        { status: 400 },
      );
    }

    if (!ALLOWED_VIDEO_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Only MP4, WebM, or MOV videos are supported." },
        { status: 400 },
      );
    }

    if (file.size > MAX_VIDEO_BYTES) {
      return NextResponse.json(
        { error: "Video must be 50 MB or smaller." },
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

    const extension = file.name.includes(".")
      ? file.name.slice(file.name.lastIndexOf("."))
      : file.type.includes("webm")
        ? ".webm"
        : ".mp4";
    const objectPath = `hero-videos/${siteSlug}/${Date.now()}-${sanitizeFilename(file.name || `upload${extension}`)}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("client-assets")
      .upload(objectPath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage
      .from("client-assets")
      .getPublicUrl(objectPath);

    let videoUrl = publicUrlData.publicUrl;
    const baseUrl = getSupabaseUrl();
    if (!videoUrl.startsWith("http")) {
      videoUrl = `${baseUrl}/storage/v1/object/public/client-assets/${objectPath}`;
    }

    const updatedHtml = replaceScrollHeroVideoUrl(lead.site_html, videoUrl);

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

    return NextResponse.json({
      success: true,
      videoUrl,
      siteHtml: normalizedHtml,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to upload hero video.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

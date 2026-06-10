import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchIndustryPhotos } from "@/lib/agents/fetch-pixabay-photos";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const siteSlug = typeof body.siteSlug === "string" ? body.siteSlug.trim() : "";
    const slot = typeof body.slot === "string" ? body.slot.trim() : "";
    const industry = typeof body.industry === "string" ? body.industry.trim() : "";

    if (!siteSlug || !slot || !industry) {
      return NextResponse.json({ error: "siteSlug, slot, and industry are required." }, { status: 400 });
    }

    // Get a fresh set of photos
    const photos = await fetchIndustryPhotos(industry);
    if (!photos) {
      return NextResponse.json({ error: "Could not fetch replacement photo." }, { status: 500 });
    }

    // Pick the photo for the requested slot
    const slotMap: Record<string, string> = {
      "hero-image": photos.hero,
      "about-image": photos.about,
      "service-image-1": photos.service1,
      "service-image-2": photos.service2,
      "service-image-3": photos.service3,
      "service-image-4": photos.service4,
      "gallery-image-1": photos.gallery1,
      "gallery-image-2": photos.gallery2,
      "gallery-image-3": photos.gallery3,
    };

    const newPhotoUrl = slotMap[slot];
    if (!newPhotoUrl) {
      return NextResponse.json({ error: "Invalid slot." }, { status: 400 });
    }

    // Update the site HTML
    const supabase = createAdminClient();
    const { data: lead, error: fetchError } = await supabase
      .from("leads")
      .select("site_html")
      .eq("site_slug", siteSlug)
      .maybeSingle();

    if (fetchError || !lead?.site_html) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    // Replace the photo URL in the HTML for the given slot
    const parser = /data-webme="([^"]+)"[^>]*(?:src="([^"]+)"|style="[^"]*url\(([^)]+)\)[^"]*")/g;
    let updatedHtml = lead.site_html;
    
    // Replace src or background-image URL for the matching slot
    updatedHtml = updatedHtml.replace(
      new RegExp(`(data-webme="${slot}"[^>]*(?:src="))[^"]+(")`,"g"),
      `$1${newPhotoUrl}$2`
    );
    updatedHtml = updatedHtml.replace(
      new RegExp(`(data-webme="${slot}"[^>]*style="[^"]*url\\()[^)]+(\\.)[^)]*?(\\)[^"]*")`,"g"),
      `$1${newPhotoUrl}$3`
    );

    const { error: updateError } = await supabase
      .from("leads")
      .update({ site_html: updatedHtml })
      .eq("site_slug", siteSlug);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, newPhotoUrl, slot });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to shuffle photo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

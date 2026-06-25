import { NextResponse } from "next/server";

import { buildSite } from "@/lib/agents/buildSite";
import {
  importedSiteToBusinessProfile,
  scrapeImportSite,
  validateImportedSiteData,
} from "@/lib/agents/scrape-import-site";
import { uploadLogo } from "@/lib/agents/upload-logo";
import { resolveScrollHeroAssetsForBuild } from "@/lib/scroll-hero/resolve-for-build";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_SECTIONS,
} from "@/lib/agents/site-options";
import {
  contentToMetadata,
  extractSiteContent,
} from "@/lib/site-editor/extract-content";

const SUPPORTED_LOGO_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

async function persistImportedLogo(
  logoUrl: string,
  businessName: string,
): Promise<string | null> {
  try {
    const response = await fetch(logoUrl);
    if (!response.ok) {
      return null;
    }

    const mediaType = response.headers.get("content-type")?.split(";")[0];
    if (!mediaType || !SUPPORTED_LOGO_TYPES.has(mediaType)) {
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength === 0 || buffer.byteLength > 5 * 1024 * 1024) {
      return null;
    }

    return uploadLogo(buffer.toString("base64"), mediaType, businessName);
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let url = "";
    let scrollAnimationEffect = false;
    let cardHoverEffect = false;
    let scrollHeroPresetId: string | null = null;
    let scrollHeroSequencePresetId: string | null = null;
    let scrollHeroMediaType: "video" | "image-sequence" = "video";
    let pendingFormData: FormData | null = null;

    if (contentType.includes("multipart/form-data")) {
      pendingFormData = await request.formData();
      url =
        typeof pendingFormData.get("url") === "string"
          ? pendingFormData.get("url")!.toString().trim()
          : "";
      scrollAnimationEffect =
        pendingFormData.get("scrollAnimationEffect") === "true";
      cardHoverEffect = pendingFormData.get("cardHoverEffect") === "true";
      const presetRaw = pendingFormData.get("scrollHeroPresetId");
      scrollHeroPresetId =
        typeof presetRaw === "string" && presetRaw.trim()
          ? presetRaw.trim()
          : null;
      const sequenceRaw = pendingFormData.get("scrollHeroSequencePresetId");
      scrollHeroSequencePresetId =
        typeof sequenceRaw === "string" && sequenceRaw.trim()
          ? sequenceRaw.trim()
          : null;
      scrollHeroMediaType =
        pendingFormData.get("scrollHeroMediaType") === "image-sequence"
          ? "image-sequence"
          : "video";
    } else {
      const body = await request.json();
      url = typeof body.url === "string" ? body.url.trim() : "";
      scrollAnimationEffect = body.scrollAnimationEffect === true;
      cardHoverEffect = body.cardHoverEffect === true;
      scrollHeroPresetId =
        typeof body.scrollHeroPresetId === "string"
          ? body.scrollHeroPresetId.trim()
          : null;
      scrollHeroSequencePresetId =
        typeof body.scrollHeroSequencePresetId === "string"
          ? body.scrollHeroSequencePresetId.trim()
          : null;
      scrollHeroMediaType =
        body.scrollHeroMediaType === "image-sequence"
          ? "image-sequence"
          : "video";
    }

    if (!url) {
      return NextResponse.json({ error: "URL is required." }, { status: 400 });
    }

    const imported = await scrapeImportSite(url);
    const validation = validateImportedSiteData(imported);

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 422 });
    }

    const businessProfile = importedSiteToBusinessProfile(imported);
    const tagline = imported.headline ?? imported.tagline ?? undefined;

    let logoUrl: string | undefined;
    if (imported.logoUrl) {
      const storedLogoUrl = await persistImportedLogo(
        imported.logoUrl,
        imported.businessName,
      );
      logoUrl = storedLogoUrl ?? imported.logoUrl;
    }

    let scrollHeroVideoUrl: string | null = null;
    let scrollHeroSequenceFrames: string[] | null = null;
    if (scrollAnimationEffect) {
      const scrollHeroAssets = await resolveScrollHeroAssetsForBuild({
        formData: pendingFormData,
        businessName: imported.businessName,
        scrollHeroMediaType,
        videoPresetId: scrollHeroPresetId,
        sequencePresetId: scrollHeroSequencePresetId,
      });
      scrollHeroMediaType = scrollHeroAssets.mediaType;
      scrollHeroVideoUrl = scrollHeroAssets.videoUrl;
      scrollHeroSequenceFrames = scrollHeroAssets.sequenceFrames;
    }

    const { html, siteSlug } = await buildSite({
      city: imported.city,
      industry: imported.industry,
      tagline,
      paletteId: "midnight",
      styleId: "modern-minimal",
      sections: DEFAULT_SECTIONS,
      createLogoForMe: !logoUrl,
      businessProfile,
      logoUrl,
      scrollAnimationEffect,
      scrollHeroMediaType,
      scrollHeroVideoUrl,
      scrollHeroSequenceFrames,
      cardHoverEffect,
    });

    const siteBuiltAt = new Date().toISOString();
    const supabase = createAdminClient();
    const siteContent = extractSiteContent(html, {
      businessName: imported.businessName,
      phone: imported.phone ?? "",
      address: imported.address ?? "",
    });

    const leadRow = {
      business_name: imported.businessName,
      city: imported.city,
      industry: imported.industry,
      address: imported.address,
      phone: imported.phone,
      has_website: true,
      existing_website_url: imported.sourceUrl,
      owner_email: null,
      owner_name: null,
      site_html: html,
      site_slug: siteSlug,
      site_built_at: siteBuiltAt,
      status: "pending_review",
      site_version: "A",
      site_metadata: contentToMetadata(siteContent),
      preview_edits_used: 0,
    };

    const { error: deleteError } = await supabase
      .from("leads")
      .delete()
      .eq("business_name", imported.businessName)
      .eq("city", imported.city);

    if (deleteError) {
      console.error("[import-site] Failed to delete old leads:", deleteError.message);
    }

    const { error: leadSaveError } = await supabase.from("leads").upsert(
      leadRow,
      { onConflict: "site_slug" },
    );

    if (leadSaveError) {
      const {
        site_metadata: _siteMetadata,
        preview_edits_used: _previewEditsUsed,
        ...fallbackRow
      } = leadRow;

      const { error: fallbackError } = await supabase.from("leads").upsert(
        fallbackRow,
        { onConflict: "site_slug" },
      );

      if (fallbackError) {
        console.error("[import-site] Failed to save lead:", fallbackError.message);
        return NextResponse.json(
          { error: "Site was generated but could not be saved. Please try again." },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      siteSlug,
      businessName: imported.businessName,
      city: imported.city,
      industry: imported.industry,
      extracted: {
        businessName: imported.businessName,
        phone: imported.phone,
        headline: imported.headline,
        tagline: imported.tagline,
        services: imported.services,
        address: imported.address,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to import and build site.";

    console.error("[import-site]", message);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

import { buildSite } from "@/lib/agents/buildSite";
import {
  importedSiteToBusinessProfile,
  scrapeImportSite,
  validateImportedSiteData,
} from "@/lib/agents/scrape-import-site";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_SECTIONS,
} from "@/lib/agents/site-options";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const url = typeof body.url === "string" ? body.url.trim() : "";

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

    const { html, siteSlug } = await buildSite({
      city: imported.city,
      industry: imported.industry,
      tagline,
      paletteId: "midnight",
      styleId: "modern-minimal",
      sections: DEFAULT_SECTIONS,
      createLogoForMe: true,
      businessProfile,
    });

    const siteBuiltAt = new Date().toISOString();
    const supabase = createAdminClient();

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
      console.error("[import-site] Failed to save lead:", leadSaveError.message);
      return NextResponse.json(
        { error: "Site was generated but could not be saved. Please try again." },
        { status: 500 },
      );
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

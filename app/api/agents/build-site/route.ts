import { NextResponse } from "next/server";

import { buildSite, type BuildSiteInput } from "@/lib/agents/buildSite";
import { createAdminClient } from "@/lib/supabase/admin";
import { scrapeBusinessData } from "@/lib/agents/scrapeBusinessData";
import {
  COLOR_PALETTES,
  DESIGN_STYLES,
  SITE_SECTIONS,
  type PaletteId,
  type SectionId,
  type StyleId,
} from "@/lib/agents/site-options";

const VALID_MEDIA_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isPaletteId(value: string): value is PaletteId {
  return COLOR_PALETTES.some((palette) => palette.id === value);
}

function isStyleId(value: string): value is StyleId {
  return DESIGN_STYLES.some((style) => style.id === value);
}

function parseSections(value: unknown): SectionId[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const validIds = new Set<string>(SITE_SECTIONS.map((section) => section.id));
  const sections: SectionId[] = [];

  for (const item of value) {
    if (typeof item !== "string" || !validIds.has(item)) {
      return null;
    }

    sections.push(item as SectionId);
  }

  return sections.length > 0 ? sections : null;
}

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    const now = Date.now();
    let entry = rateLimitMap.get(ip);
    if (!entry) {
      entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
      rateLimitMap.set(ip, entry);
    } else if (entry.resetAt <= now) {
      entry.count = 0;
      entry.resetAt = now + RATE_LIMIT_WINDOW_MS;
    }

    if (entry.count >= RATE_LIMIT_MAX) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    entry.count++;

    const body = await request.json();

    const cfTurnstileToken =
      typeof body.cfTurnstileToken === "string"
        ? body.cfTurnstileToken.trim()
        : "";

    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY?.trim();
    if (
      turnstileSecret &&
      cfTurnstileToken &&
      cfTurnstileToken !== "localhost-bypass"
    ) {
      const verifyResponse = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            secret: turnstileSecret,
            response: cfTurnstileToken,
          }),
        },
      );
      const verifyData = (await verifyResponse.json()) as { success: boolean };
      if (!verifyData.success) {
        return NextResponse.json(
          { error: "CAPTCHA verification failed. Please try again." },
          { status: 400 },
        );
      }
    }

    const businessName =
      typeof body.businessName === "string" ? body.businessName.trim() : "";
    const city = typeof body.city === "string" ? body.city.trim() : "";
    const industry =
      typeof body.industry === "string" ? body.industry.trim() : "";
    const tagline =
      typeof body.tagline === "string" ? body.tagline.trim() : undefined;
    const paletteId =
      typeof body.paletteId === "string" ? body.paletteId : "";
    const styleId = typeof body.styleId === "string" ? body.styleId : "";
    const sections = parseSections(body.sections);
    const createLogoForMe = body.createLogoForMe === true;
    const logoBase64 =
      typeof body.logoBase64 === "string" ? body.logoBase64 : undefined;
    const logoMediaType =
      typeof body.logoMediaType === "string" ? body.logoMediaType : undefined;
    const logoSvg =
      typeof body.logoSvg === "string" ? body.logoSvg.trim() : undefined;

    const address =
      typeof body.address === "string" ? body.address.trim() : undefined;
    const existingWebsiteUrl =
      typeof body.existingWebsiteUrl === "string"
        ? body.existingWebsiteUrl.trim()
        : undefined;
    const hasWebsite =
      typeof body.hasWebsite === "boolean" ? body.hasWebsite : undefined;

    if (!businessName || !city || !industry) {
      return NextResponse.json(
        { error: "businessName, city, and industry are required." },
        { status: 400 },
      );
    }

    if (!isPaletteId(paletteId)) {
      return NextResponse.json({ error: "Invalid paletteId." }, { status: 400 });
    }

    if (!isStyleId(styleId)) {
      return NextResponse.json({ error: "Invalid styleId." }, { status: 400 });
    }

    if (!sections) {
      return NextResponse.json(
        { error: "At least one valid section is required." },
        { status: 400 },
      );
    }

    if (logoMediaType && !VALID_MEDIA_TYPES.has(logoMediaType)) {
      return NextResponse.json(
        { error: "Invalid logo media type." },
        { status: 400 },
      );
    }

    const businessProfile = await scrapeBusinessData({ businessName, city });

    const buildInput: BuildSiteInput = {
      city,
      industry,
      tagline,
      paletteId,
      styleId,
      sections,
      createLogoForMe,
      businessProfile,
      logoBase64,
      logoMediaType: logoMediaType as BuildSiteInput["logoMediaType"],
      logoSvg,
    };

    const { html, siteSlug } = await buildSite(buildInput);

    const siteBuiltAt = new Date().toISOString();

    const supabase = createAdminClient();
    const leadRow = {
      business_name: businessName,
      city,
      industry,
      address: address ?? businessProfile.address,
      phone: businessProfile.phone,
      has_website: hasWebsite ?? Boolean(businessProfile.website),
      existing_website_url:
        existingWebsiteUrl ?? businessProfile.website,
      owner_email: businessProfile.ownerEmail,
      owner_name: businessProfile.ownerName,
      site_html: html,
      site_slug: siteSlug,
      site_built_at: siteBuiltAt,
      status: "pending_review",
      site_version: "A",
    };

    const { error: deleteError } = await supabase
      .from("leads")
      .delete()
      .eq("business_name", businessName)
      .eq("city", city);

    if (deleteError) {
      console.error("[build-site] Failed to delete old leads:", deleteError.message);
    }

    const { error: leadSaveError } = await supabase.from("leads").upsert(
      leadRow,
      { onConflict: "site_slug" },
    );

    if (leadSaveError) {
      console.error(
        "[build-site] Failed to save lead in Supabase:",
        leadSaveError.message,
      );
    } else {
      console.log("[build-site] Saved lead to Supabase:", {
        businessName,
        city,
        siteSlug,
        ownerEmail: businessProfile.ownerEmail,
        ownerName: businessProfile.ownerName,
      });
    }

    return NextResponse.json({
      html,
      businessProfile,
      siteSlug,
      siteBuiltAt,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to build site.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

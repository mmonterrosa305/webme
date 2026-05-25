import { NextResponse } from "next/server";

import { buildSite, type BuildSiteInput } from "@/lib/agents/buildSite";
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
    const body = await request.json();

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

    const html = await buildSite({
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
    });

    return NextResponse.json({ html, businessProfile });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to build site.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

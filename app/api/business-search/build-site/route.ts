import { NextResponse } from "next/server";

import { buildBusinessSearchSite } from "@/lib/leads/build-business-search-site";
import type { BusinessSearchResult } from "@/lib/leads/business-search-types";
import { resolveScrollHeroVideoForBuild } from "@/lib/video-presets/resolve-scroll-hero-video";

function isBusinessSearchResult(value: unknown): value is BusinessSearchResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as BusinessSearchResult;

  return (
    typeof candidate.placeId === "string" &&
    typeof candidate.businessName === "string" &&
    typeof candidate.city === "string" &&
    typeof candidate.industry === "string"
  );
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let business: BusinessSearchResult;
    let scrollAnimationEffect = false;
    let cardHoverEffect = false;
    let scrollHeroPresetId: string | null = null;
    let pendingFormData: FormData | null = null;

    if (contentType.includes("multipart/form-data")) {
      pendingFormData = await request.formData();
      const businessRaw = pendingFormData.get("business");

      if (typeof businessRaw !== "string") {
        return NextResponse.json(
          { error: "Valid business search result is required." },
          { status: 400 },
        );
      }

      business = JSON.parse(businessRaw) as BusinessSearchResult;
      scrollAnimationEffect = pendingFormData.get("scrollAnimationEffect") === "true";
      cardHoverEffect = pendingFormData.get("cardHoverEffect") === "true";
      const presetRaw = pendingFormData.get("scrollHeroPresetId");
      scrollHeroPresetId =
        typeof presetRaw === "string" && presetRaw.trim()
          ? presetRaw.trim()
          : null;
    } else {
      const body = await request.json();
      business = body.business as BusinessSearchResult;
      scrollAnimationEffect = body.scrollAnimationEffect === true;
      cardHoverEffect = body.cardHoverEffect === true;
      scrollHeroPresetId =
        typeof body.scrollHeroPresetId === "string"
          ? body.scrollHeroPresetId.trim()
          : null;
    }

    if (!isBusinessSearchResult(business)) {
      return NextResponse.json(
        { error: "Valid business search result is required." },
        { status: 400 },
      );
    }

    let scrollHeroVideoUrl: string | null = null;
    if (scrollAnimationEffect) {
      scrollHeroVideoUrl = await resolveScrollHeroVideoForBuild({
        formData: pendingFormData,
        businessName: business.businessName,
        presetId: scrollHeroPresetId,
      });
    }

    const result = await buildBusinessSearchSite(business, {
      scrollAnimationEffect,
      scrollHeroVideoUrl,
      cardHoverEffect,
    });

    return NextResponse.json({
      success: true,
      siteSlug: result.siteSlug,
      businessName: result.businessName,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to build site.";

    console.error("[business-search/build-site]", message);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

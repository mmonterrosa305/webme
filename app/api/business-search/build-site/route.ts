import { NextResponse } from "next/server";

import { buildBusinessSearchSite } from "@/lib/leads/build-business-search-site";
import type { BusinessSearchResult } from "@/lib/leads/business-search-types";
import { resolveScrollHeroAssetsForBuild } from "@/lib/scroll-hero/resolve-for-build";

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
    let scrollHeroSequencePresetId: string | null = null;
    let scrollHeroMediaType: "video" | "image-sequence" = "video";
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
      business = body.business as BusinessSearchResult;
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

    if (!isBusinessSearchResult(business)) {
      return NextResponse.json(
        { error: "Valid business search result is required." },
        { status: 400 },
      );
    }

    let scrollHeroVideoUrl: string | null = null;
    let scrollHeroSequenceFrames: string[] | null = null;
    if (scrollAnimationEffect) {
      const scrollHeroAssets = await resolveScrollHeroAssetsForBuild({
        formData: pendingFormData,
        businessName: business.businessName,
        scrollHeroMediaType,
        videoPresetId: scrollHeroPresetId,
        sequencePresetId: scrollHeroSequencePresetId,
      });
      scrollHeroMediaType = scrollHeroAssets.mediaType;
      scrollHeroVideoUrl = scrollHeroAssets.videoUrl;
      scrollHeroSequenceFrames = scrollHeroAssets.sequenceFrames;
    }

    const result = await buildBusinessSearchSite(business, {
      scrollAnimationEffect,
      scrollHeroMediaType,
      scrollHeroVideoUrl,
      scrollHeroSequenceFrames,
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

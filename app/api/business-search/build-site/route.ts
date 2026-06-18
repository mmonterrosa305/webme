import { NextResponse } from "next/server";

import { buildBusinessSearchSite } from "@/lib/leads/build-business-search-site";
import type { BusinessSearchResult } from "@/lib/leads/business-search-types";
import { resolveScrollHeroVideoUrlFromFormData } from "@/lib/agents/upload-scroll-hero-video";

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
    let scrollHeroVideoUrl: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const businessRaw = formData.get("business");

      if (typeof businessRaw !== "string") {
        return NextResponse.json(
          { error: "Valid business search result is required." },
          { status: 400 },
        );
      }

      business = JSON.parse(businessRaw) as BusinessSearchResult;
      scrollAnimationEffect = formData.get("scrollAnimationEffect") === "true";

      if (scrollAnimationEffect) {
        scrollHeroVideoUrl = await resolveScrollHeroVideoUrlFromFormData(
          formData,
          business.businessName,
        );
      }
    } else {
      const body = await request.json();
      business = body.business as BusinessSearchResult;
      scrollAnimationEffect = body.scrollAnimationEffect === true;
    }

    if (!isBusinessSearchResult(business)) {
      return NextResponse.json(
        { error: "Valid business search result is required." },
        { status: 400 },
      );
    }

    const result = await buildBusinessSearchSite(business, {
      scrollAnimationEffect,
      scrollHeroVideoUrl,
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

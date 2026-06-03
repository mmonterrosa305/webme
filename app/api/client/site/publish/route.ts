import { NextResponse } from "next/server";

import {
  ClientAuthError,
  requirePortalClient,
} from "@/lib/client-auth/require-portal-client";
import { applySiteContent } from "@/lib/site-editor/apply-content";
import { contentToMetadata } from "@/lib/site-editor/extract-content";
import {
  getClientSiteData,
  publishClientSite,
} from "@/lib/site-editor/get-client-site";
import type { SiteContent } from "@/lib/site-editor/types";

function isSiteContent(value: unknown): value is SiteContent {
  if (!value || typeof value !== "object") {
    return false;
  }

  const content = value as SiteContent;

  return (
    typeof content.businessName === "string" &&
    typeof content.phone === "string" &&
    typeof content.address === "string" &&
    typeof content.hours === "string" &&
    typeof content.headline === "string" &&
    typeof content.tagline === "string" &&
    typeof content.logoUrl === "string" &&
    typeof content.images === "object" &&
    content.images !== null
  );
}

export async function POST(request: Request) {
  try {
    const { client } = await requirePortalClient();
    const existing = await getClientSiteData(client);

    if (!existing) {
      return NextResponse.json(
        { error: "Your website is not ready yet." },
        { status: 404 },
      );
    }

    const body = await request.json();
    const nextContent = body.content;

    if (!isSiteContent(nextContent)) {
      return NextResponse.json(
        { error: "Invalid site content payload." },
        { status: 400 },
      );
    }

    const updatedHtml = applySiteContent(
      existing.siteHtml,
      existing.content,
      nextContent,
    );

    const metadata = contentToMetadata(nextContent);
    const { siteSlug } = await publishClientSite(
      client,
      updatedHtml,
      nextContent,
      metadata,
    );

    return NextResponse.json({
      success: true,
      siteSlug,
      previewUrl: `/preview/${siteSlug}`,
      message: "Your site is live.",
    });
  } catch (error) {
    if (error instanceof ClientAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message =
      error instanceof Error ? error.message : "Failed to publish site.";

    console.error("[client/site/publish POST]", message);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

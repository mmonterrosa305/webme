import { NextResponse } from "next/server";

import {
  ClientAuthError,
  requirePortalClient,
} from "@/lib/client-auth/require-portal-client";
import { applySiteContent } from "@/lib/site-editor/apply-content";
import { getClientSiteData } from "@/lib/site-editor/get-client-site";
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

    const htmlBefore = existing.siteHtml;
    const hasOriginalName = /mc pool service/i.test(htmlBefore);

    console.log("[client/site/preview POST] content received", {
      previousBusinessName: existing.content.businessName,
      nextBusinessName: nextContent.businessName,
      previousHeadline: existing.content.headline,
      nextHeadline: nextContent.headline,
      previousPhone: existing.content.phone,
      nextPhone: nextContent.phone,
      previousAddress: existing.content.address,
      nextAddress: nextContent.address,
      htmlContainsOriginalBusinessName: hasOriginalName,
      htmlSnippetBefore: htmlBefore.match(/logo-text[^>]*>[^<]+/i)?.[0] ?? null,
    });

    const previewHtml = applySiteContent(
      existing.siteHtml,
      existing.content,
      nextContent,
    );

    console.log("[client/site/preview POST] preview html result", {
      htmlContainsOriginalBusinessName: /mc pool service/i.test(previewHtml),
      htmlContainsNextBusinessName: previewHtml.includes(nextContent.businessName),
      htmlSnippetAfter:
        previewHtml.match(/logo-text[^>]*>[^<]+/gi)?.slice(0, 3) ?? null,
      titleAfter: previewHtml.match(/<title>([^<]+)<\/title>/i)?.[1] ?? null,
    });

    return NextResponse.json({ html: previewHtml });
  } catch (error) {
    if (error instanceof ClientAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message =
      error instanceof Error ? error.message : "Failed to build preview.";

    console.error("[client/site/preview POST]", message);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

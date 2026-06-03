import { NextResponse } from "next/server";

import {
  ClientAuthError,
  requirePortalClient,
} from "@/lib/client-auth/require-portal-client";
import { getClientSiteData } from "@/lib/site-editor/get-client-site";

export async function GET() {
  try {
    const { client } = await requirePortalClient();
    const siteData = await getClientSiteData(client);

    if (!siteData) {
      return NextResponse.json(
        { error: "Your website is not ready yet. Contact support@mywebme.com." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      siteSlug: siteData.siteSlug,
      siteHtml: siteData.siteHtml,
      content: siteData.content,
      plan: siteData.plan,
      subscriptionStatus: siteData.subscriptionStatus,
      previewUrl: `/preview/${siteData.siteSlug}`,
    });
  } catch (error) {
    if (error instanceof ClientAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message =
      error instanceof Error ? error.message : "Failed to load site data.";

    console.error("[client/site GET]", message);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

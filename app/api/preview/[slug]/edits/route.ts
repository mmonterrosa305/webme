import { NextResponse } from "next/server";

import {
  PREVIEW_FREE_EDITS,
} from "@/lib/plans/edit-limits";
import { prepareAndPersistLeadSiteHtml } from "@/lib/agents/prepare-lead-site-html";
import {
  applyPreviewEdit,
  extractPreviewFields,
  getLeadForPreviewEdit,
} from "@/lib/preview/preview-edits";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const lead = await getLeadForPreviewEdit(slug);

    if (!lead) {
      return NextResponse.json({ error: "Preview not found." }, { status: 404 });
    }

    const remaining = Math.max(
      0,
      PREVIEW_FREE_EDITS - (lead.preview_edits_used ?? 0),
    );

    return NextResponse.json({
      fields: extractPreviewFields(lead),
      editsUsed: lead.preview_edits_used ?? 0,
      editsLimit: PREVIEW_FREE_EDITS,
      editsRemaining: remaining,
      siteHtml: await prepareAndPersistLeadSiteHtml(
        slug,
        lead.site_html,
        lead.site_metadata,
        null,
      ),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load preview edits.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const lead = await getLeadForPreviewEdit(slug);

    if (!lead) {
      return NextResponse.json({ error: "Preview not found." }, { status: 404 });
    }

    if ((lead.preview_edits_used ?? 0) >= PREVIEW_FREE_EDITS) {
      return NextResponse.json(
        { error: "You have used all free preview edits." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as {
      businessName?: string;
      phone?: string;
      headline?: string;
      tagline?: string;
    };

    const businessName = body.businessName?.trim() ?? "";
    const phone = body.phone?.trim() ?? "";
    const headline = body.headline?.trim() ?? "";
    const tagline = body.tagline?.trim() ?? "";

    if (!businessName) {
      return NextResponse.json(
        { error: "Business name is required." },
        { status: 400 },
      );
    }

    const existingFields = extractPreviewFields(lead);

    const { applyPreviewEdit } = await import("@/lib/preview/preview-edits");
    const result = await applyPreviewEdit(lead, {
      businessName,
      phone,
      headline,
      tagline,
      logoUrl: existingFields.logoUrl,
    });

    const editsUsed = (lead.preview_edits_used ?? 0) + 1;
    const editsRemaining = Math.max(0, PREVIEW_FREE_EDITS - editsUsed);

    return NextResponse.json({
      html: await prepareAndPersistLeadSiteHtml(
        slug,
        result.html,
        lead.site_metadata,
        null,
      ),
      fields: result.fields,
      editsUsed,
      editsLimit: PREVIEW_FREE_EDITS,
      editsRemaining,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save preview edit.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

import { scrapeContactInfo } from "@/lib/agents/scrapeContactInfo";
import type { SavedLead } from "@/lib/leads/types";
import { getOutreachPreviewBaseUrl } from "@/lib/outreach/build-cold-email";
import { sendOutreachEmail } from "@/lib/outreach/send-outreach-email";
import { createAdminClient } from "@/lib/supabase/admin";

type LeadForOutreach = {
  id: string;
  business_name: string;
  city: string;
  owner_name: string | null;
  owner_email: string | null;
  existing_website_url: string | null;
  phone: string | null;
  site_slug: string | null;
  status: string | null;
};

const LEAD_SELECT =
  "id, business_name, city, owner_name, owner_email, existing_website_url, phone, site_slug, status";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const leadId = typeof body.leadId === "string" ? body.leadId.trim() : "";

    if (!leadId) {
      return NextResponse.json({ error: "leadId is required." }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: lead, error: fetchError } = await supabase
      .from("leads")
      .select(LEAD_SELECT)
      .eq("id", leadId)
      .maybeSingle();

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    if (!lead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    const typedLead = lead as LeadForOutreach;

    if (typedLead.status !== "approved") {
      return NextResponse.json(
        { error: "Only approved leads can receive outreach." },
        { status: 400 },
      );
    }

    if (!typedLead.site_slug) {
      return NextResponse.json(
        { error: "This lead does not have a built site yet." },
        { status: 400 },
      );
    }

    const website = typedLead.existing_website_url?.trim() || null;

    const scraped = await scrapeContactInfo({
      businessName: typedLead.business_name,
      city: typedLead.city,
      website,
      phone: typedLead.phone,
    });

    const ownerEmail =
      scraped.ownerEmail?.trim() || typedLead.owner_email?.trim() || null;
    const ownerName =
      scraped.ownerName?.trim() || typedLead.owner_name?.trim() || null;

    if (!ownerEmail) {
      return NextResponse.json(
        { error: "No email found for this business" },
        { status: 400 },
      );
    }

    if (
      ownerEmail !== typedLead.owner_email?.trim() ||
      ownerName !== typedLead.owner_name?.trim()
    ) {
      const { error: emailSaveError } = await supabase
        .from("leads")
        .update({
          owner_email: ownerEmail,
          ...(ownerName ? { owner_name: ownerName } : {}),
        })
        .eq("id", leadId);

      if (emailSaveError) {
        console.error(
          "[outreach/send] Failed to save scraped email to lead:",
          emailSaveError.message,
        );
      }
    }

    const previewUrl = `${getOutreachPreviewBaseUrl()}/${typedLead.site_slug}`;

    const { resendMessageId } = await sendOutreachEmail({
      businessName: typedLead.business_name,
      ownerEmail,
      ownerName,
      siteSlug: typedLead.site_slug,
      leadId,
    });

    const sentAt = new Date().toISOString();

    const { data: updatedLead, error: leadUpdateError } = await supabase
      .from("leads")
      .update({
        status: "outreach_sent",
        outreach_sent_at: sentAt,
        owner_email: ownerEmail,
        ...(ownerName ? { owner_name: ownerName } : {}),
      })
      .eq("id", leadId)
      .select("id, business_name, city, industry, status, site_slug")
      .maybeSingle();

    if (leadUpdateError) {
      throw new Error(leadUpdateError.message);
    }

    return NextResponse.json({
      success: true,
      previewUrl,
      ownerEmail,
      emailSource: scraped.source,
      resendMessageId,
      lead: updatedLead as SavedLead,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send outreach email.";

    console.error("[outreach/send]", message);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
